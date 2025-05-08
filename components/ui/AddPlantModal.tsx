import React from 'react';
import { Modal, ScrollView, View, TouchableOpacity } from 'react-native';
import { BlurView as ExpoBlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/contexts/ThemeContext';
import ThemedView from './ThemedView';
import ThemedText from './ThemedText';
import { AddPlantForm } from '../AddPlantForm';

interface AddPlantModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddPlantModal({ visible, onClose, onSuccess }: AddPlantModalProps) {
  const { theme, isDarkMode } = useTheme();
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <ExpoBlurView
        intensity={10}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <ThemedView
        className="mt-20 flex-1 overflow-hidden rounded-t-3xl"
        lightClassName="bg-white"
        darkClassName="bg-neutral-900"
      >
        <View
          className="flex-row items-center justify-between border-b p-4"
          style={{
            borderColor: isDarkMode ? theme.colors.neutral[800] : theme.colors.neutral[200],
          }}
        >
          <ThemedText
            className="text-xl font-bold"
            lightClassName="text-neutral-800"
            darkClassName="text-white"
          >
            Add New Plant
          </ThemedText>
          <TouchableOpacity onPress={onClose}>
            <Ionicons
              name="close"
              size={24}
              color={isDarkMode ? theme.colors.neutral[400] : theme.colors.neutral[500]}
            />
          </TouchableOpacity>
        </View>
        <ScrollView className="flex-1 p-4">
          <AddPlantForm onSuccess={onSuccess} />
        </ScrollView>
      </ThemedView>
    </Modal>
  );
}

export default AddPlantModal;
