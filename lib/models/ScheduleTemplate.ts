import { Model } from '@nozbe/watermelondb';
import { Associations } from '@nozbe/watermelondb/Model';
import {
  field,
  date,
  readonly,
  text,
  json,
  writer,
} from '@nozbe/watermelondb/decorators';

export interface TemplateTaskData {
  weekNumber: number;
  dayOfWeek: number;
  taskType: import('../types/taskTypes').TaskType;
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
  @json('template_data', (json) => json) templateData!: TemplateTaskData[];
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
  @date('last_synced_at') lastSyncedAt?: Date;
  @field('is_deleted') isDeleted?: boolean;

  // Derived properties
  get isActive(): boolean {
    return !this.isDeleted;
  }

  get totalTasks(): number {
    return this.templateData?.length || 0;
  }

  get averageTasksPerWeek(): number {
    if (!this.durationWeeks || this.totalTasks === 0) return 0;
    return Math.round(this.totalTasks / this.durationWeeks);
  }

  get tasksByWeek(): Record<number, TemplateTaskData[]> {
    if (!this.templateData) return {};
    
    return this.templateData.reduce((acc, task) => {
      if (!acc[task.weekNumber]) {
        acc[task.weekNumber] = [];
      }
      acc[task.weekNumber]!.push(task);
      return acc;
    }, {} as Record<number, TemplateTaskData[]>);
  }

  get tasksByType(): Record<string, TemplateTaskData[]> {
    if (!this.templateData) return {};
    
    return this.templateData.reduce((acc, task) => {
      if (!acc[task.taskType]) {
        acc[task.taskType] = [];
      }
      acc[task.taskType]!.push(task);
      return acc;
    }, {} as Record<string, TemplateTaskData[]>);
  }

  // Writer methods
  @writer async incrementUsageCount() {
    await this.update((template) => {
      template.usageCount = (template.usageCount || 0) + 1;
    });
  }

  @writer async updateTemplateData(newData: TemplateTaskData[]) {
    await this.update((template) => {
      template.templateData = newData;
    });
  }

  @writer async markAsDeleted() {
    await this.update((template) => {
      template.isDeleted = true;
    });
  }

  @writer async togglePublic() {
    await this.update((template) => {
      template.isPublic = !template.isPublic;
    });
  }
}