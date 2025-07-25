import { useState, useCallback, useEffect } from 'react';
import { Alert, Share } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ScheduleTemplate, TemplateTaskData } from '../models/ScheduleTemplate';
import { 
  templateSharingService,
  exportTemplate,
  importTemplate,
  generateShareableLink,
  getTemplateStats,
} from '../services/template-sharing-service';
import { triggerLightHaptic, triggerMediumHaptic, triggerHeavyHaptic } from '../utils/haptics';
import { log } from '../utils/logger';

interface TemplateStats {
  usageCount: number;
  isPublic: boolean;
  createdAt: Date;
  lastModified: Date;
  totalTasks: number;
}

interface UseTemplateSharingReturn {
  // State
  loading: boolean;
  stats: TemplateStats | null;
  
  // Actions
  shareTemplate: () => Promise<void>;
  exportTemplateData: () => Promise<void>;
  importTemplateData: (jsonData: string) => Promise<boolean>;
  togglePublicStatus: () => Promise<void>;
  generateLink: () => Promise<string>;
  refreshStats: () => Promise<void>;
}

/**
 * Hook for managing template sharing functionality
 */
export const useTemplateSharing = (
  template: ScheduleTemplate,
  userId: string
): UseTemplateSharingReturn => {
  const { t } = useTranslation('templates');
  
  // State
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<TemplateStats | null>(null);

  // Load template statistics
  const refreshStats = useCallback(async () => {
    try {
      const templateStats = await getTemplateStats(template.id);
      if (templateStats) {
        setStats(templateStats);
      }
    } catch (error) {
      log.error('Error loading template stats:', error);
      // TODO: Add Sentry integration when Sentry is installed
      // import * as Sentry from '@sentry/react-native';
      // Sentry.captureException(error, {
      //   extra: { templateId: template.id, context: 'refreshStats' }
      // });
    }
  }, [template.id]);

  // Share template via native share
  const shareTemplate = useCallback(async () => {
    try {
      setLoading(true);
      triggerLightHaptic();

      let shareContent: { message: string; title: string; url?: string };

      if (template.isPublic) {
        // Share public template with link
        const shareUrl = await generateLink();
        shareContent = {
          message: `Check out this plant care template: ${template.name}\n\nDuration: ${template.durationWeeks} weeks\nTasks: ${template.totalTasks}\n\n${shareUrl}`,
          title: template.name,
          url: shareUrl,
        };
      } else {
        // Share template data for import
        const jsonData = await exportTemplateData();
        shareContent = {
          message: `Plant Care Template: ${template.name}\n\nImport this template into your Canabro app:\n\n${jsonData}`,
          title: `${template.name} - Schedule Template`,
        };
      }

      await Share.share(shareContent);
      
      // Increment shared count
      await templateSharingService.createTemplateVersion(
        template.id,
        'Template shared',
        template.templateData
      );

    } catch (error) {
      log.error('Error sharing template:', error);
      // TODO: Add Sentry integration when Sentry is installed
      // import * as Sentry from '@sentry/react-native';
      // Sentry.captureException(error, {
      //   extra: { templateId: template.id, isPublic: template.isPublic, context: 'shareTemplate' }
      // });
      triggerHeavyHaptic();
      Alert.alert(
        t('common.error'),
        t('sharing.shareError')
      );
    } finally {
      setLoading(false);
    }
  }, [template, t]);

  // Export template to JSON
  const exportTemplateData = useCallback(async (): Promise<string> => {
    try {
      const jsonData = await exportTemplate(template.id);
      return jsonData;
    } catch (error) {
      log.error('Error exporting template:', error);
      // TODO: Add Sentry integration when Sentry is installed
      // import * as Sentry from '@sentry/react-native';
      // Sentry.captureException(error, {
      //   extra: { templateId: template.id, templateName: template.name, context: 'exportTemplateData' }
      // });
      throw error;
    }
  }, [template.id, template.name]);

  // Import template from JSON
  const importTemplateData = useCallback(async (jsonData: string): Promise<boolean> => {
    try {
      setLoading(true);
      triggerLightHaptic();

      const importedTemplate = await importTemplate(jsonData, userId);
      
      if (importedTemplate) {
        triggerMediumHaptic();
        Alert.alert(
          t('sharing.importSuccess'),
          t('sharing.importSuccessMessage'),
          [{ text: t('common.ok') }]
        );
        return true;
      }
      
      return false;
    } catch (error) {
      log.error('Error importing template:', error);
      // TODO: Add Sentry integration when Sentry is installed
      // import * as Sentry from '@sentry/react-native';
      // Sentry.captureException(error, {
      //   extra: { userId, context: 'importTemplateData' }
      // });
      triggerHeavyHaptic();
      Alert.alert(
        t('common.error'),
        t('sharing.importError')
      );
      return false;
    } finally {
      setLoading(false);
    }
  }, [userId, t]);

  // Toggle template public/private status
  const togglePublicStatus = useCallback(async () => {
    try {
      setLoading(true);
      triggerLightHaptic();

      if (template.isPublic) {
        await templateSharingService.removeTemplateFromCommunity(template.id);
      } else {
        await templateSharingService.shareTemplateToCommunity(template.id);
      }

      // Refresh template data
      await refreshStats();
      
      triggerMediumHaptic();
      Alert.alert(
        t('sharing.visibilityChanged'),
        template.isPublic 
          ? t('sharing.nowPrivate')
          : t('sharing.nowPublic')
      );

    } catch (error) {
      log.error('Error toggling template visibility:', error);
      // TODO: Add Sentry integration when Sentry is installed
      // import * as Sentry from '@sentry/react-native';
      // Sentry.captureException(error, {
      //   extra: { templateId: template.id, isPublic: template.isPublic, context: 'togglePublicStatus' }
      // });
      triggerHeavyHaptic();
      Alert.alert(
        t('common.error'),
        t('sharing.visibilityError')
      );
    } finally {
      setLoading(false);
    }
  }, [template, t, refreshStats]);

  // Generate shareable link
  const generateLink = useCallback(async (): Promise<string> => {
    try {
      const shareUrl = await generateShareableLink(template.id);
      return shareUrl;
    } catch (error) {
      log.error('Error generating shareable link:', error);
      // TODO: Add Sentry integration when Sentry is installed
      // import * as Sentry from '@sentry/react-native';
      // Sentry.captureException(error, {
      //   extra: { templateId: template.id, context: 'generateLink' }
      // });
      throw error;
    }
  }, [template.id]);

  // Load stats on mount
  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  return {
    // State
    loading,
    stats,
    
    // Actions
    shareTemplate,
    exportTemplateData,
    importTemplateData,
    togglePublicStatus,
    generateLink,
    refreshStats,
  };
};

