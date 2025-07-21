import { Model } from '@nozbe/watermelondb';
import { Associations } from '@nozbe/watermelondb/Model';
import {
  field,
  date,
  readonly,
  text,
  writer,
} from '@nozbe/watermelondb/decorators';

export interface TemplateTaskData {
  weekNumber: number;
  dayOfWeek: number;
  taskType: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedDuration: number; // minutes
  requiredSupplies?: string[];
}

export class ScheduleTemplate extends Model {
  static table = 'schedule_templates';
  static associations: Associations = {};

  @text('name') name!: string;
  @text('description') description?: string;
  @text('category') category!: string; // 'indoor', 'outdoor', 'hydroponic', etc.
  @text('strain_type') strainType?: string; // 'indica', 'sativa', 'hybrid'
  @field('duration_weeks') durationWeeks!: number;
  @text('created_by') createdBy!: string;
  @field('is_public') isPublic!: boolean;
  @field('usage_count') usageCount!: number;
  @field('template_data') templateData!: string; // JSON string
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
  @date('last_synced_at') lastSyncedAt?: Date;
  @field('is_deleted') isDeleted?: boolean;

  // Writer methods
  @writer async incrementUsageCount() {
    await this.update((template) => {
      template.usageCount = (template.usageCount || 0) + 1;
    });
  }

  @writer async updateTemplateData(data: TemplateTaskData[]) {
    await this.update((template) => {
      template.templateData = JSON.stringify(data);
    });
  }

  // Helper methods for JSON fields
  getTemplateData(): TemplateTaskData[] {
    return this.templateData ? JSON.parse(this.templateData) : [];
  }

  @writer async markAsDeleted() {
    await this.update((template) => {
      template.isDeleted = true;
    });
  }

  // Helper methods
  get isActive(): boolean {
    return !this.isDeleted;
  }

  get totalTasks(): number {
    return this.getTemplateData().length;
  }

  getTasksForWeek(weekNumber: number): TemplateTaskData[] {
    return this.getTemplateData().filter(task => task.weekNumber === weekNumber);
  }

  getTasksByType(taskType: string): TemplateTaskData[] {
    return this.getTemplateData().filter(task => task.taskType === taskType);
  }
}