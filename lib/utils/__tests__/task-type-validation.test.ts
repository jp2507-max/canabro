/**
 * Task Type Validation Utilities Tests
 * 
 * Unit tests for safe task type validation functions
 */

import { validateTaskType, safeGetTaskType, filterValidTaskTypes, createTaskTypeValidator } from '../task-type-validation';
import { TaskType } from '@/lib/types/taskTypes';

// Mock logger to avoid console noise in tests
jest.mock('@/lib/utils/production-utils', () => ({
  Logger: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Task Type Validation Utilities', () => {
  describe('validateTaskType', () => {
    it('should validate correct task types', () => {
      const validTypes: TaskType[] = [
        'watering',
        'feeding', 
        'inspection',
        'pruning',
        'harvest',
        'transplant',
        'training',
        'defoliation',
        'flushing'
      ];

      validTypes.forEach(taskType => {
        const result = validateTaskType(taskType);
        expect(result.isValid).toBe(true);
        expect(result.taskType).toBe(taskType);
        expect(result.error).toBeUndefined();
      });
    });

    it('should reject invalid task types', () => {
      const invalidTypes = [
        'invalid',
        'WATERING',
        'water',
        'feed',
        '',
        'unknown'
      ];

      invalidTypes.forEach(taskType => {
        const result = validateTaskType(taskType);
        expect(result.isValid).toBe(false);
        expect(result.taskType).toBe(null);
        expect(result.error).toContain('Invalid task type');
      });
    });

    it('should handle null and undefined', () => {
      const nullResult = validateTaskType(null);
      expect(nullResult.isValid).toBe(false);
      expect(nullResult.taskType).toBe(null);
      expect(nullResult.error).toContain('null or undefined');

      const undefinedResult = validateTaskType(undefined);
      expect(undefinedResult.isValid).toBe(false);
      expect(undefinedResult.taskType).toBe(null);
      expect(undefinedResult.error).toContain('null or undefined');
    });

    it('should handle non-string types', () => {
      const nonStringTypes = [123, {}, [], true, Symbol('test')];

      nonStringTypes.forEach(taskType => {
        const result = validateTaskType(taskType);
        expect(result.isValid).toBe(false);
        expect(result.taskType).toBe(null);
        expect(result.error).toContain('must be a string');
      });
    });

    it('should include task ID in validation context', () => {
      const result = validateTaskType('invalid', 'task-123');
      expect(result.isValid).toBe(false);
      // Logger should have been called with taskId context
    });
  });

  describe('safeGetTaskType', () => {
    it('should extract valid task types from task objects', () => {
      const task = { taskType: 'watering', id: 'task-1' };
      const result = safeGetTaskType(task);
      expect(result).toBe('watering');
    });

    it('should return null for invalid task types', () => {
      const task = { taskType: 'invalid', id: 'task-1' };
      const result = safeGetTaskType(task);
      expect(result).toBe(null);
    });

    it('should handle tasks without id', () => {
      const task = { taskType: 'feeding' };
      const result = safeGetTaskType(task);
      expect(result).toBe('feeding');
    });
  });

  describe('filterValidTaskTypes', () => {
    it('should filter array to only valid task types', () => {
      const mixedTypes = [
        'watering',
        'invalid',
        'feeding',
        123,
        'pruning',
        null,
        'unknown'
      ];

      const result = filterValidTaskTypes(mixedTypes);
      expect(result).toEqual(['watering', 'feeding', 'pruning']);
    });

    it('should return empty array for all invalid types', () => {
      const invalidTypes = ['invalid', 123, null, undefined, {}];
      const result = filterValidTaskTypes(invalidTypes);
      expect(result).toEqual([]);
    });

    it('should handle empty array', () => {
      const result = filterValidTaskTypes([]);
      expect(result).toEqual([]);
    });
  });

  describe('createTaskTypeValidator', () => {
    it('should return valid task type when validation passes', () => {
      const validator = createTaskTypeValidator('inspection');
      const result = validator('watering');
      expect(result).toBe('watering');
    });

    it('should return fallback when validation fails', () => {
      const validator = createTaskTypeValidator('inspection');
      const result = validator('invalid');
      expect(result).toBe('inspection');
    });

    it('should use default fallback when none provided', () => {
      const validator = createTaskTypeValidator();
      const result = validator('invalid');
      expect(result).toBe('inspection');
    });

    it('should use custom fallback', () => {
      const validator = createTaskTypeValidator('feeding');
      const result = validator('invalid');
      expect(result).toBe('feeding');
    });
  });
});
