import { useState, useCallback, useEffect, useMemo } from 'react';
import { View, RefreshControl, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';

import UserAvatar from '@/components/community/UserAvatar';
import AnimatedButton from '@/components/buttons/AnimatedButton';
import { FlashListWrapper } from '@/components/ui/FlashListWrapper';
import ThemedView from '@/components/ui/ThemedView';
import ThemedText from '@/components/ui/ThemedText';
import { OptimizedIcon } from '@/components/ui/OptimizedIcon';
import NetworkResilientImage from '@/components/ui/NetworkResilientImage';

import { useDebounce } from '@/lib/hooks/useDebounce';
import * as Haptics from '@/lib/utils/haptics';
import { log } from '@/lib/utils/logger';

// Types based on design document
interface User {
    id: string;
    username: string;
    displayName: string;
    avatar?: string;
    verified: boolean;
    bio?: string;
    location?: string;
    joinedAt: Date;
    socialStats: SocialStats;
}

interface SocialStats {
    userId: string;
    followersCount: number;
    followingCount: number;
    postsCount: number;
    likesReceived: number;
    commentsReceived: number;
    expertAnswers: number;
    helpfulVotes: number;
    reputationScore: number;
}

interface FeedPost {
    id: string;
    author: User;
    content: string;
    images?: string[];
    plantData?: PlantFeedData;
    strainInfo?: StrainInfo;
    createdAt: Date;
    updatedAt: Date;
    engagementStats: EngagementStats;
    isLiked: boolean;
    isBookmarked: boolean;
    tags: string[];
}

interface PlantFeedData {
    plantId: string;
    plantName: string;
    strain?: string;
    growthStage: string;
    daysSinceGermination: number;
    images: string[];
}

interface StrainInfo {
    id: string;
    name: string;
    type: 'indica' | 'sativa' | 'hybrid';
    thc: number;
    cbd: number;
    description: string;
}

interface EngagementStats {
    likes: number;
    comments: number;
    shares: number;
    views: number;
    saves: number;
}

interface FollowerFeedProps {
    currentUserId: string;
    onPostPress?: (post: FeedPost) => void;
    onUserPress?: (user: User) => void;
    onRefresh?: () => void;
}

export default function FollowerFeed({
    currentUserId,
    onPostPress,
    onUserPress,
    onRefresh,
}: FollowerFeedProps) {
    const { t } = useTranslation('community');

    // State management
    const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [hasMorePosts, setHasMorePosts] = useState(true);
    const [filter, setFilter] = useState<'all' | 'plants' | 'strains' | 'achievements'>('all');

    // Animation values
    const filterScale = useSharedValue(1);
    const feedOpacity = useSharedValue(1);

    // Debounced search and filtering
    const debouncedFilter = useDebounce(filter, 300);

    const animatedFilterStyle = useAnimatedStyle(() => ({
        transform: [{ scale: filterScale.value }],
    }));

    const animatedFeedStyle = useAnimatedStyle(() => ({
        opacity: feedOpacity.value,
    }));

    // Load feed posts
    const loadFeedPosts = useCallback(async (refresh = false) => {
        try {
            if (refresh) {
                setIsRefreshing(true);
            } else {
                setIsLoading(true);
            }

            // TODO: Implement actual API call to load personalized feed
            // const posts = await loadPersonalizedFeed({
            //   userId: currentUserId,
            //   filter: debouncedFilter,
            //   offset: refresh ? 0 : feedPosts.length,
            //   limit: 20
            // });

            // Mock data for now
            const mockPosts: FeedPost[] = [
                {
                    id: '1',
                    author: {
                        id: 'user1',
                        username: 'grower_pro',
                        displayName: 'Pro Grower',
                        avatar: 'https://example.com/avatar1.jpg',
                        verified: true,
                        bio: 'Expert cannabis cultivator with 10+ years experience',
                        location: 'California, USA',
                        joinedAt: new Date('2020-01-01'),
                        socialStats: {
                            userId: 'user1',
                            followersCount: 1250,
                            followingCount: 340,
                            postsCount: 89,
                            likesReceived: 2340,
                            commentsReceived: 890,
                            expertAnswers: 45,
                            helpfulVotes: 234,
                            reputationScore: 4.8,
                        },
                    },
                    content: 'Just harvested my Blue Dream! The trichomes are absolutely perfect. Here\'s what I learned during this grow cycle...',
                    images: ['https://example.com/plant1.jpg', 'https://example.com/plant2.jpg'],
                    plantData: {
                        plantId: 'plant1',
                        plantName: 'Blue Dream #1',
                        strain: 'Blue Dream',
                        growthStage: 'harvest',
                        daysSinceGermination: 120,
                        images: ['https://example.com/plant1.jpg'],
                    },
                    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
                    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
                    engagementStats: {
                        likes: 45,
                        comments: 12,
                        shares: 8,
                        views: 234,
                        saves: 23,
                    },
                    isLiked: false,
                    isBookmarked: false,
                    tags: ['harvest', 'blue-dream', 'indoor', 'led'],
                },
            ];

            if (refresh) {
                setFeedPosts(mockPosts);
            } else {
                setFeedPosts(prev => [...prev, ...mockPosts]);
            }

            setHasMorePosts(mockPosts.length === 20);
            log.info('Feed posts loaded successfully', { count: mockPosts.length, filter: debouncedFilter });

        } catch (error) {
            log.error('Failed to load feed posts', { error, filter: debouncedFilter });
            Alert.alert(t('errors.loadFeedFailed'), t('errors.tryAgain'));
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [currentUserId, debouncedFilter, t]);

    // Handle refresh
    const handleRefresh = useCallback(async () => {
        await loadFeedPosts(true);
        onRefresh?.();
    }, [loadFeedPosts, onRefresh]);

    // Handle post interactions
    const handleLikePost = useCallback(async (post: FeedPost) => {
        try {
            // Optimistic update
            setFeedPosts(prev => prev.map(p =>
                p.id === post.id
                    ? {
                        ...p,
                        isLiked: !p.isLiked,
                        engagementStats: {
                            ...p.engagementStats,
                            likes: p.isLiked ? p.engagementStats.likes - 1 : p.engagementStats.likes + 1
                        }
                    }
                    : p
            ));

            // Haptic feedback
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

            // TODO: Implement actual like API call
            // await togglePostLike(post.id);

            log.info('Post like toggled', { postId: post.id, isLiked: !post.isLiked });

        } catch (error) {
            log.error('Failed to toggle post like', { error, postId: post.id });
            // Revert optimistic update
            setFeedPosts(prev => prev.map(p =>
                p.id === post.id
                    ? {
                        ...p,
                        isLiked: post.isLiked,
                        engagementStats: post.engagementStats
                    }
                    : p
            ));
        }
    }, []);

    const handleBookmarkPost = useCallback(async (post: FeedPost) => {
        try {
            // Optimistic update
            setFeedPosts(prev => prev.map(p =>
                p.id === post.id
                    ? {
                        ...p,
                        isBookmarked: !p.isBookmarked,
                        engagementStats: {
                            ...p.engagementStats,
                            saves: p.isBookmarked ? p.engagementStats.saves - 1 : p.engagementStats.saves + 1
                        }
                    }
                    : p
            ));

            // Haptic feedback
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            // TODO: Implement actual bookmark API call
            // await togglePostBookmark(post.id);

            log.info('Post bookmark toggled', { postId: post.id, isBookmarked: !post.isBookmarked });

        } catch (error) {
            log.error('Failed to toggle post bookmark', { error, postId: post.id });
            // Revert optimistic update
            setFeedPosts(prev => prev.map(p =>
                p.id === post.id
                    ? {
                        ...p,
                        isBookmarked: post.isBookmarked,
                        engagementStats: post.engagementStats
                    }
                    : p
            ));
        }
    }, []);

    // Filter animation
    const animateFilter = useCallback((newFilter: typeof filter) => {
        filterScale.value = withSpring(0.95, { damping: 15, stiffness: 400 }, () => {
            filterScale.value = withSpring(1, { damping: 15, stiffness: 400 });
        });

        feedOpacity.value = withTiming(0.7, { duration: 150 }, () => {
            setFilter(newFilter);
            feedOpacity.value = withTiming(1, { duration: 150 });
        });
    }, [filterScale, feedOpacity]);

    // Load initial posts
    useEffect(() => {
        loadFeedPosts(true);
    }, [debouncedFilter, loadFeedPosts]);

    // Render post item
    const renderPostItem = useCallback(({ item: post }: { item: FeedPost }) => {
        const timeAgo = getTimeAgo(post.createdAt);

        return (
            <ThemedView className="bg-white dark:bg-neutral-900 mb-2 border-b border-neutral-200 dark:border-neutral-700">
                {/* Post Header */}
                <View className="flex-row items-center p-4 pb-2">
                    <UserAvatar
                        uri={post.author.avatar || ''}
                        size={40}
                        verified={post.author.verified}
                        onPress={() => onUserPress?.(post.author)}
                        accessibilityLabel={t('accessibility.userAvatar', { username: post.author.displayName })}
                    />

                    <View className="ml-3 flex-1">
                        <View className="flex-row items-center">
                            <ThemedText variant="default" className="font-semibold">
                                {post.author.displayName}
                            </ThemedText>
                            {post.author.verified && (
                                <OptimizedIcon name="checkmark-circle" size={16} className="ml-1 text-primary-500" />
                            )}
                        </View>
                        <ThemedText variant="caption" className="text-neutral-600 dark:text-neutral-400">
                            @{post.author.username} • {timeAgo}
                        </ThemedText>
                    </View>

                    <OptimizedIcon name="settings" size={20} className="text-neutral-500" />
                </View>

                {/* Post Content */}
                <View className="px-4 pb-2">
                    <ThemedText variant="default" className="leading-relaxed">
                        {post.content}
                    </ThemedText>

                    {/* Tags */}
                    {post.tags.length > 0 && (
                        <View className="flex-row flex-wrap mt-2">
                            {post.tags.map((tag, index) => (
                                <View key={index} className="mr-2 mb-1 px-2 py-1 bg-primary-100 dark:bg-primary-900 rounded-full">
                                    <ThemedText variant="caption" className="text-primary-600 dark:text-primary-400">
                                        #{tag}
                                    </ThemedText>
                                </View>
                            ))}
                        </View>
                    )}
                </View>

                {/* Post Images */}
                {post.images && post.images.length > 0 && (
                    <View className="px-4 pb-2">
                        <NetworkResilientImage
                            url={post.images[0] || null}
                            width="100%"
                            height={200}
                            borderRadius={8}
                            onPress={() => onPostPress?.(post)}
                        />
                    </View>
                )}

                {/* Plant Data */}
                {post.plantData && (
                    <View className="mx-4 mb-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                        <View className="flex-row items-center">
                            <OptimizedIcon name="leaf" size={16} className="text-green-600 dark:text-green-400" />
                            <ThemedText variant="default" className="ml-2 font-semibold text-green-700 dark:text-green-300">
                                {post.plantData.plantName}
                            </ThemedText>
                        </View>
                        <View className="flex-row items-center mt-1">
                            <ThemedText variant="caption" className="text-green-600 dark:text-green-400">
                                {post.plantData.strain} {t('common.separator')} {post.plantData.growthStage} {t('common.separator')} {t('common.day')} {post.plantData.daysSinceGermination}
                            </ThemedText>
                        </View>
                    </View>
                )}

                {/* Engagement Actions */}
                <View className="flex-row items-center justify-between px-4 py-3 border-t border-neutral-100 dark:border-neutral-800">
                    <View className="flex-row items-center space-x-6">
                        <View className="flex-row items-center">
                            <AnimatedButton
                                title=""
                                onPress={() => handleLikePost(post)}
                                variant="secondary"
                                icon={post.isLiked ? "heart" : "heart-outline"}
                            />
                            <ThemedText variant="caption" className="ml-1 text-neutral-600 dark:text-neutral-400">
                                {post.engagementStats.likes}
                            </ThemedText>
                        </View>

                        <View className="flex-row items-center">
                            <AnimatedButton
                                title=""
                                onPress={() => onPostPress?.(post)}
                                variant="secondary"
                                icon="chatbubble-outline"
                            />
                            <ThemedText variant="caption" className="ml-1 text-neutral-600 dark:text-neutral-400">
                                {post.engagementStats.comments}
                            </ThemedText>
                        </View>

                        <AnimatedButton
                            title=""
                            onPress={() => handleBookmarkPost(post)}
                            variant="secondary"
                            icon="star"
                        />
                    </View>

                    <ThemedText variant="caption" className="text-neutral-500 dark:text-neutral-400">
                        {post.engagementStats.views} {t('common.views')}
                    </ThemedText>
                </View>
            </ThemedView>
        );
    }, [onUserPress, onPostPress, handleLikePost, handleBookmarkPost, t]);

    // Filter buttons
    const FilterButtons = useMemo(() => (
        <Animated.View style={animatedFilterStyle}>
            <View className="flex-row justify-around p-4 bg-neutral-50 dark:bg-neutral-800">
                {(['all', 'plants', 'strains', 'achievements'] as const).map((filterOption) => (
                    <View key={filterOption} className="flex-1 mx-1">
                        <AnimatedButton
                            title={t(`filters.${filterOption}`)}
                            onPress={() => animateFilter(filterOption)}
                            variant={filter === filterOption ? 'primary' : 'secondary'}
                        />
                    </View>
                ))}
            </View>
        </Animated.View>
    ), [filter, animatedFilterStyle, animateFilter, t]);

    // Helper function for time ago
    function getTimeAgo(date: Date): string {
        const now = new Date();
        const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

        if (diffInMinutes < 1) return t('time.justNow');
        if (diffInMinutes < 60) return t('time.minutesAgo', { count: diffInMinutes });

        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return t('time.hoursAgo', { count: diffInHours });

        const diffInDays = Math.floor(diffInHours / 24);
        return t('time.daysAgo', { count: diffInDays });
    }

    return (
        <ThemedView className="flex-1 bg-neutral-100 dark:bg-neutral-900">
            {/* Filter Buttons */}
            {FilterButtons}

            {/* Feed List */}
            <Animated.View style={[animatedFeedStyle, { flex: 1 }]}>
                <FlashListWrapper
                    data={feedPosts}
                    renderItem={renderPostItem}
                    keyExtractor={(item) => item.id}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={handleRefresh}
                            tintColor="#3b82f6"
                            colors={['#3b82f6']}
                        />
                    }
                    onEndReached={() => {
                        if (hasMorePosts && !isLoading) {
                            loadFeedPosts(false);
                        }
                    }}
                    onEndReachedThreshold={0.5}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    ListEmptyComponent={
                        <View className="flex-1 items-center justify-center py-20">
                            <OptimizedIcon name="people-outline" size={64} className="text-neutral-400 mb-4" />
                            <ThemedText variant="heading" className="text-neutral-600 dark:text-neutral-400 text-center">
                                {t('feed.empty.title')}
                            </ThemedText>
                            <ThemedText variant="default" className="text-neutral-500 dark:text-neutral-500 text-center mt-2 px-8">
                                {t('feed.empty.description')}
                            </ThemedText>
                        </View>
                    }
                />
            </Animated.View>
        </ThemedView>
    );
}
