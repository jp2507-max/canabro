// AllowedTaskType for notification form
export type AllowedTaskType = 'watering' | 'feeding' | 'inspection' | 'pruning' | 'training' | 'harvest';
export const allowedTaskTypes: AllowedTaskType[] = [
  'watering',
  'feeding',
  'inspection',
  'pruning',
  'training',
  'harvest',
];

/**
 * Checks if a value is a valid AllowedTaskType.
 * @param value - The value to check
 * @returns boolean indicating if value is a valid AllowedTaskType
 */
export function isValidTaskType(value: unknown): value is AllowedTaskType {
  return typeof value === 'string' && allowedTaskTypes.includes(value as AllowedTaskType);
}
/**
 * Task Type Validation Utilities
 * 
 * Provides safe validation and conversion of task types to prevent runtime errors
 * from invalid task type values in the database or external sources.
 */

import { TaskType, isTaskType } from '@/lib/types/taskTypes';
import { Logger } from '@/lib/utils/production-utils';

export interface TaskTypeValidationResult {
  isValid: boolean;
  taskType: TaskType | null;
  error?: string;
}

/**
 * Safely validates and converts a task type string to TaskType
 * @param taskType - The task type string to validate
 * @param taskId - Optional task ID for logging context
 * @returns Validation result with converted TaskType or null if invalid
 */
export function validateTaskType(
  taskType: unknown, 
  taskId?: string
): TaskTypeValidationResult {
  // Handle null/undefined
  if (taskType == null) {
    const error = 'Task type is null or undefined';
    Logger.warn('[TaskTypeValidation] Invalid task type', { 
      taskType, 
      taskId, 
      error 
    });
    return { isValid: false, taskType: null, error };
  }

  // Handle non-string types
  if (typeof taskType !== 'string') {
    const error = `Task type must be a string, got ${typeof taskType}`;
    Logger.warn('[TaskTypeValidation] Invalid task type type', { 
      taskType, 
      taskId, 
      error 
    });
    return { isValid: false, taskType: null, error };
  }

  // Validate against TaskType enum
  if (!isTaskType(taskType)) {
    const error = `Invalid task type: ${taskType}. Must be one of: watering, feeding, inspection, pruning, harvest, transplant, training, defoliation, flushing`;
    Logger.warn('[TaskTypeValidation] Invalid task type value', { 
      taskType, 
      taskId, 
      error 
    });
    return { isValid: false, taskType: null, error };
  }

  return { isValid: true, taskType };
}

/**
 * Safely extracts TaskType from a task object with validation
 * @param task - Task object with taskType property
 * @returns TaskType or null if invalid
 */
export function safeGetTaskType(task: { taskType: unknown; id?: string }): TaskType | null {
  const validation = validateTaskType(task.taskType, task.id);
  return validation.taskType;
}

/**
 * Validates an array of task types and returns only valid ones
 * @param taskTypes - Array of task type strings to validate
 * @returns Array of valid TaskTypes
 */
export function filterValidTaskTypes(taskTypes: unknown[]): TaskType[] {
  return taskTypes
    .map((taskType, index) => validateTaskType(taskType, `array_index_${index}`))
    .filter(result => result.isValid)
    .map(result => result.taskType!) as TaskType[];
}

/**
 * Creates a fallback TaskType for invalid values
 * @param fallback - Default TaskType to use when validation fails
 * @returns Function that returns validated TaskType or fallback
 */
export function createTaskTypeValidator(fallback: TaskType = 'inspection') {
  return (taskType: unknown, taskId?: string): TaskType => {
    const validation = validateTaskType(taskType, taskId);
    if (validation.isValid) {
      return validation.taskType!;
    }
    
    Logger.info('[TaskTypeValidation] Using fallback task type', { 
      originalTaskType: taskType, 
      fallback, 
      taskId 
    });
    return fallback;
  };
}
