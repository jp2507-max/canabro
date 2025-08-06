/**
 * Environmental Data Integration Service
 * 
 * Connects calendar with plant metrics and environmental conditions to create
 * dynamic schedule adjustments, weather-based task modifications, and automated
 * scheduling based on sensor data and environmental trends.
 * 
 * Task 6.2 Implementation:
 * - Connect calendar with plant metrics and conditions
 * - Create dynamic schedule adjustments based on environment
 * - Implement weather-based task modifications
 * - Add sensor data integration for automated scheduling
 * - Build environmental trend analysis for planning
 */

import { Q } from '@nozbe/watermelondb';
import { addDays, subDays, format } from '../utils/date';
import { log } from '../utils/logger';

import { Plant } from '../models/Plant';
import { PlantTask, EnvironmentalConditions } from '../models/PlantTask';
import { PlantMetrics } from '../models/PlantMetrics';
import { TaskAutomationService } from './TaskAutomationService';
import { GrowthStageTaskPrioritization } from './GrowthStageTaskPrioritization';
import { TaskType } from '../types/taskTypes';
import { GrowthStage } from '../types/plant';
import { database } from '../models';

export interface EnvironmentalTrend {
  metric: 'temperature' | 'humidity' | 'ph' | 'vpd' | 'ec';
  values: Array<{ date: Date; value: number }>;
  trend: 'increasing' | 'decreasing' | 'stable';
  changeRate: number; // units per day
  prediction: number; // predicted value in 3 days
  isOptimal: boolean;
  recommendations: string[];
}

export interface WeatherConditions {
  temperature: number;
  humidity: number;
  pressure?: number;
  windSpeed?: number;
  precipitation?: number;
  uvIndex?: number;
  conditions: 'sunny' | 'cloudy' | 'rainy' | 'stormy' | 'unknown';
}

export interface SensorReading {
  sensorId: string;
  plantId: string;
  timestamp: Date;
  temperature?: number;
  humidity?: number;
  soilMoisture?: number;
  lightIntensity?: number;
  ph?: number;
  ec?: number;
  co2?: number;
}

export interface ScheduleAdjustment {
  taskId: string;
  originalDueDate: Date;
  adjustedDueDate: Date;
  adjustmentHours: number;
  reason: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  environmentalFactors: string[];
}

export interface EnvironmentalAlert {
  plantId: string;
  alertType: 'critical' | 'warning' | 'info';
  metric: string;
  currentValue: number;
  optimalRange: { min: number; max: number };
  message: string;
  recommendedActions: string[];
  urgency: number; // 0-1 scale
}

/**
 * Environmental Data Integration Service
 * Integrates environmental data with task scheduling and calendar management
 */
export class EnvironmentalDataIntegrationService {

  /**
   * Connect calendar with plant metrics and conditions
   * Analyzes current environmental conditions and adjusts task schedules accordingly
   */
  static async integrateEnvironmentalDataWithCalendar(
    plantIds: string[],
    dateRange: { start: Date; end: Date }
  ): Promise<ScheduleAdjustment[]> {
    try {
      log.info(`[EnvironmentalIntegration] Integrating environmental data for ${plantIds.length} plants`);
      
      const adjustments: ScheduleAdjustment[] = [];

      // Get all pending tasks in the date range
      const tasks = await database
        .get<PlantTask>('plant_tasks')
        .query(
          Q.where('plant_id', Q.oneOf(plantIds)),
          Q.where('status', 'pending'),
          Q.where('due_date', Q.between(dateRange.start.getTime(), dateRange.end.getTime()))
        )
        .fetch();

      // Get latest environmental data for each plant
      const environmentalData = await this.getLatestEnvironmentalData(plantIds);

      await database.write(async () => {
        for (const task of tasks) {
          const plantEnvData = environmentalData.get(task.plantId);
          if (!plantEnvData) continue;

          const adjustment = await this.calculateEnvironmentalAdjustment(task, plantEnvData);
          if (adjustment) {
            // Apply the adjustment to the task
            await task.update((t) => {
              t.dueDate = adjustment.adjustedDueDate.toISOString();
              t.priority = adjustment.priority;
              t.environmentalConditions = {
                ...t.environmentalConditions,
                temperature: plantEnvData.temperature,
                humidity: plantEnvData.humidity,
                pH: plantEnvData.phLevel,
                ec: plantEnvData.ecPpm,
              };
            });

            adjustments.push(adjustment);
          }
        }
      });

      log.info(`[EnvironmentalIntegration] Applied ${adjustments.length} environmental adjustments`);
      return adjustments;
    } catch (error) {
      log.error(`[EnvironmentalIntegration] Error integrating environmental data:`, error);
      return [];
    }
  }

