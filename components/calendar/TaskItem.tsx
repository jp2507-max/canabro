import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { withObservables } from '@nozbe/watermelondb/react';
import { Plant } from '../../lib/models/Plant';
import { PlantTask } from '../../lib/models/PlantTask';
import { useTheme } from '../../lib/contexts/ThemeContext';
import ThemedText from '../ui/ThemedText';

export interface TaskItemProps {
  task: PlantTask;
  database: any;
  isDarkMode: boolean;
  onComplete: (task: PlantTask) => void;
  onNavigate: (plantId: string) => void;
}

function TaskItemBase({ task, plant, isDarkMode, onComplete, onNavigate }: TaskItemProps & { plant: Plant | null }) {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      onPress={() => onNavigate(task.plantId)}
      style={{
        backgroundColor: isDarkMode ? theme.colors.neutral[800] : theme.colors.neutral[100],
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
      accessibilityLabel={`Open task for ${plant?.name || 'plant'}`}
    >
      <Ionicons name="leaf" size={24} color={theme.colors.primary[500]} style={{ marginRight: 12 }} />
      <View style={{ flex: 1 }}>
        <ThemedText style={{ fontWeight: 'bold', fontSize: 16 }}>{task.title}</ThemedText>
        <ThemedText style={{ color: theme.colors.neutral[500], fontSize: 13 }}>{plant?.name || 'Plant'}</ThemedText>
      </View>
      <TouchableOpacity
        onPress={() => onComplete(task)}
        style={{ marginLeft: 8 }}
        accessibilityRole="button"
        accessibilityLabel="Mark task as completed"
      >
        <Ionicons name="checkmark-circle" size={28} color={theme.colors.primary[400]} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const TaskItem = withObservables(
  ['task'],
  ({ task }: { task: PlantTask }) => ({ plant: task.plant })
)(TaskItemBase);

export default React.memo(TaskItem);
