import React, { useState, useCallback, useEffect } from 'react';
import { View, ScrollView, Pressable, Alert, Share, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  cancelAnimation,
  FadeInDown,
  FadeOutUp,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { FlashListWrapper } from '../ui/FlashListWrapper';
import ThemedView from '../ui/ThemedView';
import ThemedText from '../ui/ThemedText';
import { OptimizedIcon, IconSVG } from '../ui/OptimizedIcon';
// import NetworkResilientImage from '../ui/NetworkResilientImage'; // Removed unused import
import { ScheduleTemplate, TemplateTaskData } from '../../lib/models/ScheduleTemplate';
import { SPRING_CONFIGS, SCALE_VALUES } from '../../lib/constants/animations';
import { triggerLightHaptic, triggerMediumHaptic, triggerHeavyHaptic } from '../../lib/utils/haptics';
import { useDatabase } from '../../lib/hooks/useDatabase';
import { generateUuid } from '../../lib/utils/uuid';
import { format } from '../../lib/utils/date';

interface TemplateSharingProps {
  template: ScheduleTemplate;
  onClose: () => void;
  visible: boolean;
}

interface TemplateExportData {
  version: string;
  template: {
    name: string;
    description?: string;
    category: string;
    strainType?: string;
    durationWeeks: number;
    templateData: TemplateTaskData[];
  };
  metadata: {
    exportedAt: string;
    exportedBy: string;
    appVersion: string;
  };
}

interface TemplateVersion {
  id: string;
  version: string;
  changes: string;
  createdAt: Date;
  templateData: TemplateTaskData[];
}

// Template export/import validation
const validateTemplateData = (data: any): boolean => {
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
};

// Template version comparison
const compareTemplateVersions = (v1: TemplateTaskData[], v2: TemplateTaskData[]): string[] => {
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
};

// Share action card component
const ShareActionCard: React.FC<{
  icon: keyof typeof IconSVG;
  title: string;
  description: string;
  onPress: () => void;
  disabled?: boolean;
}> = React.memo(({ icon, title, description, onPress, disabled = false }) => {
  const scale = useSharedValue(1);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: disabled ? 0.5 : 1,
  }));
  
  const tapGesture = Gesture.Tap()
    .enabled(!disabled)
    .onBegin(() => {
      'worklet';
      scale.value = withSpring(SCALE_VALUES.cardPress, SPRING_CONFIGS.card);
    })
    .onEnd(() => {
      'worklet';
      scale.value = withSpring(1, SPRING_CONFIGS.card);
      runOnJS(triggerLightHaptic)();
      runOnJS(onPress)();
    });

  useEffect(() => {
    return () => {
      cancelAnimation(scale);
    };
  }, []);

  return (
    <GestureDetector gesture={tapGesture}>
      <Animated.View style={animatedStyle}>
        <ThemedView
          variant="card"
          className="p-4 mb-3 flex-row items-center"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowRadius: 2,
            elevation: 1,
          }}
        >
          <View className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 items-center justify-center mr-4">
            <OptimizedIcon name={icon} size={24} color="#3B82F6" />
          </View>
          
          <View className="flex-1">
            <ThemedText className="text-base font-semibold mb-1">
              {title}
            </ThemedText>
            <ThemedText className="text-sm text-neutral-600 dark:text-neutral-400">
              {description}
            </ThemedText>
          </View>
          
          <OptimizedIcon name="chevron-forward" size={20} color="#6B7280" />
        </ThemedView>
      </Animated.View>
    </GestureDetector>
  );
});

// Version history item component
const VersionHistoryItem: React.FC<{
  version: TemplateVersion;
  isLatest: boolean;
  onRestore?: (version: TemplateVersion) => void;
}> = React.memo(({ version, isLatest, onRestore }) => {
  const { t } = useTranslation('templates');

  return (
    <ThemedView className="p-4 mb-3 border border-neutral-200 dark:border-neutral-700 rounded-lg">
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center">
          <ThemedText className="text-base font-semibold mr-2">
            v{version.version}
          </ThemedText>
          {isLatest && (
            <View className="px-2 py-1 bg-green-100 dark:bg-green-900 rounded">
              <ThemedText className="text-xs text-green-800 dark:text-green-200">
                {t('sharing.current')}
              </ThemedText>
            </View>
          )}
        </View>
        <ThemedText className="text-sm text-neutral-600 dark:text-neutral-400">
          {format(version.createdAt, 'MMM dd, yyyy')}
        </ThemedText>
      </View>
      
      <ThemedText className="text-sm text-neutral-700 dark:text-neutral-300 mb-3">
        {version.changes}
      </ThemedText>
      
      <View className="flex-row items-center justify-between">
        <ThemedText className="text-xs text-neutral-500 dark:text-neutral-500">
          {version.templateData.length} tasks
        </ThemedText>
        
        {!isLatest && onRestore && (
          <Pressable
            onPress={() => onRestore(version)}
            className="px-3 py-1 bg-blue-100 dark:bg-blue-900 rounded"
          >
            <ThemedText className="text-xs text-blue-800 dark:text-blue-200">
              {t('sharing.restore')}
            </ThemedText>
          </Pressable>
        )}
      </View>
    </ThemedView>
  );
});

