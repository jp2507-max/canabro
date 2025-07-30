import React, { useState, useCallback } from 'react';
import { View, Pressable, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ScheduleTemplate } from '../../lib/models/ScheduleTemplate';
import { Plant } from '../../lib/models/Plant';
import ThemedView from '../ui/ThemedView';
import ThemedText from '../ui/ThemedText';
import { OptimizedIcon } from '../ui/OptimizedIcon';
import { TemplateApplicator } from './TemplateApplicator';
import { TemplateSharing } from './TemplateSharing';
import { useTemplateSharing } from '../../lib/hooks/useTemplateSharing';
import { triggerLightHaptic } from '../../lib/utils/haptics';

interface TemplateIntegrationProps {
  template: ScheduleTemplate;
  selectedPlants: Plant[];
  userId: string;
  onClose: () => void;
}

interface TemplateApplicationResult {
  plantId: string;
  plantName: string;
  success: boolean;
  tasksCreated: number;
  error?: string;
}

/**
 * Integration component that combines template application and sharing
 */
export const TemplateIntegration: React.FC<TemplateIntegrationProps> = ({
  template,
  selectedPlants,
  userId,
  onClose,
}) => {
  const { t } = useTranslation('templates');
  
  // State
  const [activeModal, setActiveModal] = useState<'applicator' | 'sharing' | null>(null);
  
  // Template sharing hook
  const {
    loading: sharingLoading,
    stats,
    shareTemplate,
    togglePublicStatus,
  } = useTemplateSharing(template, userId);

  // Handle template application results
  const handleApplicationResults = useCallback((results: TemplateApplicationResult[]) => {
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    
    let message = '';
    if (successCount > 0) {
      message += t('applicator.successMessage', { 
        count: successCount,
        tasks: results.reduce((sum, r) => sum + (r.success ? r.tasksCreated : 0), 0)
      });
    }
    
    if (failureCount > 0) {
      if (message) message += '\n\n';
      message += t('applicator.failureMessage', { count: failureCount });
    }

    Alert.alert(
      successCount > 0 ? t('common.success') : t('common.error'),
      message,
      [{ text: t('common.ok'), onPress: () => setActiveModal(null) }]
    );
  }, [t]);

  // Quick share action
  const handleQuickShare = useCallback(async () => {
    try {
      triggerLightHaptic();
      await shareTemplate();
    } catch (error) {
      console.error('Error sharing template:', error);
    }
  }, [shareTemplate]);

  return (
    <ThemedView className="flex-1">
      {/* Main integration interface */}
      <View className="p-4">
        <ThemedText className="text-2xl font-bold mb-2">
          {template.name}
        </ThemedText>
        
        <ThemedText className="text-neutral-600 dark:text-neutral-400 mb-6">
          {template.description || t('templates.noDescription')}
        </ThemedText>

        {/* Template stats */}
        <View className="flex-row justify-between mb-6 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
          <View className="items-center">
            <ThemedText className="text-2xl font-bold text-blue-600">
              {template.durationWeeks}
            </ThemedText>
            <ThemedText className="text-sm text-neutral-600 dark:text-neutral-400">
              {t('templates.weeks')}
            </ThemedText>
          </View>
          
          <View className="items-center">
            <ThemedText className="text-2xl font-bold text-green-600">
              {template.totalTasks}
            </ThemedText>
            <ThemedText className="text-sm text-neutral-600 dark:text-neutral-400">
              {t('templates.tasks')}
            </ThemedText>
          </View>
          
          <View className="items-center">
            <ThemedText className="text-2xl font-bold text-purple-600">
              {stats?.usageCount || 0}
            </ThemedText>
            <ThemedText className="text-sm text-neutral-600 dark:text-neutral-400">
              {t('templates.sharing.usageCount')}
            </ThemedText>
          </View>
        </View>

        {/* Action buttons */}
        <View className="space-y-3">
          {/* Apply template button */}
          <Pressable
            onPress={() => setActiveModal('applicator')}
            className="flex-row items-center p-4 bg-blue-500 rounded-lg"
          >
            <OptimizedIcon name="checkmark-circle" size={24} color="#FFFFFF" />
            <View className="ml-3 flex-1">
              <ThemedText className="text-white font-semibold">
                {t('templates.applicator.applyTemplate')}
              </ThemedText>
              <ThemedText className="text-blue-100 text-sm">
                {t('templates.applicator.applyToPlants', { count: selectedPlants.length })}
              </ThemedText>
            </View>
            <OptimizedIcon name="chevron-forward" size={20} color="#FFFFFF" />
          </Pressable>

          {/* Share template button */}
          <Pressable
            onPress={() => setActiveModal('sharing')}
            disabled={sharingLoading}
            className="flex-row items-center p-4 bg-green-500 rounded-lg"
          >
            <OptimizedIcon name="share" size={24} color="#FFFFFF" />
            <View className="ml-3 flex-1">
              <ThemedText className="text-white font-semibold">
                {t('templates.sharing.shareTemplate')}
              </ThemedText>
              <ThemedText className="text-green-100 text-sm">
                {template.isPublic 
                  ? t('templates.sharing.publicTemplate')
                  : t('templates.sharing.privateTemplate')
                }
              </ThemedText>
            </View>
            <OptimizedIcon name="chevron-forward" size={20} color="#FFFFFF" />
          </Pressable>

          {/* Quick actions */}
          <View className="flex-row space-x-3">
            <Pressable
              onPress={handleQuickShare}
              disabled={sharingLoading}
              className="flex-1 flex-row items-center justify-center p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg"
            >
              <OptimizedIcon name="send" size={20} color="#6B7280" />
              <ThemedText className="ml-2 text-neutral-700 dark:text-neutral-300">
                {t('templates.sharing.quickShare')}
              </ThemedText>
            </Pressable>
            
            <Pressable
              onPress={togglePublicStatus}
              disabled={sharingLoading}
              className="flex-1 flex-row items-center justify-center p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg"
            >
              <OptimizedIcon 
                name={template.isPublic ? "lock-closed" : "lock-closed-outline"} 
                size={20} 
                color="#6B7280" 
              />
              <ThemedText className="ml-2 text-neutral-700 dark:text-neutral-300">
                {template.isPublic 
                  ? t('templates.sharing.makePrivate')
                  : t('templates.sharing.makePublic')
                }
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Template Applicator Modal */}
      <TemplateApplicator
        template={template}
        selectedPlants={selectedPlants}
        onApply={handleApplicationResults}
        onCancel={() => setActiveModal(null)}
        visible={activeModal === 'applicator'}
      />

      {/* Template Sharing Modal */}
      <TemplateSharing
        template={template}
        onClose={() => setActiveModal(null)}
        visible={activeModal === 'sharing'}
      />
    </ThemedView>
  );
};

export default TemplateIntegration;