  /**
   * Create dynamic schedule adjustments based on environment
   * Monitors environmental conditions and automatically adjusts task schedules
   */
  static async createDynamicScheduleAdjustments(plantId: string): Promise<ScheduleAdjustment[]> {
    try {
      const adjustments: ScheduleAdjustment[] = [];
      
      // Get plant and its environmental trends
      const plant = await database.get('plants').find(plantId);
      const trends = await this.analyzeEnvironmentalTrends(plantId, 7); // 7-day trend analysis
      const alerts = await this.generateEnvironmentalAlerts(plantId);

      // Get pending tasks for the next 5 days (5-day workflow optimization)
      const endDate = addDays(new Date(), 5);
      const pendingTasks = await database
        .get<PlantTask>('plant_tasks')
        .query(
          Q.where('plant_id', plantId),
          Q.where('status', 'pending'),
          Q.where('due_date', Q.lte(endDate.getTime()))
        )
        .fetch();

      await database.write(async () => {
        for (const task of pendingTasks) {
          const taskAdjustments = await this.calculateDynamicAdjustments(task, trends, alerts);
          
          if (taskAdjustments.length > 0) {
            // Apply the most significant adjustment
            const primaryAdjustment = taskAdjustments.reduce((prev, current) => 
              Math.abs(current.adjustmentHours) > Math.abs(prev.adjustmentHours) ? current : prev
            );

            await task.update((t) => {
              t.dueDate = primaryAdjustment.adjustedDueDate.toISOString();
              t.priority = primaryAdjustment.priority;
            });

            adjustments.push(primaryAdjustment);
          }
        }
      });

      log.info(`[EnvironmentalIntegration] Created ${adjustments.length} dynamic schedule adjustments for plant ${(plant as any).name || plant.id || 'Unknown'}`);
      return adjustments;
    } catch (error) {
      log.error(`[EnvironmentalIntegration] Error creating dynamic adjustments:`, error);
      return [];
    }
  }

  /**
   * Implement weather-based task modifications
   * Adjusts outdoor growing tasks based on weather conditions
   */
  static async implementWeatherBasedModifications(
    plantIds: string[],
    weatherConditions: WeatherConditions
  ): Promise<ScheduleAdjustment[]> {
    try {
      log.info(`[EnvironmentalIntegration] Implementing weather-based modifications for ${plantIds.length} plants`);
      
      const adjustments: ScheduleAdjustment[] = [];

      // Get outdoor plants only
      const outdoorPlants = await database
        .get<Plant>('plants')
        .query(
          Q.where('id', Q.oneOf(plantIds)),
          Q.where('light_condition', Q.like('%outdoor%'))
        )
        .fetch();

      if (outdoorPlants.length === 0) {
        log.info(`[EnvironmentalIntegration] No outdoor plants found for weather modifications`);
        return [];
      }

      // Get tasks for outdoor plants in the next 3 days
      const endDate = addDays(new Date(), 3);
      const outdoorTasks = await database
        .get<PlantTask>('plant_tasks')
        .query(
          Q.where('plant_id', Q.oneOf(outdoorPlants.map(p => p.id))),
          Q.where('status', 'pending'),
          Q.where('due_date', Q.lte(endDate.getTime()))
        )
        .fetch();

      await database.write(async () => {
        for (const task of outdoorTasks) {
          const weatherAdjustment = this.calculateWeatherAdjustment(task, weatherConditions);
          
          if (weatherAdjustment) {
            await task.update((t) => {
              t.dueDate = weatherAdjustment.adjustedDueDate.toISOString();
              t.priority = weatherAdjustment.priority;
            });

            adjustments.push(weatherAdjustment);
          }
        }
      });

      log.info(`[EnvironmentalIntegration] Applied ${adjustments.length} weather-based modifications`);
      return adjustments;
    } catch (error) {
      log.error(`[EnvironmentalIntegration] Error implementing weather modifications:`, error);
      return [];
    }
  }

