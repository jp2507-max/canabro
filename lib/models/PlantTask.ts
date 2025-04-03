import { Model } from '@nozbe/watermelondb';
import { Associations } from '@nozbe/watermelondb/Model';
import { date, readonly, text, relation, writer } from '@nozbe/watermelondb/decorators'; // Import writer, field is unused

import { Plant } from './Plant';

export class PlantTask extends Model {
  static table = 'plant_tasks';
  static associations: Associations = {
    plants: { type: 'belongs_to' as const, key: 'plant_id' },
  };

  @text('task_id') taskId!: string;
  @text('plant_id') plantId!: string;
  @text('title') title!: string;
  @text('description') description?: string;
  @text('task_type') taskType!: string;
  @text('due_date') dueDate!: string;
  @text('status') status!: string;
  @text('notification_id') notificationId?: string;
  @text('user_id') userId!: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @relation('plants', 'plant_id') plant!: Plant;

  @writer async markAsCompleted() {
    await this.update((task) => {
      task.status = 'completed';
      task.notificationId = undefined; // Clear notification ID
    });
  }
}
