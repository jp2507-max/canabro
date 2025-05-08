import { Ionicons } from '@expo/vector-icons';
import { withObservables } from '@nozbe/watermelondb/react';
import React from 'react';
import { TouchableOpacity, View } from 'react-native';

import { useTheme } from '../../lib/contexts/ThemeContext';
import { Plant } from '../../lib/models/Plant';
import { PlantTask } from '../../lib/models/PlantTask';
import ThemedText from '../ui/ThemedText';

export interface TaskItemProps {
  task: PlantTask;
  database?: any;
  isDarkMode?: boolean;
  onComplete?: (task: PlantTask) => void;
  onNavigate?: (plantId: string) => void;
  onPress?: () => void;
}

function TaskItemBase({
  task,
  plant,
  isDarkMode,
  onComplete,
  onNavigate,
  onPress,
}: TaskItemProps & { plant: Plant | null }) {
  const { theme } = useTheme();

  // Handle both onPress and onNavigate
  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (onNavigate) {
      onNavigate(task.plantId);
    }
  };

  // Use local theme if isDarkMode is not provided
  const { isDarkMode: themeIsDarkMode } = useTheme();
  const effectiveDarkMode = isDarkMode !== undefined ? isDarkMode : themeIsDarkMode;

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={{
        backgroundColor: effectiveDarkMode ? theme.colors.neutral[800] : theme.colors.neutral[100],
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 2,
        elevation: 1,
      }}
      accessibilityRole="button"
      accessibilityLabel={`Open task for ${plant?.name || 'plant'}`}>
      <Ionicons
        name="leaf"
        size={24}
        color={theme.colors.primary[500]}
        style={{ marginRight: 12 }}
      />
      <View style={{ flex: 1 }}>
        <ThemedText style={{ fontWeight: 'bold', fontSize: 16 }}>{task.title}</ThemedText>
        <ThemedText style={{ color: theme.colors.neutral[500], fontSize: 13 }}>
          {plant?.name || 'Plant'}
        </ThemedText>
      </View>
      {onComplete && (
        <TouchableOpacity
          onPress={() => onComplete(task)}
          style={{ marginLeft: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Mark task as completed">
          <Ionicons name="checkmark-circle" size={28} color={theme.colors.primary[400]} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

// Export a properly typed version of the component
const TaskItem = withObservables(
  ['task'],
  ({ task, database, isDarkMode, onComplete, onNavigate, onPress }: TaskItemProps) => ({
    plant: task.plant,
    task,
    database,
    isDarkMode,
    onComplete,
    onNavigate,
    onPress,
  })
)(TaskItemBase);

export default React.memo(TaskItem);