  /**
   * Add sensor data integration for automated scheduling
   * Processes real-time sensor data to automatically adjust task schedules
   */
  static async integrateSensorDataForScheduling(
    sensorReadings: SensorReading[]
  ): Promise<ScheduleAdjustment[]> {
    try {
      log.info(`[EnvironmentalIntegration] Processing ${sensorReadings.length} sensor readings for scheduling`);
      
      const adjustments: ScheduleAdjustment[] = [];

      // Group readings by plant
      const readingsByPlant = sensorReadings.reduce((acc, reading) => {
        if (!acc[reading.plantId]) {
          acc[reading.plantId] = [];
        }
        acc[reading.plantId]!.push(reading);
        return acc;
      }, {} as Record<string, SensorReading[]>);

      await database.write(async () => {
        for (const [plantId, readings] of Object.entries(readingsByPlant)) {
          // Get the most recent reading
          const latestReading = readings.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
          if (!latestReading) continue;

          // Update plant metrics with sensor data
          await this.updatePlantMetricsFromSensor(plantId, latestReading);

          // Get pending tasks for this plant
          const pendingTasks = await database
            .get<PlantTask>('plant_tasks')
            .query(
              Q.where('plant_id', plantId),
              Q.where('status', 'pending')
            )
            .fetch();

          // Calculate sensor-based adjustments
          for (const task of pendingTasks) {
            const sensorAdjustment = this.calculateSensorBasedAdjustment(task, latestReading);
            
            if (sensorAdjustment) {
              await task.update((t) => {
                t.dueDate = sensorAdjustment.adjustedDueDate.toISOString();
                t.priority = sensorAdjustment.priority;
                t.environmentalConditions = {
                  ...t.environmentalConditions,
                  temperature: latestReading.temperature,
                  humidity: latestReading.humidity,
                  pH: latestReading.ph,
                  ec: latestReading.ec,
                  lightIntensity: latestReading.lightIntensity,
                };
              });

              adjustments.push(sensorAdjustment);
            }
          }
        }
      });

      log.info(`[EnvironmentalIntegration] Applied ${adjustments.length} sensor-based schedule adjustments`);
      return adjustments;
    } catch (error) {
      log.error(`[EnvironmentalIntegration] Error integrating sensor data:`, error);
      return [];
    }
  }

  /**
   * Build environmental trend analysis for planning
   * Analyzes historical environmental data to identify trends and make predictions
   */
  static async analyzeEnvironmentalTrends(
    plantId: string,
    days: number = 14
  ): Promise<EnvironmentalTrend[]> {
    try {
      const startDate = subDays(new Date(), days);
      
      // Get historical metrics
      const historicalMetrics = await database
        .get<PlantMetrics>('plant_metrics')
        .query(
          Q.where('plant_id', plantId),
          Q.where('recorded_at', Q.gte(startDate.getTime())),
          Q.where('is_deleted', false),
          Q.sortBy('recorded_at', Q.asc)
        )
        .fetch();

      if (historicalMetrics.length < 3) {
        log.warn(`[EnvironmentalIntegration] Insufficient data for trend analysis (${historicalMetrics.length} records)`);
        return [];
      }

      const trends: EnvironmentalTrend[] = [];

      // Analyze temperature trend
      if (historicalMetrics.some(m => m.temperature !== undefined)) {
        const temperatureTrend = this.calculateTrend(
          historicalMetrics
            .filter(m => m.temperature !== undefined)
            .map(m => ({ date: m.recordedAt, value: m.temperature! })),
          'temperature'
        );
        trends.push(temperatureTrend);
      }

      // Analyze humidity trend
      if (historicalMetrics.some(m => m.humidity !== undefined)) {
        const humidityTrend = this.calculateTrend(
          historicalMetrics
            .filter(m => m.humidity !== undefined)
            .map(m => ({ date: m.recordedAt, value: m.humidity! })),
          'humidity'
        );
        trends.push(humidityTrend);
      }

      // Analyze pH trend
      if (historicalMetrics.some(m => m.phLevel !== undefined)) {
        const phTrend = this.calculateTrend(
          historicalMetrics
            .filter(m => m.phLevel !== undefined)
            .map(m => ({ date: m.recordedAt, value: m.phLevel! })),
          'ph'
        );
        trends.push(phTrend);
      }

      // Analyze VPD trend
      if (historicalMetrics.some(m => m.vpd !== undefined)) {
        const vpdTrend = this.calculateTrend(
          historicalMetrics
            .filter(m => m.vpd !== undefined)
            .map(m => ({ date: m.recordedAt, value: m.vpd! })),
          'vpd'
        );
        trends.push(vpdTrend);
      }

      // Analyze EC trend
      if (historicalMetrics.some(m => m.ecPpm !== undefined)) {
        const ecTrend = this.calculateTrend(
          historicalMetrics
            .filter(m => m.ecPpm !== undefined)
            .map(m => ({ date: m.recordedAt, value: m.ecPpm! })),
          'ec'
        );
        trends.push(ecTrend);
      }

      log.info(`[EnvironmentalIntegration] Analyzed ${trends.length} environmental trends for plant ${plantId}`);
      return trends;
    } catch (error) {
      log.error(`[EnvironmentalIntegration] Error analyzing environmental trends:`, error);
      return [];
    }
  }

