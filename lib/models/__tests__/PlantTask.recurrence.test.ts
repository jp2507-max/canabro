
import { PlantTask } from '../PlantTask';

// Helper function to create test task mock
const createTaskMock = (overrides: Partial<PlantTask> = {}) => {
  const updateMock = jest.fn(async (fn) => fn({}));
  const createNextRecurringTaskMock = jest.fn(async () => {});
  
  return {
    status: 'pending',
    notificationId: 'notif1',
    templateId: 'template1',
    parentTaskId: undefined,
    sequenceNumber: 0,
    update: updateMock,
    markAsCompleted: PlantTask.prototype.markAsCompleted,
    createNextRecurringTask: createNextRecurringTaskMock,
    ...overrides,
  } as jest.Mocked<Partial<PlantTask>>;
};

describe('PlantTask Recurrence', () => {
  describe('successful task completion', () => {
    it('should generate next occurrence when completing the initial recurring task', async () => {
      const initialTask = createTaskMock({ templateId: 'template1' });

      await initialTask.markAsCompleted.call(initialTask);
      expect(initialTask.update).toHaveBeenCalled();
      expect(initialTask.createNextRecurringTask).toHaveBeenCalled();
    });

    it('should generate next occurrence when completing a child recurring task', async () => {
      const childTask = createTaskMock({ 
        parentTaskId: 'task1', 
        sequenceNumber: 1 
      });

      await childTask.markAsCompleted.call(childTask);
      expect(childTask.update).toHaveBeenCalled();
      expect(childTask.createNextRecurringTask).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle createNextRecurringTask failure gracefully', async () => {
      const task = createTaskMock({ templateId: 'template1' });
      task.createNextRecurringTask.mockRejectedValue(new Error('Database error'));

      // Should not throw even if next task creation fails
      await expect(task.markAsCompleted.call(task)).resolves.not.toThrow();
      expect(task.update).toHaveBeenCalled();
    });

    it('should not create next task if neither templateId nor parentTaskId exists', async () => {
      const task = createTaskMock({ templateId: undefined, parentTaskId: undefined });

      await task.markAsCompleted.call(task);
      expect(task.update).toHaveBeenCalled();
      expect(task.createNextRecurringTask).not.toHaveBeenCalled();
    });
  });
});
