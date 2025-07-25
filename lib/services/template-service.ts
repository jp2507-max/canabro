import { Q } from '@nozbe/watermelondb';
import database from '../database/database';
import { ScheduleTemplate, TemplateTaskData } from '../models/ScheduleTemplate';
import { BaseService, ApiResponse, createService } from './service-factory';

/**
 * Service for managing schedule template operations
 */
export class TemplateService extends BaseService {
  /**
   * Get all public templates
   */
  async getPublicTemplates(): Promise<ApiResponse<ScheduleTemplate[]>> {
    try {
      const templates = await database
        .get<ScheduleTemplate>('schedule_templates')
        .query(
          Q.where('is_public', true),
          Q.where('is_deleted', Q.notEq(true)),
          Q.sortBy('usage_count', Q.desc)
        )
        .fetch();

      return this.wrapResponse<ScheduleTemplate[]>(templates, null);
    } catch (error) {
      return this.wrapResponse<ScheduleTemplate[]>([], this.handleError(error));
    }
  }

  /**
   * Get templates by category
   */
  async getTemplatesByCategory(category: string): Promise<ApiResponse<ScheduleTemplate[]>> {
    try {
      const templates = await database
        .get<ScheduleTemplate>('schedule_templates')
        .query(
          Q.where('category', category),
          Q.where('is_public', true),
          Q.where('is_deleted', Q.notEq(true)),
          Q.sortBy('usage_count', Q.desc)
        )
        .fetch();

      return this.wrapResponse<ScheduleTemplate[]>(templates, null);
    } catch (error) {
      return this.wrapResponse<ScheduleTemplate[]>([], this.handleError(error));
    }
  }

  /**
   * Search templates by name or description
   */
  async searchTemplates(query: string): Promise<ApiResponse<ScheduleTemplate[]>> {
    try {
      const templates = await database
        .get<ScheduleTemplate>('schedule_templates')
        .query(
          Q.where('is_public', true),
          Q.where('is_deleted', Q.notEq(true)),
          Q.or(
            Q.where('name', Q.like(`%${Q.sanitizeLikeString(query)}%`)),
            Q.where('description', Q.like(`%${Q.sanitizeLikeString(query)}%`))
          ),
          Q.sortBy('usage_count', Q.desc)
        )
        .fetch();

      return this.wrapResponse<ScheduleTemplate[]>(templates, null);
    } catch (error) {
      return this.wrapResponse<ScheduleTemplate[]>([], this.handleError(error));
    }
  }

  /**
   * Get template by ID
   */
  async getTemplateById(templateId: string): Promise<ApiResponse<ScheduleTemplate>> {
    try {
      const template = await database
        .get<ScheduleTemplate>('schedule_templates')
        .find(templateId);

      return this.wrapResponse<ScheduleTemplate>(template, null);
    } catch (error) {
      return this.wrapResponse<ScheduleTemplate>(null, this.handleError(error));
    }
  }

  /**
   * Increment template usage count
   */
  async incrementUsageCount(templateId: string): Promise<ApiResponse<boolean>> {
    try {
      const template = await database
        .get<ScheduleTemplate>('schedule_templates')
        .find(templateId);

      await template.incrementUsageCount();
      return this.wrapResponse<boolean>(true, null);
    } catch (error) {
      return this.wrapResponse<boolean>(false, this.handleError(error));
    }
  }

  /**
   * Create a new template
   */
  async createTemplate(templateData: {
    name: string;
    description?: string;
    category: string;
    strainType?: string;
    durationWeeks: number;
    createdBy: string;
    isPublic: boolean;
    templateData: TemplateTaskData[];
  }): Promise<ApiResponse<ScheduleTemplate>> {
    try {
      const template = await database.write(async () => {
        return await database
          .get<ScheduleTemplate>('schedule_templates')
          .create((template) => {
            template.name = templateData.name;
            template.description = templateData.description;
            template.category = templateData.category;
            template.strainType = templateData.strainType;
            template.durationWeeks = templateData.durationWeeks;
            template.createdBy = templateData.createdBy;
            template.isPublic = templateData.isPublic;
            template.usageCount = 0;
            template.templateData = templateData.templateData;
          });
      });

      return this.wrapResponse<ScheduleTemplate>(template, null);
    } catch (error) {
      return this.wrapResponse<ScheduleTemplate>(null, this.handleError(error));
    }
  }

