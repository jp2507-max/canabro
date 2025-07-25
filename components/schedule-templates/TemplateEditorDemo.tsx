import React, { useState } from 'react';
import { View, Pressable, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

import ThemedView from '../ui/ThemedView';
import ThemedText from '../ui/ThemedText';
import { TemplateEditor } from './TemplateEditor';
import { ScheduleTemplate } from '../../lib/models/ScheduleTemplate';
import { triggerLightHaptic } from '../../lib/utils/haptics';

interface TemplateEditorData {
  name: string;
  description: string;
  category: string;
  strainType?: string;
  durationWeeks: number;
  isPublic: boolean;
  templateData: any[];
}

export const TemplateEditorDemo: React.FC = () => {
  const { t } = useTranslation('templates');
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ScheduleTemplate | undefined>();

  const handleSave = (templateData: TemplateEditorData) => {
    Alert.alert(
      t('demo.saveSuccess'),
      `${t('demo.templateName')}: ${templateData.name}\n${t('demo.duration')}: ${templateData.durationWeeks} ${t('demo.weeks')}\n${t('demo.tasks')}: ${templateData.templateData.length}`,
      [
        {
          text: t('common.ok'),
          onPress: () => {
            setShowEditor(false);
            triggerLightHaptic();
          },
        },
      ]
    );
  };

  const handleCancel = () => {
    setShowEditor(false);
    triggerLightHaptic();
  };

  const handlePreview = (templateData: TemplateEditorData) => {
    Alert.alert(
      t('demo.previewTitle'),
      `${t('demo.templateName')}: ${templateData.name}\n${t('demo.category')}: ${templateData.category}\n${t('demo.duration')}: ${templateData.durationWeeks} ${t('demo.weeks')}\n${t('demo.tasks')}: ${templateData.templateData.length}\n${t('demo.public')}: ${templateData.isPublic ? t('common.yes') : t('common.no')}`,
      [{ text: t('common.ok') }]
    );
  };

  if (showEditor) {
    return (
      <TemplateEditor
        template={editingTemplate}
        onSave={handleSave}
        onCancel={handleCancel}
        onPreview={handlePreview}
      />
    );
  }

  return (
    <ThemedView className="flex-1 p-4">
      <ThemedText className="text-2xl font-bold mb-6 text-center">
        {t('demo.title')}
      </ThemedText>

      <ThemedText className="text-base text-neutral-600 dark:text-neutral-400 mb-8 text-center">
        {t('demo.description')}
      </ThemedText>

      <View className="space-y-4">
        <Pressable
          onPress={() => {
            setEditingTemplate(undefined);
            setShowEditor(true);
            triggerLightHaptic();
          }}
          className="p-4 bg-blue-500 rounded-lg"
        >
          <ThemedText className="text-white font-semibold text-center">
            {t('demo.createNew')}
          </ThemedText>
        </Pressable>

        <Pressable
          onPress={() => {
            // Create a sample template for editing
            const sampleTemplate = {
              id: 'sample-1',
              name: 'Indoor Hydroponic Schedule',
              description: 'Complete growing schedule for indoor hydroponic setup',
              category: 'hydroponic',
              strainType: 'hybrid',
              durationWeeks: 16,
              isPublic: true,
              usageCount: 42,
              templateData: [
                {
                  weekNumber: 1,
                  dayOfWeek: 0,
                  taskType: 'inspection',
                  title: 'Initial Plant Check',
                  description: 'Check seedling health and growth',
                  priority: 'medium' as const,
                  estimatedDuration: 15,
                  requiredSupplies: ['Magnifying glass', 'Notebook'],
                },
                {
                  weekNumber: 1,
                  dayOfWeek: 2,
                  taskType: 'watering',
                  title: 'First Watering',
                  description: 'Initial watering with pH-balanced water',
                  priority: 'high' as const,
                  estimatedDuration: 20,
                  requiredSupplies: ['Water', 'pH meter'],
                },
              ],
              createdAt: new Date(),
              updatedAt: new Date(),
            } as any;

            setEditingTemplate(sampleTemplate);
            setShowEditor(true);
            triggerLightHaptic();
          }}
          className="p-4 bg-green-500 rounded-lg"
        >
          <ThemedText className="text-white font-semibold text-center">
            {t('demo.editSample')}
          </ThemedText>
        </Pressable>
      </View>

      <ThemedView className="mt-8 p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
        <ThemedText className="text-sm font-medium mb-2">
          {t('demo.features')}:
        </ThemedText>
        <ThemedText className="text-sm text-neutral-600 dark:text-neutral-400">
          • {t('demo.feature1')}{'\n'}
          • {t('demo.feature2')}{'\n'}
          • {t('demo.feature3')}{'\n'}
          • {t('demo.feature4')}{'\n'}
          • {t('demo.feature5')}
        </ThemedText>
      </ThemedView>
    </ThemedView>
  );
};

export default TemplateEditorDemo;