  /**
   * Generate environmental alerts based on current conditions
   */
  static async generateEnvironmentalAlerts(plantId: string): Promise<EnvironmentalAlert[]> {
    try {
      const alerts: EnvironmentalAlert[] = [];
      
      // Get latest metrics
      const latestMetrics = await database
        .get<PlantMetrics>('plant_metrics')
        .query(
          Q.where('plant_id', plantId),
          Q.where('is_deleted', false),
          Q.sortBy('recorded_at', Q.desc),
          Q.take(1)
        )
        .fetch();

      if (latestMetrics.length === 0) {
        return alerts;
      }

      const metrics = latestMetrics[0]!;

      // Temperature alerts
      if (metrics.temperature !== undefined) {
        if (metrics.temperature < 15 || metrics.temperature > 30) {
          alerts.push({
            plantId,
            alertType: metrics.temperature < 10 || metrics.temperature > 35 ? 'critical' : 'warning',
            metric: 'temperature',
            currentValue: metrics.temperature,
            optimalRange: { min: 18, max: 28 },
            message: `Temperature ${metrics.temperature < 15 ? 'too low' : 'too high'} (${metrics.formattedTemperature})`,
            recommendedActions: metrics.temperature < 15 
              ? ['Increase heating', 'Move to warmer location', 'Check insulation']
              : ['Increase ventilation', 'Add cooling', 'Reduce light intensity'],
            urgency: metrics.temperature < 10 || metrics.temperature > 35 ? 1.0 : 0.7,
          });
        }
      }

      // Humidity alerts
      if (metrics.humidity !== undefined) {
        if (metrics.humidity < 40 || metrics.humidity > 70) {
          alerts.push({
            plantId,
            alertType: metrics.humidity < 30 || metrics.humidity > 80 ? 'critical' : 'warning',
            metric: 'humidity',
            currentValue: metrics.humidity,
            optimalRange: { min: 45, max: 65 },
            message: `Humidity ${metrics.humidity < 40 ? 'too low' : 'too high'} (${metrics.humidity}%)`,
            recommendedActions: metrics.humidity < 40
              ? ['Add humidifier', 'Increase water evaporation', 'Reduce ventilation']
              : ['Increase ventilation', 'Add dehumidifier', 'Check for mold'],
            urgency: metrics.humidity < 30 || metrics.humidity > 80 ? 0.9 : 0.6,
          });
        }
      }

      // pH alerts
      if (metrics.phLevel !== undefined) {
        if (metrics.phLevel < 5.5 || metrics.phLevel > 7.0) {
          alerts.push({
            plantId,
            alertType: metrics.phLevel < 5.0 || metrics.phLevel > 7.5 ? 'critical' : 'warning',
            metric: 'pH',
            currentValue: metrics.phLevel,
            optimalRange: { min: 6.0, max: 6.8 },
            message: `pH ${metrics.phLevel < 5.5 ? 'too acidic' : 'too alkaline'} (${metrics.phLevel})`,
            recommendedActions: metrics.phLevel < 5.5
              ? ['Add pH up solution', 'Check nutrient solution', 'Flush growing medium']
              : ['Add pH down solution', 'Check water source', 'Test nutrient mix'],
            urgency: metrics.phLevel < 5.0 || metrics.phLevel > 7.5 ? 0.9 : 0.7,
          });
        }
      }

      // VPD alerts
      if (metrics.vpd !== undefined && !metrics.isInOptimalVPD) {
        alerts.push({
          plantId,
          alertType: 'warning',
          metric: 'VPD',
          currentValue: metrics.vpd,
          optimalRange: { min: 0.8, max: 1.5 },
          message: `VPD suboptimal (${metrics.vpd} kPa)`,
          recommendedActions: [
            'Adjust temperature and humidity balance',
            'Check environmental controls',
            'Monitor plant stress signs'
          ],
          urgency: 0.5,
        });
      }

      log.info(`[EnvironmentalIntegration] Generated ${alerts.length} environmental alerts for plant ${plantId}`);
      return alerts;
    } catch (error) {
      log.error(`[EnvironmentalIntegration] Error generating environmental alerts:`, error);
      return [];
    }
  }

