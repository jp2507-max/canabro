// Minimal Subscription type for WatermelonDB observables
type Subscription = { unsubscribe: () => void };
import { useState, useEffect, useMemo } from 'react';
import { Q } from '@nozbe/watermelondb';
import { database } from '@/lib/models';
import { CareReminder } from '@/lib/models/CareReminder';
import { Plant } from '@/lib/models/Plant';

export interface PlantAttentionStatus {
  needsAttention: boolean;
  priorityLevel: 'low' | 'medium' | 'high' | 'urgent';
  reasons: AttentionReason[];
  reminderCount: number;
  overdueCount: number;
  dueTodayCount: number;
}

export interface AttentionReason {
  type: 'overdue_reminder' | 'due_today' | 'low_health' | 'overdue_watering' | 'overdue_nutrients';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'urgent';
  data?: Record<string, unknown>;
}

export interface PlantAttentionMap {
  [plantId: string]: PlantAttentionStatus;
}

/**
 * Hook to determine if plants need attention based on reminders and health status
 */
export const usePlantAttention = (plantIds?: string[]) => {
  const [attentionMap, setAttentionMap] = useState<PlantAttentionMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Memoize plantIds to avoid unnecessary resubscriptions
  const memoizedPlantIds = useMemo(() => plantIds ? [...plantIds].sort() : undefined, [plantIds ? [...plantIds].sort().join(",") : ""]);

  useEffect(() => {
    let reminderSubscription: Subscription | undefined;
    let plantSubscription: Subscription | undefined;

    const loadAttentionData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Query active reminders
        const reminderQuery = database.collections
          .get<CareReminder>('care_reminders')
          .query(
            Q.where('is_completed', false),
            Q.where('is_deleted', false),
            ...(memoizedPlantIds ? [Q.where('plant_id', Q.oneOf(memoizedPlantIds))] : [])
          );

        // Query plants
        const plantQuery = database.collections
          .get<Plant>('plants')
          .query(
            Q.where('is_deleted', false),
            ...(memoizedPlantIds ? [Q.where('id', Q.oneOf(memoizedPlantIds))] : [])
          );

        // Set up observables
        reminderSubscription = reminderQuery.observe().subscribe({
          next: (reminders) => updateAttentionMap(reminders),
          error: (err) => {
            console.error('Error in reminder subscription:', err);
            setError(err instanceof Error ? err : new Error(String(err)));
            setLoading(false);
          }
        });

        plantSubscription = plantQuery.observe().subscribe({
          next: (plants) => updatePlantHealthStatus(plants),
          error: (err) => {
            console.error('Error in plant subscription:', err);
            setError(err instanceof Error ? err : new Error(String(err)));
            setLoading(false);
          }
        });

      } catch (err) {
        console.error('Error loading plant attention data:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      }
    };

    // --- Begin updateAttentionMap function body ---
    const updateAttentionMap = async (reminders: CareReminder[]) => {
      try {
        const newAttentionMap: PlantAttentionMap = {};
        const now = new Date();
        // Group reminders by plant
        const remindersByPlant = reminders.reduce((acc, reminder) => {
          if (!acc[reminder.plantId]) {
            acc[reminder.plantId] = [];
          }
          acc[reminder.plantId]!.push(reminder);
          return acc;
        }, {} as { [plantId: string]: CareReminder[] });

        // Calculate attention status for each plant
        for (const [plantId, plantReminders] of Object.entries(remindersByPlant)) {
          const reasons: AttentionReason[] = [];
          let overdueCount = 0;
          let dueTodayCount = 0;

          plantReminders.forEach((reminder) => {
            if (reminder.isOverdue) {
              overdueCount++;
              reasons.push({
                type: 'overdue_reminder',
                message: `${reminder.title} is overdue`,
                severity: 'urgent',
                data: { reminder, daysOverdue: Math.ceil((now.getTime() - reminder.scheduledFor.getTime()) / (1000 * 60 * 60 * 24)) }
              });
            } else if (reminder.isDueToday) {
              dueTodayCount++;
              reasons.push({
                type: 'due_today',
                message: `${reminder.title} is due today`,
                severity: 'high',
                data: { reminder }
              });
            }
          });

          // Determine priority level
          let priorityLevel: 'low' | 'medium' | 'high' | 'urgent' = 'low';
          if (overdueCount > 0) {
            priorityLevel = 'urgent';
          } else if (dueTodayCount > 0) {
            priorityLevel = 'high';
          } else if (plantReminders.length > 0) {
            // Check if any reminders are due soon (within 2 days) using CareReminder's isDueSoon getter
            const dueSoonCount = plantReminders.filter((reminder) => reminder.isDueSoon).length;
            if (dueSoonCount > 0) {
              priorityLevel = 'medium';
            }
          }

          newAttentionMap[plantId] = {
            needsAttention: overdueCount > 0 || dueTodayCount > 0,
            priorityLevel,
            reasons,
            reminderCount: plantReminders.length,
            overdueCount,
            dueTodayCount,
          };
        }

        setAttentionMap(newAttentionMap);
        setLoading(false);
      } catch (error) {
        console.error('Error updating attention map:', error);
        setError(error instanceof Error ? error : new Error(String(error)));
        setLoading(false);
      }
    };
    // --- End updateAttentionMap function body ---

    const updatePlantHealthStatus = async (plants: Plant[]) => {
      try {
        // Update attention map with health-based reasons
        setAttentionMap((prevMap) => {
          const updatedMap = { ...prevMap };

          plants.forEach((plant) => {
            const existingStatus = updatedMap[plant.id] || {
              needsAttention: false,
              priorityLevel: 'low' as const,
              reasons: [],
              reminderCount: 0,
              overdueCount: 0,
              dueTodayCount: 0,
            };

            const healthReasons: AttentionReason[] = [];

            // Check health percentage
            if (plant.healthPercentage !== undefined && plant.healthPercentage < 50) {
              healthReasons.push({
                type: 'low_health',
                message: `Health is low (${plant.healthPercentage}%)`,
                severity: plant.healthPercentage < 25 ? 'urgent' : 'high',
                data: { healthPercentage: plant.healthPercentage }
              });
            }

            // Check watering schedule
            if (plant.nextWateringDays !== undefined && plant.nextWateringDays <= 0) {
              healthReasons.push({
                type: 'overdue_watering',
                message: 'Watering is overdue',
                severity: 'high',
                data: { daysOverdue: Math.abs(plant.nextWateringDays) }
              });
            }

            // Check nutrient schedule
            if (plant.nextNutrientDays !== undefined && plant.nextNutrientDays <= 0) {
              healthReasons.push({
                type: 'overdue_nutrients',
                message: 'Nutrients are overdue',
                severity: 'medium',
                data: { daysOverdue: Math.abs(plant.nextNutrientDays) }
              });
            }

            // Combine with existing reasons
            const allReasons = [...existingStatus.reasons, ...healthReasons];
            
            // Determine overall priority level
            const maxSeverity = allReasons.reduce((max, reason) => {
              const severityOrder = { low: 0, medium: 1, high: 2, urgent: 3 };
              return severityOrder[reason.severity] > severityOrder[max] ? reason.severity : max;
            }, 'low' as 'low' | 'medium' | 'high' | 'urgent');

            const needsAttention = existingStatus.needsAttention || healthReasons.length > 0;

            updatedMap[plant.id] = {
              ...existingStatus,
              needsAttention,
              priorityLevel: maxSeverity,
              reasons: allReasons,
            };
          });

          return updatedMap;
        });
      } catch (error) {
        console.error('Error updating plant health status:', error);
        setError(error instanceof Error ? error : new Error(String(error)));
      }
    };

    loadAttentionData();

    return () => {
      try {
        reminderSubscription?.unsubscribe();
        plantSubscription?.unsubscribe();
      } catch (cleanupError) {
        console.error('Error during cleanup:', cleanupError);
      }
    };
  }, [memoizedPlantIds]);

  // Memoized computed values
  const totalPlantsNeedingAttention = useMemo(() => {
    return Object.values(attentionMap).filter(status => status.needsAttention).length;
  }, [attentionMap]);

  const urgentPlantsCount = useMemo(() => {
    return Object.values(attentionMap).filter(status => status.priorityLevel === 'urgent').length;
  }, [attentionMap]);

  const highPriorityPlantsCount = useMemo(() => {
    return Object.values(attentionMap).filter(status => status.priorityLevel === 'high').length;
  }, [attentionMap]);

  const getPlantAttentionStatus = (plantId: string): PlantAttentionStatus => {
    return attentionMap[plantId] || {
      needsAttention: false,
      priorityLevel: 'low',
      reasons: [],
      reminderCount: 0,
      overdueCount: 0,
      dueTodayCount: 0,
    };
  };

  return {
  attentionMap,
  loading,
  error,
  totalPlantsNeedingAttention,
  urgentPlantsCount,
  highPriorityPlantsCount,
  getPlantAttentionStatus,
  };
};

/**
 * Hook for a single plant's attention status
 */
export const useSinglePlantAttention = (plantId: string) => {
  const { getPlantAttentionStatus, loading } = usePlantAttention([plantId]);
  
  return {
    attentionStatus: getPlantAttentionStatus(plantId),
    loading,
  };
};