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
    // Validate the input data before updating
    this.validateTemplateData(data);
    
    await this.update((template) => {
      template.templateData = JSON.stringify(data);
    });
  }

  // Validation helper method
  private validateTemplateData(data: TemplateTaskData[]): void {
    if (!Array.isArray(data)) {
      throw new Error('Template data must be an array');
    }

    const validPriorities = ['low', 'medium', 'high', 'critical'] as const;
    
    data.forEach((task, index) => {
      // Check required fields
      if (typeof task.weekNumber !== 'number' || task.weekNumber < 1) {
        throw new Error(`Invalid weekNumber at index ${index}: must be a positive number`);
      }
      
      if (typeof task.dayOfWeek !== 'number' || task.dayOfWeek < 0 || task.dayOfWeek > 6) {
        throw new Error(`Invalid dayOfWeek at index ${index}: must be a number between 0-6`);
      }
      
      if (typeof task.taskType !== 'string' || task.taskType.trim() === '') {
        throw new Error(`Invalid taskType at index ${index}: must be a non-empty string`);
      }
      
      if (typeof task.title !== 'string' || task.title.trim() === '') {
        throw new Error(`Invalid title at index ${index}: must be a non-empty string`);
      }
      
      if (typeof task.description !== 'string') {
        throw new Error(`Invalid description at index ${index}: must be a string`);
      }
      
      if (!validPriorities.includes(task.priority)) {
        throw new Error(`Invalid priority at index ${index}: must be one of ${validPriorities.join(', ')}`);
      }
      
      if (typeof task.estimatedDuration !== 'number' || task.estimatedDuration < 0) {
        throw new Error(`Invalid estimatedDuration at index ${index}: must be a non-negative number`);
      }
      
      // Check optional fields
      if (task.requiredSupplies !== undefined) {
        if (!Array.isArray(task.requiredSupplies)) {
          throw new Error(`Invalid requiredSupplies at index ${index}: must be an array if provided`);
        }
        
        task.requiredSupplies.forEach((supply, supplyIndex) => {
          if (typeof supply !== 'string' || supply.trim() === '') {
            throw new Error(`Invalid supply at index ${index}, supply ${supplyIndex}: must be a non-empty string`);
          }
        });
      }
    });
  }

  // Helper methods for JSON fields
  getTemplateData(): TemplateTaskData[] {
    try {
      return this.templateData ? JSON.parse(this.templateData) : [];
    } catch (error) {
      console.error('Error parsing template data:', error);
      return []; // Return empty array as fallback
    }
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