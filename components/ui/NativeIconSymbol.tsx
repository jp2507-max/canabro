import React from 'react';
import { Platform } from 'react-native';
import { SymbolView, SymbolWeight, SymbolScale } from 'expo-symbols';
import { OptimizedIcon, type IconName } from './OptimizedIcon';

// Mapping from our icon names to SF Symbol names
const SF_SYMBOL_MAP: Record<string, string> = {
  'camera-outline': 'camera',
  'camera': 'camera.fill',
  'images-outline': 'photo.on.rectangle',
  'images': 'photo.fill.on.rectangle.fill',
  'calendar-outline': 'calendar',
  'calendar': 'calendar.badge.plus',
  'layers-outline': 'square.stack',
  'layers': 'square.stack.3d.up',
  'at-outline': 'at',
  'at': 'at.circle.fill',
  'close': 'xmark',
  'close-outline': 'xmark',
  'chevron-down': 'chevron.down',
  'checkmark': 'checkmark',
  'globe-outline': 'globe',
  'people-outline': 'person.2',
  'lock-closed-outline': 'lock',
};

export interface NativeIconSymbolProps {
  name: IconName | string;
  size?: number;
  className?: string;
  weight?: SymbolWeight;
  scale?: SymbolScale;
  fallbackSize?: number;
  tintColor?: string;
}

/**
 * Native Icon Symbol component that uses SF Symbols on iOS
 * and falls back to OptimizedIcon on Android
 */
export function NativeIconSymbol({
  name,
  size = 24,
  className = '',
  weight = 'regular',
  scale = 'default',
  fallbackSize,
  tintColor,
}: NativeIconSymbolProps) {
  // On iOS, use SF Symbols
  if (Platform.OS === 'ios') {
    const symbolName = SF_SYMBOL_MAP[name] || name;
    
    try {
      return (
        <SymbolView
          name={symbolName as Parameters<typeof SymbolView>[0]['name']} // Type assertion to handle dynamic symbol names
          size={size}
          type="hierarchical"
          weight={weight}
          scale={scale}
          tintColor={tintColor}
          style={{
            width: size,
            height: size,
          }}
          fallback={
            <OptimizedIcon 
              name={name as IconName} 
              size={fallbackSize || size} 
              className={className}
            />
          }
        />
      );
    } catch (_error) {
      // If SF Symbol fails, fall back to OptimizedIcon
      console.warn(`SF Symbol "${symbolName}" not found, falling back to OptimizedIcon`);
      return (
        <OptimizedIcon 
          name={name as IconName} 
          size={fallbackSize || size} 
          className={className}
        />
      );
    }
  }

  // On Android, fall back to OptimizedIcon
  return (
    <OptimizedIcon 
      name={name as IconName} 
      size={fallbackSize || size} 
      className={className}
    />
  );
}

// Export types for convenience
export type { SymbolWeight, SymbolScale } from 'expo-symbols'; 