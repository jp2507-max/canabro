/**
 * Community Components Exports
 * 
 * Enhanced components for the community feature with visual differentiation,
 * segmented control filtering, context-aware FAB, and content moderation (ACF-T04.1).
 */

export { default as CommunitySegmentedControl } from './CommunitySegmentedControl';
export { default as QuestionPostItem } from './QuestionPostItem';
export { default as PlantSharePostItem } from './PlantSharePostItem';
export { default as ContextAwareFAB } from './ContextAwareFAB';

// Content Moderation Components (ACF-T04.1)
export { default as ModerationIndicator } from './ModerationIndicator';
export { default as ContentReportModal } from './ContentReportModal';
export { default as ModerationDashboard } from './ModerationDashboard';

// User Reporting Components (ACF-T04.3)
export { default as UserReportModal } from './UserReportModal';
export { default as UserReportReview } from './UserReportReview';
export { default as UserAppealModal } from './UserAppealModal';

// Re-export existing components for convenience
export { default as CreatePostScreen } from './CreatePostScreen';
export { default as CreatePostModal } from './CreatePostModal';
export { default as UserAvatar } from './UserAvatar';
export { default as CommentItem } from './CommentItem';
export { default as CommentModal } from './CommentModal';
export { default as DeletePostModal } from './DeletePostModal';
export { PostActionButtons } from './PostActionButtons';
export { default as PostActionRow } from './PostActionRow';
export { default as PostItem } from './PostItem';
export { default as PostTypeHeader } from './PostTypeHeader';
export { default as TopicList } from './TopicList';
export { default as TopicTag } from './TopicTag';