  /**
   * Update template
   */
  async updateTemplate(
    templateId: string,
    updates: Partial<{
      name: string;
      description: string;
      category: string;
      strainType: string;
      durationWeeks: number;
      isPublic: boolean;
      templateData: TemplateTaskData[];
    }>
  ): Promise<ApiResponse<ScheduleTemplate>> {
    try {
      const template = await database
        .get<ScheduleTemplate>('schedule_templates')
        .find(templateId);

      const updatedTemplate = await database.write(async () => {
        return await template.update((template) => {
          if (updates.name !== undefined) template.name = updates.name;
          if (updates.description !== undefined) template.description = updates.description;
          if (updates.category !== undefined) template.category = updates.category;
          if (updates.strainType !== undefined) template.strainType = updates.strainType;
          if (updates.durationWeeks !== undefined) template.durationWeeks = updates.durationWeeks;
          if (updates.isPublic !== undefined) template.isPublic = updates.isPublic;
          if (updates.templateData !== undefined) template.templateData = updates.templateData;
        });
      });

      return this.wrapResponse<ScheduleTemplate>(updatedTemplate, null);
    } catch (error) {
      return this.wrapResponse<ScheduleTemplate>(null, this.handleError(error));
    }
  }

  /**
   * Delete template (soft delete)
   */
  async deleteTemplate(templateId: string): Promise<ApiResponse<boolean>> {
    try {
      const template = await database
        .get<ScheduleTemplate>('schedule_templates')
        .find(templateId);

      await template.markAsDeleted();
      return this.wrapResponse<boolean>(true, null);
    } catch (error) {
      return this.wrapResponse<boolean>(false, this.handleError(error));
    }
  }

  /**
   * Get user's templates
   */
  async getUserTemplates(userId: string): Promise<ApiResponse<ScheduleTemplate[]>> {
    try {
      const templates = await database
        .get<ScheduleTemplate>('schedule_templates')
        .query(
          Q.where('created_by', userId),
          Q.where('is_deleted', Q.notEq(true)),
          Q.sortBy('created_at', Q.desc)
        )
        .fetch();

      return this.wrapResponse<ScheduleTemplate[]>(templates, null);
    } catch (error) {
      return this.wrapResponse<ScheduleTemplate[]>([], this.handleError(error));
    }
  }

  /**
   * Get popular templates
   */
  async getPopularTemplates(limit: number = 10): Promise<ApiResponse<ScheduleTemplate[]>> {
    try {
      const templates = await database
        .get<ScheduleTemplate>('schedule_templates')
        .query(
          Q.where('is_public', true),
          Q.where('is_deleted', Q.notEq(true)),
          Q.sortBy('usage_count', Q.desc),
          Q.take(limit)
        )
        .fetch();

      return this.wrapResponse<ScheduleTemplate[]>(templates, null);
    } catch (error) {
      return this.wrapResponse<ScheduleTemplate[]>([], this.handleError(error));
    }
  }

  /**
   * Get recent templates
   */
  async getRecentTemplates(limit: number = 10): Promise<ApiResponse<ScheduleTemplate[]>> {
    try {
      const templates = await database
        .get<ScheduleTemplate>('schedule_templates')
        .query(
          Q.where('is_public', true),
          Q.where('is_deleted', Q.notEq(true)),
          Q.sortBy('created_at', Q.desc),
          Q.take(limit)
        )
        .fetch();

      return this.wrapResponse<ScheduleTemplate[]>(templates, null);
    } catch (error) {
      return this.wrapResponse<ScheduleTemplate[]>([], this.handleError(error));
    }
  }