// Main TemplateSharing component
export const TemplateSharing: React.FC<TemplateSharingProps> = ({
  template,
  onClose,
  visible,
}) => {
  const { t } = useTranslation('templates');
  const { database } = useDatabase();

  // State
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'share' | 'versions'>('share');
  const [versions, setVersions] = useState<TemplateVersion[]>([]);
  const [importData, setImportData] = useState('');
  const [showImport, setShowImport] = useState(false);

  // Load version history
  const loadVersionHistory = useCallback(async () => {
    try {
      // In a real implementation, this would load from a versions table
      // For now, we'll create a mock version history
      const mockVersions: TemplateVersion[] = [
        {
          id: generateUuid(),
          version: '1.0',
          changes: 'Initial template creation',
          createdAt: new Date(template.createdAt),
          templateData: template.templateData,
        },
      ];
      
      setVersions(mockVersions);
    } catch (error) {
      console.error('Error loading version history:', error);
    }
  }, [template]);

  // Export template to JSON
  const handleExportTemplate = useCallback(async () => {
    try {
      setLoading(true);
      triggerLightHaptic();

      const exportData: TemplateExportData = {
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
          appVersion: '1.0.0', // This would come from app config
        },
      };

      const jsonString = JSON.stringify(exportData, null, 2);
      
      await Share.share({
        message: jsonString,
        title: `${template.name} - Schedule Template`,
      });

    } catch (error) {
      console.error('Error exporting template:', error);
      triggerHeavyHaptic();
      Alert.alert(
        t('common.error'),
        t('sharing.exportError')
      );
    } finally {
      setLoading(false);
    }
  }, [template, t]);

  // Share template link
  const handleShareLink = useCallback(async () => {
    try {
      setLoading(true);
      triggerLightHaptic();

      // In a real implementation, this would generate a shareable link
      const shareUrl = `https://canabro.app/templates/${template.id}`;
      
      await Share.share({
        message: `Check out this plant care template: ${template.name}\n\n${shareUrl}`,
        title: template.name,
        url: shareUrl,
      });

    } catch (error) {
      console.error('Error sharing link:', error);
      triggerHeavyHaptic();
      Alert.alert(
        t('common.error'),
        t('sharing.shareError')
      );
    } finally {
      setLoading(false);
    }
  }, [template, t]);

  // Import template from JSON
  const handleImportTemplate = useCallback(async () => {
    if (!importData.trim()) {
      Alert.alert(
        t('sharing.importError'),
        t('sharing.emptyImportData')
      );
      return;
    }

    try {
      setLoading(true);
      triggerLightHaptic();

      const parsedData = JSON.parse(importData);
      
      if (!validateTemplateData(parsedData)) {
        throw new Error('Invalid template format');
      }

      // Create new template from imported data
      await database.write(async () => {
        await database.get<ScheduleTemplate>('schedule_templates').create(newTemplate => {
          newTemplate.name = `${parsedData.template.name} (Imported)`;
          newTemplate.description = parsedData.template.description;
          newTemplate.category = parsedData.template.category;
          newTemplate.strainType = parsedData.template.strainType;
          newTemplate.durationWeeks = parsedData.template.durationWeeks;
          newTemplate.createdBy = template.createdBy; // Current user
          newTemplate.isPublic = false; // Imported templates are private by default
          newTemplate.usageCount = 0;
          newTemplate.templateData = parsedData.template.templateData;
        });
      });

      triggerMediumHaptic();
      Alert.alert(
        t('sharing.importSuccess'),
        t('sharing.importSuccessMessage'),
        [{ text: t('common.ok'), onPress: onClose }]
      );

    } catch (error) {
      console.error('Error importing template:', error);
      triggerHeavyHaptic();
      Alert.alert(
        t('sharing.importError'),
        t('sharing.invalidImportData')
      );
    } finally {
      setLoading(false);
      setImportData('');
      setShowImport(false);
    }
  }, [importData, database, template.createdBy, t, onClose]);

  // Toggle template public/private
  const handleTogglePublic = useCallback(async () => {
    try {
      setLoading(true);
      triggerLightHaptic();

      await template.togglePublic();
      
      triggerMediumHaptic();
      Alert.alert(
        t('sharing.visibilityChanged'),
        template.isPublic 
          ? t('sharing.nowPrivate')
          : t('sharing.nowPublic')
      );

    } catch (error) {
      console.error('Error toggling template visibility:', error);
      triggerHeavyHaptic();
      Alert.alert(
        t('common.error'),
        t('sharing.visibilityError')
      );
    } finally {
      setLoading(false);
    }
  }, [template, t]);

  // Restore version
  const handleRestoreVersion = useCallback(async (version: TemplateVersion) => {
    Alert.alert(
      t('sharing.restoreVersion'),
      t('sharing.restoreVersionConfirm', { version: version.version }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('sharing.restore'),
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              triggerLightHaptic();

              // Create new version entry for current state
              const currentChanges = compareTemplateVersions(template.templateData, version.templateData);
              const newVersion: TemplateVersion = {
                id: generateUuid(),
                version: (parseFloat(versions[0]?.version || '1.0') + 0.1).toFixed(1),
                changes: `Restored from v${version.version}. Changes: ${currentChanges.join(', ')}`,
                createdAt: new Date(),
                templateData: version.templateData,
              };

              // Update template with restored data
              await template.updateTemplateData(version.templateData);
              
              // Add to version history
              setVersions(prev => [newVersion, ...prev]);

              triggerMediumHaptic();
              Alert.alert(
                t('sharing.restoreSuccess'),
                t('sharing.restoreSuccessMessage', { version: version.version })
              );

            } catch (error) {
              console.error('Error restoring version:', error);
              triggerHeavyHaptic();
              Alert.alert(
                t('common.error'),
                t('sharing.restoreError')
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  }, [template, versions, t]);

  // Load data on mount
  useEffect(() => {
    if (visible) {
      loadVersionHistory();
    }
  }, [visible, loadVersionHistory]);

  if (!visible) return null;

  return (
    <ThemedView className="flex-1 bg-black/50">
      <ThemedView className="flex-1 mt-20 bg-white dark:bg-neutral-900 rounded-t-3xl">
        {/* Header */}
        <View className="p-4 border-b border-neutral-200 dark:border-neutral-700">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <ThemedText className="text-xl font-bold mb-1">
                {t('sharing.shareTemplate')}
              </ThemedText>
              <ThemedText className="text-sm text-neutral-600 dark:text-neutral-400">
                {template.name}
              </ThemedText>
            </View>
            <Pressable
              onPress={onClose}
              testID="template-sharing-close-button"
              className="w-8 h-8 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800"
            >
              <OptimizedIcon name="close" size={20} color="#6B7280" />
            </Pressable>
          </View>

          {/* Tab selector */}
          <View className="flex-row mt-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1">
            <Pressable
              onPress={() => setActiveTab('share')}
              className={`flex-1 py-2 px-4 rounded-md ${
                activeTab === 'share' 
                  ? 'bg-white dark:bg-neutral-700' 
                  : ''
              }`}
            >
              <ThemedText className={`text-center text-sm font-medium ${
                activeTab === 'share' 
                  ? 'text-neutral-900 dark:text-neutral-100' 
                  : 'text-neutral-600 dark:text-neutral-400'
              }`}>
                {t('sharing.share')}
              </ThemedText>
            </Pressable>
            
            <Pressable
              onPress={() => setActiveTab('versions')}
              className={`flex-1 py-2 px-4 rounded-md ${
                activeTab === 'versions' 
                  ? 'bg-white dark:bg-neutral-700' 
                  : ''
              }`}
            >
              <ThemedText className={`text-center text-sm font-medium ${
                activeTab === 'versions' 
                  ? 'text-neutral-900 dark:text-neutral-100' 
                  : 'text-neutral-600 dark:text-neutral-400'
              }`}>
                {t('sharing.versions')}
              </ThemedText>
            </Pressable>
          </View>
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {activeTab === 'share' ? (
            <View className="p-4">
              {/* Share actions */}
              <ShareActionCard
                icon="share"
                title={t('sharing.shareLink')}
                description={t('sharing.shareLinkDescription')}
                onPress={handleShareLink}
                disabled={loading}
              />

              <ShareActionCard
                icon="send"
                title={t('sharing.exportTemplate')}
                description={t('sharing.exportDescription')}
                onPress={handleExportTemplate}
                disabled={loading}
              />

              <ShareActionCard
                icon="add"
                title={t('sharing.importTemplate')}
                description={t('sharing.importDescription')}
                onPress={() => setShowImport(true)}
                disabled={loading}
              />

              <ShareActionCard
                icon={template.isPublic ? "lock-closed" : "lock-closed-outline"}
                title={template.isPublic ? t('sharing.makePrivate') : t('sharing.makePublic')}
                description={template.isPublic ? t('sharing.makePrivateDescription') : t('sharing.makePublicDescription')}
                onPress={handleTogglePublic}
                disabled={loading}
              />

              {/* Template info */}
              <ThemedView className="mt-6 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                <ThemedText className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  {t('sharing.templateInfo')}
                </ThemedText>
                
                <View className="space-y-2">
                  <View className="flex-row justify-between">
                    <ThemedText className="text-sm text-neutral-600 dark:text-neutral-400">
                      {t('sharing.category')}
                    </ThemedText>
                    <ThemedText className="text-sm text-neutral-900 dark:text-neutral-100">
                      {template.category}
                    </ThemedText>
                  </View>
                  
                  <View className="flex-row justify-between">
                    <ThemedText className="text-sm text-neutral-600 dark:text-neutral-400">
                      {t('sharing.duration')}
                    </ThemedText>
                    <ThemedText className="text-sm text-neutral-900 dark:text-neutral-100">
                      {template.durationWeeks} {t('sharing.weeks')}
                    </ThemedText>
                  </View>
                  
                  <View className="flex-row justify-between">
                    <ThemedText className="text-sm text-neutral-600 dark:text-neutral-400">
                      {t('sharing.tasks')}
                    </ThemedText>
                    <ThemedText className="text-sm text-neutral-900 dark:text-neutral-100">
                      {template.totalTasks}
                    </ThemedText>
                  </View>
                  
                  <View className="flex-row justify-between">
                    <ThemedText className="text-sm text-neutral-600 dark:text-neutral-400">
                      {t('sharing.usageCount')}
                    </ThemedText>
                    <ThemedText className="text-sm text-neutral-900 dark:text-neutral-100">
                      {template.usageCount}
                    </ThemedText>
                  </View>
                </View>
              </ThemedView>

              {/* Import modal */}
              {showImport && (
                <Animated.View
                  entering={FadeInDown.duration(300)}
                  exiting={FadeOutUp.duration(200)}
                  className="mt-6 p-4 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700"
                >
                  <ThemedText className="text-lg font-semibold mb-3">
                    {t('sharing.importTemplate')}
                  </ThemedText>
                  
                  <ThemedText className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
                    {t('sharing.pasteTemplateData')}
                  </ThemedText>
                  
                  <TextInput
                    value={importData}
                    onChangeText={setImportData}
                    placeholder={t('sharing.pasteHere')}
                    multiline
                    numberOfLines={6}
                    className="p-3 bg-neutral-100 dark:bg-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 mb-4"
                    style={{ textAlignVertical: 'top' }}
                  />
                  
                  <View className="flex-row space-x-3">
                    <Pressable
                      onPress={() => {
                        setShowImport(false);
                        setImportData('');
                      }}
                      className="flex-1 py-3 px-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg items-center"
                    >
                      <ThemedText className="font-medium text-neutral-700 dark:text-neutral-300">
                        {t('common.cancel')}
                      </ThemedText>
                    </Pressable>
                    
                    <Pressable
                      onPress={handleImportTemplate}
                      disabled={loading || !importData.trim()}
                      className={`flex-1 py-3 px-4 rounded-lg items-center ${
                        loading || !importData.trim()
                          ? 'bg-neutral-300 dark:bg-neutral-700'
                          : 'bg-blue-500'
                      }`}
                    >
                      <ThemedText className="font-medium text-white">
                        {loading ? t('sharing.importing') : t('sharing.import')}
                      </ThemedText>
                    </Pressable>
                  </View>
                </Animated.View>
              )}
            </View>
          ) : (
            <View className="p-4">
              <ThemedText className="text-lg font-semibold mb-4">
                {t('sharing.versionHistory')}
              </ThemedText>
              
              {versions.length > 0 ? (
                <FlashListWrapper
                  data={versions}
                  renderItem={({ item, index }) => (
                    <VersionHistoryItem
                      version={item}
                      isLatest={index === 0}
                      onRestore={handleRestoreVersion}
                    />
                  )}
                  scrollEnabled={false}
                />
              ) : (
                <ThemedView className="p-8 items-center">
                  <OptimizedIcon name="calendar" size={48} color="#6B7280" />
                  <ThemedText className="text-neutral-600 dark:text-neutral-400 mt-4 text-center">
                    {t('sharing.noVersionHistory')}
                  </ThemedText>
                </ThemedView>
              )}
            </View>
          )}
        </ScrollView>
      </ThemedView>
    </ThemedView>
  );
};

export default TemplateSharing;