  /**
   * Get environmental recommendations for task planning
   */
  static async getEnvironmentalRecommendationsForPlanning(
    plantId: string,
    planningDays: number = 7
  ): Promise<string[]> {
    try {
      const recommendations: string[] = [];
      
      const trends = await this.analyzeEnvironmentalTrends(plantId, 14);
      const alerts = await this.generateEnvironmentalAlerts(plantId);

      // Trend-based recommendations
      for (const trend of trends) {
        if (trend.trend === 'increasing' && !trend.isOptimal) {
          recommendations.push(`${trend.metric} is trending upward - consider adjusting environmental controls`);
        } else if (trend.trend === 'decreasing' && !trend.isOptimal) {
          recommendations.push(`${trend.metric} is trending downward - monitor closely and adjust as needed`);
        }

        // Prediction-based recommendations
        const firstValue = trend.values[0]?.value;
        if (firstValue && (trend.prediction < firstValue * 0.8 || trend.prediction > firstValue * 1.2)) {
          recommendations.push(`${trend.metric} predicted to change significantly - plan environmental adjustments`);
        }
      }

      // Alert-based recommendations
      for (const alert of alerts) {
        if (alert.urgency > 0.7) {
          recommendations.push(`Urgent: ${alert.message} - ${alert.recommendedActions[0]}`);
        }
      }

      // General planning recommendations
      if (trends.length > 0) {
        const unstableMetrics = trends.filter(t => t.trend !== 'stable').length;
        if (unstableMetrics > 2) {
          recommendations.push('Multiple environmental parameters are unstable - consider comprehensive environmental review');
        }
      }

      log.info(`[EnvironmentalIntegration] Generated ${recommendations.length} planning recommendations for plant ${plantId}`);
      return recommendations;
    } catch (error) {
      log.error(`[EnvironmentalIntegration] Error getting planning recommendations:`, error);
      return [];
    }
  }

  /**
   * Private helper methods
   */

  private static async getLatestEnvironmentalData(plantIds: string[]): Promise<Map<string, PlantMetrics>> {
    const environmentalData = new Map<string, PlantMetrics>();

    const latestMetrics = await database
      .get<PlantMetrics>('plant_metrics')
      .query(
        Q.where('plant_id', Q.oneOf(plantIds)),
        Q.where('is_deleted', false),
        Q.sortBy('recorded_at', Q.desc)
      )
      .fetch();

    // Get the latest metric for each plant
    for (const metric of latestMetrics) {
      if (!environmentalData.has(metric.plantId)) {
        environmentalData.set(metric.plantId, metric);
      }
    }

    return environmentalData;
  }

  private static async calculateEnvironmentalAdjustment(
    task: PlantTask,
    envData: PlantMetrics
  ): Promise<ScheduleAdjustment | null> {
    let adjustmentHours = 0;
    let newPriority = task.priority || 'medium';
    const environmentalFactors: string[] = [];
    let reason = '';

    // Watering adjustments based on humidity and soil moisture
    if (task.taskType === 'watering') {
      if (envData.humidity !== undefined) {
        if (envData.humidity > 70) {
          adjustmentHours = 12; // Delay watering in high humidity
          environmentalFactors.push(`High humidity (${envData.humidity}%)`);
          reason = 'Delayed due to high humidity';
        } else if (envData.humidity < 40) {
          adjustmentHours = -6; // Water sooner in low humidity
          newPriority = 'high';
          environmentalFactors.push(`Low humidity (${envData.humidity}%)`);
          reason = 'Advanced due to low humidity';
        }
      }
    }

    // Feeding adjustments based on pH and EC
    if (task.taskType === 'feeding') {
      if (envData.phLevel !== undefined && (envData.phLevel < 5.5 || envData.phLevel > 7.0)) {
        adjustmentHours = -2; // Feed sooner to correct pH
        newPriority = 'critical';
        environmentalFactors.push(`pH out of range (${envData.phLevel})`);
        reason = 'Advanced due to pH imbalance';
      }
    }

    // Inspection adjustments based on temperature and VPD
    if (task.taskType === 'inspection') {
      if (envData.temperature !== undefined && (envData.temperature > 30 || envData.temperature < 15)) {
        adjustmentHours = -2; // Inspect sooner in extreme temperatures
        newPriority = 'high';
        environmentalFactors.push(`Extreme temperature (${envData.formattedTemperature})`);
        reason = 'Advanced due to temperature stress';
      }
    }

    if (adjustmentHours === 0) {
      return null; // No adjustment needed
    }

    const originalDueDate = new Date(task.dueDate);
    const adjustedDueDate = new Date(originalDueDate.getTime() + (adjustmentHours * 60 * 60 * 1000));

    return {
      taskId: task.id,
      originalDueDate,
      adjustedDueDate,
      adjustmentHours,
      reason,
      priority: newPriority as 'low' | 'medium' | 'high' | 'critical',
      environmentalFactors,
    };
  }

