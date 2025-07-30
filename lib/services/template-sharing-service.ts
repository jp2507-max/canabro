// import { Q } from '@nozbe/watermelondb'; // Removed unused import
import database from '../database/database';
import { ScheduleTemplate, TemplateTaskData } from '../models/ScheduleTemplate';
import { BaseService, ApiResponse, createService } from './service-factory';
import { log } from '../utils/logger';

/**
 * Service for managing template sharing and community features
 */
export class TemplateSharingService extends BaseService {
  /**
   * Share template to community (make public)
   */
  async shareTemplateToCommunity(templateId: string): Promise<ApiResponse<boolean>> {
    try {
      const template = await database
        .get<ScheduleTemplate>('schedule_templates')
        .find(templateId);

      await template.update((t) => {
        t.isPublic = true;
      });

      // In a real implementation, this would sync to Supabase
      // await this.syncTemplateToSupabase(template);

      return this.wrapResponse<boolean>(true, null);
    } catch (error) {
      return this.wrapResponse<boolean>(false, this.handleError(error));
    }
  }

  /**
   * Remove template from community (make private)
   */
  async removeTemplateFromCommunity(templateId: string): Promise<ApiResponse<boolean>> {
    try {
      const template = await database
        .get<ScheduleTemplate>('schedule_templates')
        .find(templateId);

      await template.update((t) => {
        t.isPublic = false;
      });

      return this.wrapResponse<boolean>(true, null);
    } catch (error) {
      return this.wrapResponse<boolean>(false, this.handleError(error));
    }
  }

  /**
   * Export template to JSON format
   */
  async exportTemplate(templateId: string): Promise<ApiResponse<string>> {
    try {
      const template = await database
        .get<ScheduleTemplate>('schedule_templates')
        .find(templateId);

      const exportData = {
        version: '1.0',
        template: {
          name: template.name,
          description: template.description,
          category: template.category,
          strainType: template.strainType,
          durationWeeks: template.durationWeeks,
          templateData: template.templateData,
        },
        metadata: {
          exportedAt: new Date().toISOString(),
          exportedBy: template.createdBy,
          appVersion: '1.0.0',
        },
      };

      const jsonString = JSON.stringify(exportData, null, 2);
      return this.wrapResponse<string>(jsonString, null);
    } catch (error) {
      return this.wrapResponse<string>('', this.handleError(error));
    }
  }

  /**
   * Import template from JSON data
   */
  async importTemplate(
    jsonData: string,
    userId: string
  ): Promise<ApiResponse<ScheduleTemplate>> {
    try {
      const parsedData = JSON.parse(jsonData);
      
      // Validate template data structure
      if (!this.validateTemplateData(parsedData)) {
        throw new Error('Invalid template format');
      }

      const template = await database.write(async () => {
        return await database
          .get<ScheduleTemplate>('schedule_templates')
          .create((newTemplate) => {
            newTemplate.name = `${parsedData.template.name} (Imported)`;
            newTemplate.description = parsedData.template.description;
            newTemplate.category = parsedData.template.category;
            newTemplate.strainType = parsedData.template.strainType;
            newTemplate.durationWeeks = parsedData.template.durationWeeks;
            newTemplate.createdBy = userId;
            newTemplate.isPublic = false; // Imported templates are private by default
            newTemplate.usageCount = 0;
            newTemplate.templateData = parsedData.template.templateData;
          });
      });

      return this.wrapResponse<ScheduleTemplate>(template, null);
    } catch (error) {
      return this.wrapResponse<ScheduleTemplate>(null, this.handleError(error));
    }
  }

  /**
   * Create template version for tracking changes
   */
  async createTemplateVersion(
    templateId: string,
    changes: string,
    templateData: TemplateTaskData[]
  ): Promise<ApiResponse<boolean>> {
    try {
      // In a real implementation, this would create a version record
      // For now, we'll just update the template's updated_at timestamp
      const template = await database
        .get<ScheduleTemplate>('schedule_templates')
        .find(templateId);

      await template.update((t) => {
        t.templateData = templateData;
      });

      // Log the changes for debugging (in production, this would be stored in a versions table)
      log.info(`Template ${templateId} updated: ${changes}`);

      return this.wrapResponse<boolean>(true, null);
    } catch (error) {
      return this.wrapResponse<boolean>(false, this.handleError(error));
    }
  }

  /**
   * Get template sharing statistics
   */
  async getTemplateStats(templateId: string): Promise<ApiResponse<{
    usageCount: number;
    isPublic: boolean;
    createdAt: Date;
    lastModified: Date;
    totalTasks: number;
  } | null>> {
    try {
      const template = await database
        .get<ScheduleTemplate>('schedule_templates')
        .find(templateId);

      const stats = {
        usageCount: template.usageCount,
        isPublic: template.isPublic,
        createdAt: template.createdAt,
        lastModified: template.updatedAt,
        totalTasks: template.totalTasks,
      };

      return this.wrapResponse(stats, null);
    } catch (error) {
      return this.wrapResponse(null, this.handleError(error));
    }
  }

