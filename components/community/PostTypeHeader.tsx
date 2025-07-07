import React from 'react';
import { View, Text } from 'react-native';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolateColor as rInterpolateColor,
} from 'react-native-reanimated';
import { OptimizedIcon } from '../ui/OptimizedIcon';
import { PostData } from '@/lib/types/community';

interface PostTypeHeaderProps {
  post: PostData;
}

const PostTypeHeader: React.FC<PostTypeHeaderProps> = ({ post }) => {
  const badgeScale = useSharedValue(1);
  const badgeOpacity = useSharedValue(1);

  // Enhanced animation on mount
  React.useEffect(() => {
    badgeScale.value = withSpring(1, { damping: 15, stiffness: 400 });
    badgeOpacity.value = withSpring(1, { damping: 20, stiffness: 300 });
  }, []);

  const getHeaderConfig = () => {
    switch (post.post_type) {
      case 'question':
        return {
          icon: 'help-circle' as const,
          label: 'Question',
          color: 'text-blue-600 dark:text-blue-400',
          bgColor: 'bg-blue-50 dark:bg-blue-950/30',
          borderColor: 'border-blue-200/60 dark:border-blue-800/40',
          accentColor: 'bg-blue-500',
          gradientFrom: 'from-blue-50',
          gradientTo: 'to-blue-100/50',
          darkGradientFrom: 'dark:from-blue-950/20',
          darkGradientTo: 'dark:to-blue-900/10',
        };
      case 'plant_share':
        return {
          icon: 'leaf' as const,
          label: 'Plant Share',
          color: 'text-green-600 dark:text-green-400',
          bgColor: 'bg-green-50 dark:bg-green-950/30',
          borderColor: 'border-green-200/60 dark:border-green-800/40',
          accentColor: 'bg-green-500',
          gradientFrom: 'from-green-50',
          gradientTo: 'to-green-100/50',
          darkGradientFrom: 'dark:from-green-950/20',
          darkGradientTo: 'dark:to-green-900/10',
        };
      default:
        return {
          icon: 'chatbubble-outline' as const,
          label: 'Post',
          color: 'text-slate-600 dark:text-slate-400',
          bgColor: 'bg-slate-50 dark:bg-slate-950/30',
          borderColor: 'border-slate-200/60 dark:border-slate-800/40',
          accentColor: 'bg-slate-500',
          gradientFrom: 'from-slate-50',
          gradientTo: 'to-slate-100/50',
          darkGradientFrom: 'dark:from-slate-950/20',
          darkGradientTo: 'dark:to-slate-900/10',
        };
    }
  };

  const config = getHeaderConfig();

  const animatedBadgeStyle = useAnimatedStyle(() => {
    const scale = badgeScale.value;
    const opacity = badgeOpacity.value;
    
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  const renderQuestionHeader = () => (
    <Animated.View 
      entering={FadeInDown.delay(100).duration(400).springify()}
      className={`mb-4 rounded-2xl border ${config.borderColor} ${config.bgColor} backdrop-blur-sm`}
    >
      {/* Gradient background overlay */}
      <View className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${config.gradientFrom} ${config.gradientTo} ${config.darkGradientFrom} ${config.darkGradientTo} opacity-60`} />
      
      <View className="relative p-4">
        {/* Header with badge and category */}
        <View className="flex-row items-center justify-between mb-3">
          <Animated.View 
            style={animatedBadgeStyle}
            className={`flex-row items-center px-3 py-1.5 rounded-full ${config.bgColor} ${config.borderColor} border backdrop-blur-md shadow-sm`}
          >
            <View className={`w-2 h-2 rounded-full ${config.accentColor} mr-2`} />
            <OptimizedIcon
              name={config.icon}
              size={14}
              className={`mr-1.5 ${config.color}`}
            />
            <Text className={`text-xs font-semibold ${config.color} tracking-wide`}>
              {config.label.toUpperCase()}
            </Text>
          </Animated.View>
          
          {post.category && (
            <Animated.View 
              entering={FadeInDown.delay(200).duration(300)}
              className="px-3 py-1 bg-white/80 dark:bg-slate-800/80 rounded-full border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-sm"
            >
              <Text className="text-xs font-medium text-slate-600 dark:text-slate-400 capitalize">
                {post.category.replace('_', ' ')}
              </Text>
            </Animated.View>
          )}
        </View>
        
        {/* Question title */}
        {post.title && (
          <Animated.View entering={FadeInDown.delay(150).duration(400)}>
            <Text className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3 leading-tight">
              {post.title}
            </Text>
          </Animated.View>
        )}
        
        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <Animated.View 
            entering={FadeInDown.delay(250).duration(400)}
            className="flex-row flex-wrap gap-2"
          >
            {post.tags.map((tag, index) => (
              <Animated.View
                key={index}
                entering={FadeInDown.delay(300 + index * 50).duration(300)}
                className="px-3 py-1.5 bg-blue-100/80 dark:bg-blue-900/40 rounded-full border border-blue-200/50 dark:border-blue-800/30 backdrop-blur-sm"
              >
                <Text className="text-xs font-medium text-blue-700 dark:text-blue-300">
                  #{tag}
                </Text>
              </Animated.View>
            ))}
          </Animated.View>
        )}
      </View>
    </Animated.View>
  );

  const renderPlantShareHeader = () => (
    <Animated.View 
      entering={FadeInDown.delay(100).duration(400).springify()}
      className={`mb-4 rounded-2xl border ${config.borderColor} ${config.bgColor} backdrop-blur-sm overflow-hidden`}
    >
      {/* Gradient background overlay */}
      <View className={`absolute inset-0 bg-gradient-to-br ${config.gradientFrom} ${config.gradientTo} ${config.darkGradientFrom} ${config.darkGradientTo} opacity-60`} />
      
      <View className="relative p-4">
        {/* Header with badge and growth stage */}
        <View className="flex-row items-center justify-between mb-3">
          <Animated.View 
            style={animatedBadgeStyle}
            className={`flex-row items-center px-3 py-1.5 rounded-full ${config.bgColor} ${config.borderColor} border backdrop-blur-md shadow-sm`}
          >
            <View className={`w-2 h-2 rounded-full ${config.accentColor} mr-2`} />
            <OptimizedIcon
              name={config.icon}
              size={14}
              className={`mr-1.5 ${config.color}`}
            />
            <Text className={`text-xs font-semibold ${config.color} tracking-wide`}>
              {config.label.toUpperCase()}
            </Text>
          </Animated.View>
          
          {post.growth_stage && (
            <Animated.View 
              entering={FadeInDown.delay(200).duration(300)}
              className="px-3 py-1 bg-green-100/80 dark:bg-green-900/40 rounded-full border border-green-200/50 dark:border-green-800/30 backdrop-blur-sm"
            >
              <Text className="text-xs font-medium text-green-700 dark:text-green-300 capitalize">
                {post.growth_stage.replace('_', ' ')}
              </Text>
            </Animated.View>
          )}
        </View>
        
        {/* Plant name */}
        {post.plant_name && (
          <Animated.View entering={FadeInDown.delay(150).duration(400)}>
            <Text className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3 leading-tight">
              {post.plant_name}
            </Text>
          </Animated.View>
        )}
        
        {/* Care tips */}
        {post.care_tips && (
          <Animated.View 
            entering={FadeInDown.delay(250).duration(400)}
            className="mt-3 p-4 bg-white/60 dark:bg-slate-800/60 rounded-xl border border-green-200/30 dark:border-green-800/20 backdrop-blur-sm"
          >
            <View className="flex-row items-center mb-2">
              <OptimizedIcon
                name="leaf-outline"
                size={16}
                className="text-green-600 dark:text-green-400 mr-2"
              />
              <Text className="text-sm font-semibold text-green-800 dark:text-green-200">
                Care Tips
              </Text>
            </View>
            <Text className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {post.care_tips}
            </Text>
          </Animated.View>
        )}
      </View>
    </Animated.View>
  );

  const renderGeneralHeader = () => (
    <Animated.View 
      entering={FadeInDown.delay(100).duration(300)}
      className="mb-3"
    >
      <Animated.View 
        style={animatedBadgeStyle}
        className={`flex-row items-center px-3 py-1.5 rounded-full ${config.bgColor} ${config.borderColor} border backdrop-blur-sm shadow-sm self-start`}
      >
        <View className={`w-2 h-2 rounded-full ${config.accentColor} mr-2`} />
        <OptimizedIcon
          name={config.icon}
          size={14}
          className={`mr-1.5 ${config.color}`}
        />
        <Text className={`text-xs font-semibold ${config.color} tracking-wide`}>
          {config.label.toUpperCase()}
        </Text>
      </Animated.View>
    </Animated.View>
  );

  // Only render header for non-general posts or when explicitly requested
  if (post.post_type === 'general' && !post.title) {
    return null;
  }

  switch (post.post_type) {
    case 'question':
      return renderQuestionHeader();
    case 'plant_share':
      return renderPlantShareHeader();
    default:
      return renderGeneralHeader();
  }
};

export default PostTypeHeader; 