  private static async calculateDynamicAdjustments(
    task: PlantTask,
    trends: EnvironmentalTrend[],
    alerts: EnvironmentalAlert[]
  ): Promise<ScheduleAdjustment[]> {
    const adjustments: ScheduleAdjustment[] = [];

    // Check for critical alerts that require immediate task adjustments
    const criticalAlerts = alerts.filter(a => a.alertType === 'critical');
    for (const alert of criticalAlerts) {
      if (this.isTaskAffectedByAlert(task.taskType, alert.metric)) {
        const originalDueDate = new Date(task.dueDate);
        const adjustedDueDate = new Date(originalDueDate.getTime() - (2 * 60 * 60 * 1000)); // 2 hours earlier

        adjustments.push({
          taskId: task.id,
          originalDueDate,
          adjustedDueDate,
          adjustmentHours: -2,
          reason: `Critical ${alert.metric} alert: ${alert.message}`,
          priority: 'critical',
          environmentalFactors: [alert.message],
        });
      }
    }

    // Check trends for predictive adjustments
    for (const trend of trends) {
      if (trend.trend !== 'stable' && this.isTaskAffectedByTrend(task.taskType, trend.metric)) {
        const originalDueDate = new Date(task.dueDate);
        let adjustmentHours = 0;

        // Adjust based on trend direction and task type
        if (trend.metric === 'humidity' && task.taskType === 'watering') {
          adjustmentHours = trend.trend === 'increasing' ? 6 : -3; // Delay if humidity increasing
        } else if (trend.metric === 'temperature' && task.taskType === 'inspection') {
          adjustmentHours = trend.trend === 'increasing' ? -1 : 0; // Inspect sooner if temperature rising
        }

        if (adjustmentHours !== 0) {
          const adjustedDueDate = new Date(originalDueDate.getTime() + (adjustmentHours * 60 * 60 * 1000));

          adjustments.push({
            taskId: task.id,
            originalDueDate,
            adjustedDueDate,
            adjustmentHours,
            reason: `${trend.metric} trending ${trend.trend}`,
            priority: task.priority || 'medium',
            environmentalFactors: [`${trend.metric} ${trend.trend} trend`],
          });
        }
      }
    }

    return adjustments;
  }

  private static calculateWeatherAdjustment(
    task: PlantTask,
    weather: WeatherConditions
  ): ScheduleAdjustment | null {
    let adjustmentHours = 0;
    let newPriority = task.priority || 'medium';
    const environmentalFactors: string[] = [];
    let reason = '';

    // Watering adjustments based on weather
    if (task.taskType === 'watering') {
      if (weather.conditions === 'rainy' && weather.precipitation && weather.precipitation > 5) {
        adjustmentHours = 24; // Delay watering if significant rain expected
        environmentalFactors.push(`Heavy rain expected (${weather.precipitation}mm)`);
        reason = 'Delayed due to expected rainfall';
      } else if (weather.conditions === 'sunny' && weather.temperature > 30) {
        adjustmentHours = -2; // Water sooner in hot sunny weather
        newPriority = 'high';
        environmentalFactors.push(`Hot sunny weather (${weather.temperature}°C)`);
        reason = 'Advanced due to hot weather';
      }
    }

    // Inspection adjustments based on weather
    if (task.taskType === 'inspection') {
      if (weather.conditions === 'stormy') {
        adjustmentHours = 6; // Delay inspection during storms
        environmentalFactors.push('Stormy weather conditions');
        reason = 'Delayed due to storm conditions';
      }
    }

    // Pruning/training adjustments
    if (task.taskType === 'pruning' || task.taskType === 'training') {
      if (weather.conditions === 'rainy') {
        adjustmentHours = 12; // Delay pruning in wet conditions (disease risk)
        environmentalFactors.push('Wet conditions increase disease risk');
        reason = 'Delayed to avoid disease risk in wet conditions';
      }
    }

    if (adjustmentHours === 0) {
      return null;
    }

    const originalDueDate = new Date(task.dueDate);
    const adjustedDueDate = new Date(originalDueDate.getTime() + (adjustmentHours * 60 * 60 * 1000));

    return {
      taskId: task.id,
      originalDueDate,
      adjustedDueDate,
      adjustmentHours,
      reason,
      priority: newPriority as 'low' | 'medium' | 'high' | 'critical',
      environmentalFactors,
    };
  }