  /**
   * Get templates by strain type
   */
  async getTemplatesByStrainType(strainType: string): Promise<ApiResponse<ScheduleTemplate[]>> {
    try {
      const templates = await database
        .get<ScheduleTemplate>('schedule_templates')
        .query(
          Q.where('strain_type', strainType),
          Q.where('is_public', true),
          Q.where('is_deleted', Q.notEq(true)),
          Q.sortBy('usage_count', Q.desc)
        )
        .fetch();

      return this.wrapResponse<ScheduleTemplate[]>(templates, null);
    } catch (error) {
      return this.wrapResponse<ScheduleTemplate[]>([], this.handleError(error));
    }
  }

  /**
   * Get template statistics
   */
  async getTemplateStats(): Promise<ApiResponse<{
    totalTemplates: number;
    publicTemplates: number;
    totalUsage: number;
    popularCategories: Array<{ category: string; count: number }>;
  } | null>> {
    try {
      const allTemplates = await database
        .get<ScheduleTemplate>('schedule_templates')
        .query(Q.where('is_deleted', Q.notEq(true)))
        .fetch();

      const publicTemplates = allTemplates.filter(t => t.isPublic);
      const totalUsage = allTemplates.reduce((sum, t) => sum + t.usageCount, 0);
      
      // Count by category
      const categoryCount: Record<string, number> = {};
      publicTemplates.forEach(template => {
        categoryCount[template.category] = (categoryCount[template.category] || 0) + 1;
      });

      const popularCategories = Object.entries(categoryCount)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count);

      const stats = {
        totalTemplates: allTemplates.length,
        publicTemplates: publicTemplates.length,
        totalUsage,
        popularCategories,
      };

      return this.wrapResponse(stats, null);
    } catch (error) {
      return this.wrapResponse(null, this.handleError(error));
    }
  }
}

// Export singleton instance
export const templateService = createService(TemplateService);

// Export convenience functions for backward compatibility
export const getPublicTemplates = async (): Promise<ScheduleTemplate[]> => {
  const response = await templateService.getPublicTemplates();
  return response.data || [];
};

export const getTemplatesByCategory = async (category: string): Promise<ScheduleTemplate[]> => {
  const response = await templateService.getTemplatesByCategory(category);
  return response.data || [];
};

export const searchTemplates = async (query: string): Promise<ScheduleTemplate[]> => {
  const response = await templateService.searchTemplates(query);
  return response.data || [];
};

export const getTemplateById = async (templateId: string): Promise<ScheduleTemplate | null> => {
  const response = await templateService.getTemplateById(templateId);
  return response.data;
};

export const incrementUsageCount = async (templateId: string): Promise<boolean> => {
  const response = await templateService.incrementUsageCount(templateId);
  return response.data || false;
};

export const createTemplate = async (templateData: Parameters<TemplateService['createTemplate']>[0]): Promise<ScheduleTemplate | null> => {
  const response = await templateService.createTemplate(templateData);
  return response.data;
};

export const updateTemplate = async (
  templateId: string,
  updates: Parameters<TemplateService['updateTemplate']>[1]
): Promise<ScheduleTemplate | null> => {
  const response = await templateService.updateTemplate(templateId, updates);
  return response.data;
};

export const deleteTemplate = async (templateId: string): Promise<boolean> => {
  const response = await templateService.deleteTemplate(templateId);
  return response.data || false;
};

export const getUserTemplates = async (userId: string): Promise<ScheduleTemplate[]> => {
  const response = await templateService.getUserTemplates(userId);
  return response.data || [];
};

export const getPopularTemplates = async (limit?: number): Promise<ScheduleTemplate[]> => {
  const response = await templateService.getPopularTemplates(limit);
  return response.data || [];
};

export const getRecentTemplates = async (limit?: number): Promise<ScheduleTemplate[]> => {
  const response = await templateService.getRecentTemplates(limit);
  return response.data || [];
};

export const getTemplatesByStrainType = async (strainType: string): Promise<ScheduleTemplate[]> => {
  const response = await templateService.getTemplatesByStrainType(strainType);
  return response.data || [];
};

export const getTemplateStats = async () => {
  const response = await templateService.getTemplateStats();
  return response.data;
};