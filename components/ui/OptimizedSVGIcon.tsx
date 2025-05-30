import React from 'react';
import { View, Text } from 'react-native';

// Ultra-lightweight icons using CSS-like shapes and Unicode
interface UltraLightIconProps {
  name: 'add' | 'close' | 'heart' | 'check' | 'leaf' | 'flower' | 'tag';
  size?: number;
  color?: string;
  style?: any;
}

/**
 * Ultra-lightweight icon component using CSS-like shapes and Unicode
 * Zero external dependencies, minimal bundle impact
 * Replaces @expo/vector-icons to save ~4.5MB bundle size
 */
export function UltraLightIcon({ 
  name, 
  size = 24, 
  color = '#000', 
  style 
}: UltraLightIconProps) {
  const iconStyle = {
    width: size,
    height: size,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };

  const renderIcon = () => {
    switch (name) {
      case 'add':
        return (
          <View style={iconStyle}>
            <View style={{
              width: size * 0.7,
              height: 2,
              backgroundColor: color,
              position: 'absolute',
            }} />
            <View style={{
              width: 2,
              height: size * 0.7,
              backgroundColor: color,
              position: 'absolute',
            }} />
          </View>
        );
      
      case 'close':
        return (
          <View style={iconStyle}>
            <View style={{
              width: size * 0.7,
              height: 2,
              backgroundColor: color,
              position: 'absolute',
              transform: [{ rotate: '45deg' }],
            }} />
            <View style={{
              width: size * 0.7,
              height: 2,
              backgroundColor: color,
              position: 'absolute',
              transform: [{ rotate: '-45deg' }],
            }} />
          </View>
        );
        case 'heart':
        return (
          <View style={iconStyle}>
            <View style={{
              width: size * 0.7,
              height: size * 0.6,
              backgroundColor: color,
              borderTopLeftRadius: size * 0.35,
              borderTopRightRadius: size * 0.35,
              transform: [{ rotate: '45deg' }],
            }} />
            <View style={{
              width: size * 0.5,
              height: size * 0.5,
              backgroundColor: color,
              borderRadius: size * 0.25,
              position: 'absolute',
              left: size * 0.1,
              top: size * 0.05,
            }} />
            <View style={{
              width: size * 0.5,
              height: size * 0.5,
              backgroundColor: color,
              borderRadius: size * 0.25,
              position: 'absolute',
              right: size * 0.1,
              top: size * 0.05,
            }} />
          </View>
        );
      
      case 'check':
        return (
          <Text style={{ 
            fontSize: size * 0.8, 
            color, 
            textAlign: 'center',
            lineHeight: size,
            fontWeight: 'bold'
          }}>
            ✓
          </Text>
        );
        case 'leaf':
        return (
          <View style={iconStyle}>
            <View style={{
              width: size * 0.7,
              height: size * 0.7,
              backgroundColor: color,
              borderTopRightRadius: size * 0.7,
              borderBottomLeftRadius: size * 0.7,
              transform: [{ rotate: '-45deg' }],
            }} />
            <View style={{
              width: size * 0.35,
              height: size * 0.5,
              backgroundColor: color,
              borderTopRightRadius: size * 0.35,
              borderBottomLeftRadius: size * 0.35,
              position: 'absolute',
              left: size * 0.25,
              top: size * 0.15,
              transform: [{ rotate: '-45deg' }],
              opacity: 0.7,
            }} />
            <View style={{
              width: size * 0.4,
              height: size * 0.08,
              backgroundColor: color,
              position: 'absolute',
              bottom: size * 0.1,
              left: size * 0.3,
              transform: [{ rotate: '45deg' }],
            }} />
          </View>
        );
        case 'flower':
        return (
          <View style={iconStyle}>
            <View style={{
              width: size * 0.3,
              height: size * 0.3,
              backgroundColor: color,
              borderRadius: size * 0.15,
              position: 'absolute',
              top: size * 0.35,
              left: size * 0.35,
            }} />
            {/* Petals */}
            {[0, 1, 2, 3, 4].map((i) => (
              <View 
                key={i}
                style={{
                  width: size * 0.25,
                  height: size * 0.4,
                  backgroundColor: color,
                  borderRadius: size * 0.2,
                  position: 'absolute',
                  top: size * 0.3,
                  left: size * 0.375,
                  transform: [
                    { translateX: -size * 0.125 },
                    { translateY: -size * 0.2 },
                    { rotate: `${i * 72}deg` },
                    { translateY: -size * 0.25 },
                  ],
                }}
              />
            ))}
          </View>
        );
        case 'tag':
        return (
          <View style={iconStyle}>
            <View style={{
              width: size * 0.65,
              height: size * 0.5,
              backgroundColor: color,
              borderRadius: size * 0.1,
              transform: [{ skewX: '-10deg' }]
            }} />
            <View style={{
              width: size * 0.12,
              height: size * 0.12,
              backgroundColor: 'white',
              borderRadius: size * 0.06,
              position: 'absolute',
              left: size * 0.15,
              top: size * 0.19,
            }} />
            <View style={{
              width: size * 0.2,
              height: size * 0.15,
              backgroundColor: color,
              position: 'absolute',
              left: size * 0.5,
              top: size * 0.05,
              borderRightWidth: size * 0.15,
              borderRightColor: 'transparent',
              borderBottomWidth: size * 0.15,
              borderBottomColor: color,
              transform: [{ rotate: '315deg' }],
            }} />
          </View>
        );
      
      default:
        return (
          <View style={{
            width: size * 0.3,
            height: size * 0.3,
            borderRadius: (size * 0.3) / 2,
            backgroundColor: color,
          }} />
        );
    }
  };

  return (
    <View style={[iconStyle, style]}>
      {renderIcon()}
    </View>
  );
}

export type { UltraLightIconProps };
