import { Model } from '@nozbe/watermelondb';
import { Associations } from '@nozbe/watermelondb/Model';
import {
  field,
  date,
  readonly,
  text,
  relation,
} from '@nozbe/watermelondb/decorators';

import { Plant } from './Plant';

export class PlantMetrics extends Model {
  static table = 'plant_metrics';
  static associations: Associations = {
    plants: { type: 'belongs_to' as const, key: 'plant_id' },
  };

  @text('plant_id') plantId!: string;
  
  // Basic Health Metrics
  @field('health_percentage') healthPercentage?: number;
  @field('next_watering_days') nextWateringDays?: number;
  @field('next_nutrient_days') nextNutrientDays?: number;
  
  // Growth Measurements
  @field('height') height?: number;
  @text('height_unit') heightUnit?: string; // 'cm' | 'inches'
  @field('node_count') nodeCount?: number;
  @field('stem_diameter') stemDiameter?: number;
  
  // Environmental Metrics
  @field('ph_level') phLevel?: number;
  @field('ec_ppm') ecPpm?: number;
  @field('temperature') temperature?: number;
  @text('temperature_unit') temperatureUnit?: string; // 'celsius' | 'fahrenheit'
  @field('humidity') humidity?: number;
  @field('vpd') vpd?: number; // Auto-calculated
  
  // Flowering Metrics
  @text('trichome_status') trichomeStatus?: string; // 'clear' | 'cloudy' | 'amber' | 'mixed'
  @field('pistil_brown_percentage') pistilBrownPercentage?: number;
  @field('bud_density') budDensity?: number; // 1-10 scale
  
  @text('notes') notes?: string;
  @readonly @date('recorded_at') recordedAt!: Date;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
  @date('last_synced_at') lastSyncedAt?: Date;
  @field('is_deleted') isDeleted?: boolean;

  // Relations
  @relation('plants', 'plant_id') plant!: Plant;

  // Derived properties
  get isActive(): boolean {
    return !this.isDeleted;
  }

  get isHealthy(): boolean {
    return (this.healthPercentage || 0) >= 70;
  }

  get needsWatering(): boolean {
    return (this.nextWateringDays || 0) <= 0;
  }

  get needsNutrients(): boolean {
    return (this.nextNutrientDays || 0) <= 0;
  }

  get isInOptimalVPD(): boolean {
    if (!this.vpd) return false;
    // Optimal VPD range is typically 0.8-1.2 kPa for vegetative, 1.0-1.5 kPa for flowering
    return this.vpd >= 0.8 && this.vpd <= 1.5;
  }

  get formattedHeight(): string {
    if (!this.height) return 'Not recorded';
    const unit = this.heightUnit || 'cm';
    return `${this.height} ${unit}`;
  }

  get formattedTemperature(): string {
    if (!this.temperature) return 'Not recorded';
    const unit = this.temperatureUnit || 'celsius';
    const symbol = unit === 'celsius' ? '°C' : '°F';
    return `${this.temperature}${symbol}`;
  }

  // VPD calculation helper (static method)
  static calculateVPD(temperature: number, humidity: number, temperatureUnit: string = 'celsius'): number {
    // Convert to Celsius if needed
    let tempC = temperature;
    if (temperatureUnit === 'fahrenheit') {
      tempC = (temperature - 32) * 5/9;
    }

    // Calculate saturation vapor pressure (kPa)
    const svp = 0.6108 * Math.exp((17.27 * tempC) / (tempC + 237.3));
    
    // Calculate actual vapor pressure
    const avp = svp * (humidity / 100);
    
    // Calculate VPD
    const vpd = svp - avp;
    
    return Math.round(vpd * 100) / 100; // Round to 2 decimal places
  }
}