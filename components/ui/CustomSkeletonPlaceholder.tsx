import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';

interface SkeletonItemProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  marginBottom?: number;
  aspectRatio?: number;
  style?: ViewStyle;
}

interface CustomSkeletonPlaceholderProps {
  backgroundColor?: string;
  highlightColor?: string;
  speed?: number;
  children: React.ReactNode;
}

const CustomSkeletonPlaceholder: React.FC<CustomSkeletonPlaceholderProps> & {
  Item: React.FC<SkeletonItemProps>;
} = ({
  backgroundColor = '#E1E9EE',
  highlightColor = '#F2F8FC',
  speed = 800,
  children,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loopAnimation = () => {
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: speed,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: speed,
          useNativeDriver: true,
        }),
      ]).start(loopAnimation);
    };

    loopAnimation();

    return () => {
      animatedValue.stopAnimation();
    };
  }, [animatedValue, speed]);

  // Wrap children with Animated.View for the effect
  const childrenWithAnimation = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      // Get the original style from the child, default to empty object if none
      const originalStyle = (child.props.style || {}) as ViewStyle;

      // Apply background color to the wrapper, but keep original child style
      return (
        <Animated.View
          style={[
            originalStyle, // Apply original layout styles to the wrapper
            {
              backgroundColor, // Apply background color here
              opacity: animatedValue.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0.6, 1, 0.6], // Fade effect
              }),
            },
          ]}
        >
          {/* Render the original child without modifying its props directly */}
          {React.cloneElement(child, {
            ...child.props,
            style: { ...originalStyle, backgroundColor: 'transparent' }, // Ensure original child background is transparent
          })}
        </Animated.View>
      );
    }
    return child;
  });

  return <View>{childrenWithAnimation}</View>; // Removed flex: 1 as it might interfere depending on usage
};

const SkeletonItem: React.FC<SkeletonItemProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  marginBottom = 0,
  aspectRatio,
  style,
}) => {
  return (
    <View
      style={[
        {
          width: width,
          height: height,
          borderRadius,
          marginBottom,
          aspectRatio,
        } as ViewStyle,
        style,
      ]}
    />
  );
};

CustomSkeletonPlaceholder.Item = SkeletonItem;

export default CustomSkeletonPlaceholder;