  /**
   * Generate shareable link for template
   */
  async generateShareableLink(templateId: string): Promise<ApiResponse<string>> {
    try {
      const template = await database
        .get<ScheduleTemplate>('schedule_templates')
        .find(templateId);

      if (!template.isPublic) {
        throw new Error('Template must be public to generate shareable link');
      }

      // In a real implementation, this would generate a proper shareable link
      const shareUrl = `https://canabro.app/templates/${templateId}`;
      
      return this.wrapResponse<string>(shareUrl, null);
    } catch (error) {
      return this.wrapResponse<string>('', this.handleError(error));
    }
  }

  /**
   * Validate template data structure
   */
  private validateTemplateData(data: any): boolean {
    if (!data || typeof data !== 'object') return false;
    if (!data.template || !data.version || !data.metadata) return false;
    
    const { template } = data;
    if (!template.name || !template.category || !template.durationWeeks) return false;
    if (!Array.isArray(template.templateData)) return false;
    
    // Validate each task in template data
    return template.templateData.every((task: any) => 
      task.weekNumber && 
      task.dayOfWeek !== undefined && 
      task.taskType && 
      task.title &&
      task.priority &&
      task.estimatedDuration !== undefined
    );
  }

  /**
   * Compare two template versions to generate change summary
   */
  compareTemplateVersions(v1: TemplateTaskData[], v2: TemplateTaskData[]): string[] {
    const changes: string[] = [];
    
    if (v1.length !== v2.length) {
      changes.push(`Task count changed from ${v1.length} to ${v2.length}`);
    }
    
    // Compare individual tasks
    const maxLength = Math.max(v1.length, v2.length);
    for (let i = 0; i < maxLength; i++) {
      const task1 = v1[i];
      const task2 = v2[i];
      
      if (!task1 && task2) {
        changes.push(`Added task: ${task2.title}`);
      } else if (!task2 && task1) {
        changes.push(`Removed task: ${task1.title}`);
      } else if (task1 && task2) {
        if (task1.title !== task2.title) {
          changes.push(`Task title changed: "${task1.title}" → "${task2.title}"`);
        }
        if (task1.taskType !== task2.taskType) {
          changes.push(`Task type changed for "${task1.title}": ${task1.taskType} → ${task2.taskType}`);
        }
        if (task1.priority !== task2.priority) {
          changes.push(`Priority changed for "${task1.title}": ${task1.priority} → ${task2.priority}`);
        }
        if (task1.estimatedDuration !== task2.estimatedDuration) {
          changes.push(`Duration changed for "${task1.title}": ${task1.estimatedDuration}min → ${task2.estimatedDuration}min`);
        }
      }
    }
    
    return changes;
  }

  /**
   * Sync template to Supabase (for community sharing)
   * This would be implemented when integrating with Supabase
   */
  private async syncTemplateToSupabase(template: ScheduleTemplate): Promise<void> {
    // Implementation would use Supabase MCP tools to:
    // 1. Insert/update template in public templates table
    // 2. Handle template versioning
    // 3. Manage community features like ratings, comments
    
    log.info(`Syncing template ${template.id} to Supabase (not implemented yet)`, { templateId: template.id });
    
    // Example structure:
    // await supabase
    //   .from('public_templates')
    //   .upsert({
    //     id: template.id,
    //     name: template.name,
    //     description: template.description,
    //     category: template.category,
    //     strain_type: template.strainType,
    //     duration_weeks: template.durationWeeks,
    //     template_data: template.templateData,
    //     created_by: template.createdBy,
    //     usage_count: template.usageCount,
    //     is_public: template.isPublic,
    //     created_at: template.createdAt,
    //     updated_at: template.updatedAt,
    //   });
  }
}

// Export singleton instance
export const templateSharingService = createService(TemplateSharingService);

// Export convenience functions
export const shareTemplateToCommunity = async (templateId: string): Promise<boolean> => {
  const response = await templateSharingService.shareTemplateToCommunity(templateId);
  return response.data || false;
};

export const removeTemplateFromCommunity = async (templateId: string): Promise<boolean> => {
  const response = await templateSharingService.removeTemplateFromCommunity(templateId);
  return response.data || false;
};

export const exportTemplate = async (templateId: string): Promise<string> => {
  const response = await templateSharingService.exportTemplate(templateId);
  return response.data || '';
};

export const importTemplate = async (jsonData: string, userId: string): Promise<ScheduleTemplate | null> => {
  const response = await templateSharingService.importTemplate(jsonData, userId);
  return response.data;
};

export const generateShareableLink = async (templateId: string): Promise<string> => {
  const response = await templateSharingService.generateShareableLink(templateId);
  return response.data || '';
};

export const getTemplateStats = async (templateId: string) => {
  const response = await templateSharingService.getTemplateStats(templateId);
  return response.data;
};