
import { PlantTask } from '../PlantTask';

describe('PlantTask Recurrence', () => {
  it('should generate next occurrence when completing the initial recurring task', async () => {
    // Mock PlantTask instance
    const updateMock = jest.fn(async (fn) => fn({}));
    const createNextRecurringTaskMock = jest.fn(async () => {});
    const initialTask = {
      status: 'pending',
      notificationId: 'notif1',
      templateId: 'template1',
      parentTaskId: undefined,
      sequenceNumber: 0,
      update: updateMock,
      markAsCompleted: PlantTask.prototype.markAsCompleted,
      createNextRecurringTask: createNextRecurringTaskMock,
    } as unknown as PlantTask;

    await initialTask.markAsCompleted.call(initialTask);
    expect(updateMock).toHaveBeenCalled();
    expect(createNextRecurringTaskMock).toHaveBeenCalled();
  });

  it('should generate next occurrence when completing a child recurring task', async () => {
    const updateMock = jest.fn(async (fn) => fn({}));
    const createNextRecurringTaskMock = jest.fn(async () => {});
    const childTask = {
      status: 'pending',
      notificationId: 'notif2',
      templateId: 'template1',
      parentTaskId: 'task1',
      sequenceNumber: 1,
      update: updateMock,
      markAsCompleted: PlantTask.prototype.markAsCompleted,
      createNextRecurringTask: createNextRecurringTaskMock,
    } as unknown as PlantTask;

    await childTask.markAsCompleted.call(childTask);
    expect(updateMock).toHaveBeenCalled();
    expect(createNextRecurringTaskMock).toHaveBeenCalled();
  });
});
