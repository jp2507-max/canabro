import React, { useState } from 'react';
import { View, Modal, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';

import ThemedView from '../ui/ThemedView';
import ThemedText from '../ui/ThemedText';
import { OptimizedIcon } from '../ui/OptimizedIcon';
import { TemplateLibrary } from './TemplateLibrary';
import { TemplateTimelinePreview } from './TemplateTimelinePreview';
import { ScheduleTemplate } from '../../lib/models/ScheduleTemplate';
import { triggerLightHaptic } from '../../lib/utils/haptics';

/**
 * Demo component to showcase the TemplateLibrary functionality
 * This can be used for testing and integration purposes
 */
export const TemplateLibraryDemo: React.FC = () => {
  const { t } = useTranslation('templates');
  const [selectedTemplate, setSelectedTemplate] = useState<ScheduleTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<ScheduleTemplate | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const handleTemplateSelect = async (template: ScheduleTemplate) => {
    await triggerLightHaptic();
    setSelectedTemplate(template);
    console.log('Template selected:', template.name);
  };

  const handleTemplatePreview = async (template: ScheduleTemplate) => {
    await triggerLightHaptic();
    setPreviewTemplate(template);
    setShowPreview(true);
  };

  const handleClosePreview = async () => {
    await triggerLightHaptic();
    setShowPreview(false);
    setPreviewTemplate(null);
  };

  return (
    <ThemedView className="flex-1">
      {/* Header */}
      <View className="p-4 border-b border-neutral-200 dark:border-neutral-700">
        <ThemedText className="text-2xl font-bold mb-2">{t('demo.title')}</ThemedText>
        <ThemedText className="text-sm text-neutral-600 dark:text-neutral-400">
          {t('demo.description')}
        </ThemedText>
        
        {selectedTemplate && (
          <View className="mt-3 p-3 bg-blue-50 dark:bg-blue-900 rounded-lg">
            <ThemedText className="text-sm font-medium text-blue-800 dark:text-blue-200">
              {t('demo.selected')}: {selectedTemplate.name}
            </ThemedText>
            <ThemedText className="text-xs text-blue-600 dark:text-blue-300">
              {selectedTemplate.durationWeeks} {t('demo.weeks')} • {selectedTemplate.totalTasks} {t('demo.tasks')}
            </ThemedText>
          </View>
        )}
      </View>

      {/* Template Library */}
      <TemplateLibrary
        onTemplateSelect={handleTemplateSelect}
        onTemplatePreview={handleTemplatePreview}
        selectedTemplateId={selectedTemplate?.id}
        showOnlyPublic={true}
      />

      {/* Preview Modal */}
      <Modal
        visible={showPreview}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleClosePreview}
      >
        <ThemedView className="flex-1">
          {/* Modal Header */}
          <View className="flex-row items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
            <ThemedText className="text-lg font-semibold">{t('demo.previewTitle')}</ThemedText>
            <Pressable
              onPress={handleClosePreview}
              className="w-8 h-8 items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-700"
            >
              <OptimizedIcon name="close" size={20} color="#6B7280" />
            </Pressable>
          </View>

          {/* Timeline Preview */}
          {previewTemplate && (
            <TemplateTimelinePreview
              template={previewTemplate}
              maxWeeksToShow={6}
              showTaskDetails={false}
            />
          )}
        </ThemedView>
      </Modal>
    </ThemedView>
  );
};

export default TemplateLibraryDemo;