  private static calculateSensorBasedAdjustment(
    task: PlantTask,
    sensorReading: SensorReading
  ): ScheduleAdjustment | null {
    let adjustmentHours = 0;
    let newPriority = task.priority || 'medium';
    const environmentalFactors: string[] = [];
    let reason = '';

    // Soil moisture based watering adjustments
    if (task.taskType === 'watering' && sensorReading.soilMoisture !== undefined) {
      if (sensorReading.soilMoisture < 30) {
        adjustmentHours = -4; // Water sooner if soil is dry
        newPriority = 'high';
        environmentalFactors.push(`Low soil moisture (${sensorReading.soilMoisture}%)`);
        reason = 'Advanced due to low soil moisture';
      } else if (sensorReading.soilMoisture > 80) {
        adjustmentHours = 12; // Delay watering if soil is saturated
        environmentalFactors.push(`High soil moisture (${sensorReading.soilMoisture}%)`);
        reason = 'Delayed due to high soil moisture';
      }
    }

    // Light intensity based adjustments
    if (sensorReading.lightIntensity !== undefined) {
      if (sensorReading.lightIntensity < 200 && task.taskType === 'inspection') {
        adjustmentHours = -1; // Inspect sooner in low light conditions
        environmentalFactors.push(`Low light intensity (${sensorReading.lightIntensity} PPFD)`);
        reason = 'Advanced due to low light conditions';
      }
    }

    // pH sensor adjustments
    if (task.taskType === 'feeding' && sensorReading.ph !== undefined) {
      if (sensorReading.ph < 5.5 || sensorReading.ph > 7.0) {
        adjustmentHours = -1; // Feed sooner to correct pH
        newPriority = 'critical';
        environmentalFactors.push(`pH out of range (${sensorReading.ph})`);
        reason = 'Advanced due to pH imbalance detected by sensor';
      }
    }

    if (adjustmentHours === 0) {
      return null;
    }

    const originalDueDate = new Date(task.dueDate);
    const adjustedDueDate = new Date(originalDueDate.getTime() + (adjustmentHours * 60 * 60 * 1000));

    return {
      taskId: task.id,
      originalDueDate,
      adjustedDueDate,
      adjustmentHours,
      reason,
      priority: newPriority as 'low' | 'medium' | 'high' | 'critical',
      environmentalFactors,
    };
  }

  private static async updatePlantMetricsFromSensor(
    plantId: string,
    sensorReading: SensorReading
  ): Promise<void> {
    try {
      await database.write(async () => {
        await database.get<PlantMetrics>('plant_metrics').create((metrics) => {
          metrics.plantId = plantId;
          metrics.recordedAt = sensorReading.timestamp;
          
          if (sensorReading.temperature !== undefined) {
            metrics.temperature = sensorReading.temperature;
            metrics.temperatureUnit = 'celsius';
          }
          
          if (sensorReading.humidity !== undefined) {
            metrics.humidity = sensorReading.humidity;
          }
          
          if (sensorReading.ph !== undefined) {
            metrics.phLevel = sensorReading.ph;
          }
          
          if (sensorReading.ec !== undefined) {
            metrics.ecPpm = sensorReading.ec;
          }

          // Calculate VPD if we have temperature and humidity
          if (sensorReading.temperature !== undefined && sensorReading.humidity !== undefined) {
            metrics.vpd = PlantMetrics.calculateVPD(sensorReading.temperature, sensorReading.humidity, 'celsius');
          }

          metrics.notes = `Sensor data from ${sensorReading.sensorId}`;
        });
      });

      log.info(`[EnvironmentalIntegration] Updated plant metrics from sensor ${sensorReading.sensorId}`);
    } catch (error) {
      log.error(`[EnvironmentalIntegration] Error updating plant metrics from sensor:`, error);
    }
  }