/**
 * Hook for managing template versioning
 */
export const useTemplateVersioning = (template: ScheduleTemplate) => {
  const [versions, setVersions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Create new version
  const createVersion = useCallback(async (
    changes: string,
    newTemplateData: TemplateTaskData[]
  ) => {
    try {
      setLoading(true);
      
      // Compare with current version to generate change summary
      const changeList = templateSharingService.compareTemplateVersions(
        template.templateData,
        newTemplateData
      );
      
      const changesSummary = changes || changeList.join(', ') || 'Template updated';
      
      await templateSharingService.createTemplateVersion(
        template.id,
        changesSummary,
        newTemplateData
      );
      
      // Update template with new data
      await template.updateTemplateData(newTemplateData);
      
    } catch (error) {
      log.error('Error creating template version:', error);
      // TODO: Add Sentry integration when Sentry is installed
      // import * as Sentry from '@sentry/react-native';
      // Sentry.captureException(error, {
      //   extra: { templateId: template.id, changes, context: 'createVersion' }
      // });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [template]);

  // Load version history
  const loadVersions = useCallback(async () => {
    try {
      setLoading(true);
      // In a real implementation, this would load from the template_versions table
      // For now, we'll create a mock version
      const mockVersions = [
        {
          id: template.id,
          version: '1.0',
          changes: 'Initial template creation',
          createdAt: template.createdAt,
          templateData: template.templateData,
        },
      ];
      setVersions(mockVersions);
    } catch (error) {
      log.error('Error loading template versions:', error);
      // TODO: Add Sentry integration when Sentry is installed
      // import * as Sentry from '@sentry/react-native';
      // Sentry.captureException(error, {
      //   extra: { templateId: template.id, context: 'loadVersions' }
      // });
    } finally {
      setLoading(false);
    }
  }, [template]);

  // Restore version
  const restoreVersion = useCallback(async (versionData: TemplateTaskData[]) => {
    try {
      setLoading(true);
      
      await createVersion(
        'Restored from previous version',
        versionData
      );
      
    } catch (error) {
      log.error('Error restoring template version:', error);
      // TODO: Add Sentry integration when Sentry is installed
      // import * as Sentry from '@sentry/react-native';
      // Sentry.captureException(error, {
      //   extra: { templateId: template.id, context: 'restoreVersion' }
      // });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [createVersion]);

  useEffect(() => {
    loadVersions();
  }, [loadVersions]);

  return {
    versions,
    loading,
    createVersion,
    loadVersions,
    restoreVersion,
  };
};