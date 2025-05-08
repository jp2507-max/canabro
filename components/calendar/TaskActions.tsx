import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, View, TouchableOpacity } from 'react-native';

import { useTheme } from '../../lib/contexts/ThemeContext';
import ThemedText from '../ui/ThemedText';

export interface TaskActionsProps {
  visible: boolean;
  onClose: () => void;
  navigateToAddTaskPlant: () => void;
  navigateToAddTaskAll: () => void;
}

function TaskActions({
  visible,
  onClose,
  navigateToAddTaskPlant,
  navigateToAddTaskAll,
}: TaskActionsProps) {
  const { theme, isDarkMode } = useTheme();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      accessibilityViewIsModal>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.3)' }}>
        <View
          style={{
            backgroundColor: isDarkMode ? theme.colors.neutral[900] : theme.colors.neutral[50],
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            padding: 24,
            minHeight: 180,
          }}>
          <ThemedText style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 16 }}>
            Task Actions
          </ThemedText>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}
            onPress={navigateToAddTaskPlant}
            accessibilityRole="button"
            accessibilityLabel="Add task to plant">
            <Ionicons
              name="leaf"
              size={22}
              color={theme.colors.primary[500]}
              style={{ marginRight: 10 }}
            />
            <ThemedText>Add Task to Plant</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center' }}
            onPress={navigateToAddTaskAll}
            accessibilityRole="button"
            accessibilityLabel="Add task to all plants">
            <Ionicons
              name="layers-outline"
              size={22}
              color={theme.colors.primary[500]}
              style={{ marginRight: 10 }}
            />
            <ThemedText>Add Task to All Plants</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ position: 'absolute', top: 12, right: 12 }}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close task actions">
            <Ionicons name="close" size={24} color={theme.colors.neutral[400]} />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default React.memo(TaskActions);