  private static calculateTrend(
    values: Array<{ date: Date; value: number }>,
    metric: 'temperature' | 'humidity' | 'ph' | 'vpd' | 'ec'
  ): EnvironmentalTrend {
    if (values.length < 2) {
      return {
        metric,
        values,
        trend: 'stable',
        changeRate: 0,
        prediction: values[0]?.value || 0,
        isOptimal: true,
        recommendations: [],
      };
    }

    // Calculate linear regression for trend
    const n = values.length;
    const sumX = values.reduce((sum, _, i) => sum + i, 0);
    const sumY = values.reduce((sum, v) => sum + v.value, 0);
    const sumXY = values.reduce((sum, v, i) => sum + (i * v.value), 0);
    const sumXX = values.reduce((sum, _, i) => sum + (i * i), 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Determine trend direction
    let trend: 'increasing' | 'decreasing' | 'stable';
    if (Math.abs(slope) < 0.1) {
      trend = 'stable';
    } else if (slope > 0) {
      trend = 'increasing';
    } else {
      trend = 'decreasing';
    }

    // Calculate change rate (units per day)
    const timeSpanDays = (values[values.length - 1]!.date.getTime() - values[0]!.date.getTime()) / (1000 * 60 * 60 * 24);
    const changeRate = timeSpanDays > 0 ? slope / timeSpanDays : 0;

    // Predict value in 3 days
    const prediction = intercept + slope * (n + 3);

    // Check if current values are optimal
    const latestValue = values[values.length - 1]!.value;
    const isOptimal = this.isValueOptimal(metric, latestValue);

    // Generate recommendations
    const recommendations = this.generateTrendRecommendations(metric, trend, latestValue, prediction);

    return {
      metric,
      values,
      trend,
      changeRate,
      prediction,
      isOptimal,
      recommendations,
    };
  }

  private static isValueOptimal(metric: string, value: number): boolean {
    const optimalRanges: Record<string, { min: number; max: number }> = {
      temperature: { min: 18, max: 28 },
      humidity: { min: 45, max: 65 },
      ph: { min: 6.0, max: 6.8 },
      vpd: { min: 0.8, max: 1.5 },
      ec: { min: 800, max: 1500 },
    };

    const range = optimalRanges[metric];
    return range ? value >= range.min && value <= range.max : true;
  }

  private static generateTrendRecommendations(
    metric: string,
    trend: 'increasing' | 'decreasing' | 'stable',
    currentValue: number,
    predictedValue: number
  ): string[] {
    const recommendations: string[] = [];

    if (trend === 'stable') {
      return recommendations; // No recommendations for stable trends
    }

    const recommendationMap: Record<string, Record<string, string[]>> = {
      temperature: {
        increasing: ['Increase ventilation', 'Add cooling system', 'Reduce light intensity'],
        decreasing: ['Increase heating', 'Improve insulation', 'Check for cold drafts'],
      },
      humidity: {
        increasing: ['Increase ventilation', 'Add dehumidifier', 'Check for water leaks'],
        decreasing: ['Add humidifier', 'Reduce ventilation', 'Increase water evaporation'],
      },
      ph: {
        increasing: ['Add pH down solution', 'Check nutrient mix', 'Test water source'],
        decreasing: ['Add pH up solution', 'Check growing medium', 'Flush system'],
      },
      vpd: {
        increasing: ['Increase humidity', 'Reduce temperature', 'Improve air circulation'],
        decreasing: ['Decrease humidity', 'Increase temperature', 'Check environmental controls'],
      },
      ec: {
        increasing: ['Reduce nutrient concentration', 'Flush growing medium', 'Check for salt buildup'],
        decreasing: ['Increase nutrient concentration', 'Check nutrient solution', 'Monitor plant uptake'],
      },
    };

    const metricRecommendations = recommendationMap[metric]?.[trend];
    if (metricRecommendations) {
      recommendations.push(...metricRecommendations);
    }

    // Add prediction-based recommendations
    if (!this.isValueOptimal(metric, predictedValue)) {
      recommendations.push(`Predicted ${metric} (${predictedValue.toFixed(1)}) will be out of optimal range - take preventive action`);
    }

    return recommendations;
  }

  private static isTaskAffectedByAlert(taskType: TaskType, metric: string): boolean {
    const affectedTasks: Record<string, TaskType[]> = {
      temperature: ['watering', 'inspection', 'feeding'],
      humidity: ['watering', 'inspection', 'pruning'],
      ph: ['feeding', 'watering', 'inspection'],
      vpd: ['watering', 'inspection'],
      ec: ['feeding', 'watering'],
    };

    return affectedTasks[metric]?.includes(taskType) || false;
  }

  private static isTaskAffectedByTrend(taskType: TaskType, metric: string): boolean {
    return this.isTaskAffectedByAlert(taskType, metric); // Same logic for now
  }
}