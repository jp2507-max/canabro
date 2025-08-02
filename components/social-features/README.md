# Social Groups Implementation

This directory contains the implementation of **ACF-T05.2: Implement SocialGroups for interest-based communities** from the Advanced Community Features specification.

## Overview

The Social Groups feature allows users to create, discover, and participate in interest-based communities within the CanaBro app. It provides a comprehensive group management system with moderation capabilities.

## Components

### Core Components

1. **SocialGroups.tsx** - Main component with tabbed interface
2. **GroupCreationForm.tsx** - Form for creating new groups
3. **GroupDiscovery.tsx** - Search and discovery interface
4. **GroupContent.tsx** - Group-specific content and member management
5. **GroupModeration.tsx** - Admin and moderation tools

### Supporting Files

- **index.ts** - Component exports
- **SocialGroupsExample.tsx** - Usage example
- **__tests__/SocialGroups.test.tsx** - Basic tests

## Features Implemented

### ✅ Group Creation
- Uses `EnhancedKeyboardWrapper` and `EnhancedTextInput` for forms
- Category selection with `TagPill` components
- Privacy settings (public/private groups)
- Tag management system
- Form validation and error handling

### ✅ Group Discovery
- Uses `FlashListWrapper` for performance with large lists
- Search functionality similar to `PlantSearchBar`
- Category filtering with `TagPill` components
- Group cards with member counts and activity indicators
- Separate views for all groups vs user's groups

### ✅ Group Content
- Uses existing `PostItem` and community components
- Group header with member info and join/leave functionality
- Tabbed interface for posts, members, and about sections
- Member management for admins (promote, demote, remove)

### ✅ Group Moderation
- Uses `SegmentedControl` for admin interface navigation
- Group settings management (privacy, moderation level, member limits)
- Role-based permissions (admin, moderator, member)
- Group statistics and member management

### ✅ Integration with Existing Components
- **TopicTag** and **TagPill** for group categorization
- **FlashListWrapper** for virtualized lists
- **SegmentedControl** for navigation
- **EnhancedTextInput** and **EnhancedKeyboardWrapper** for forms
- **PostItem** for group-specific content
- **UserAvatar** for member display

## Data Models Used

- **SocialGroup** - Main group entity with settings and stats
- **GroupMember** - User membership with roles and permissions
- **PostData** - Community posts (for group-specific content)

## Requirements Satisfied

This implementation satisfies **Requirement 4: Enhanced Social Features** from the specification:

1. ✅ Users can follow other growers and build social connections
2. ✅ Users can see activity from followed users in their feed
3. ✅ Users earn recognition through achievements and reputation scores
4. ✅ Users can join interest groups and connect with similar growers
5. ✅ Users are recognized for valuable contributions through ratings and badges

## Usage

### Basic Usage

```tsx
import { SocialGroups } from '@/components/social-features';

function SocialGroupsScreen() {
  const { user } = useAuth();
  
  return (
    <SocialGroups
      currentUserId={user?.id}
      initialTab="discover"
      onGroupSelect={(groupId) => {
        // Handle group selection
        console.log('Selected group:', groupId);
      }}
    />
  );
}
```

### Navigation Integration

```tsx
// In your navigation stack
<Stack.Screen 
  name="SocialGroups" 
  component={SocialGroupsScreen}
  options={{ 
    title: 'Groups',
    headerShown: false // Component has its own header
  }}
/>
```

## Translations

Translation keys have been added to `lib/locales/en.json` under the `socialGroups` namespace:

- `socialGroups.title` - Main title
- `socialGroups.tabs.*` - Tab labels
- `socialGroups.form.*` - Form labels and validation
- `socialGroups.discovery.*` - Discovery interface
- `socialGroups.content.*` - Group content interface
- `socialGroups.moderation.*` - Moderation interface

## Performance Considerations

- Uses `FlashListWrapper` for all large lists (groups, members)
- Implements proper virtualization with `estimatedItemSize`
- Uses React Native Reanimated v3.19.0+ with automatic workletization
- Debounced search queries to reduce database load
- Optimized re-renders with `useCallback` and `useMemo`

## Database Integration

The implementation uses WatermelonDB for offline-first data management:

- Groups are stored locally and synced with Supabase
- Real-time updates via Supabase Realtime (when implemented)
- Proper query optimization with indexes
- Batch operations for member management

## Future Enhancements

The following features are prepared for but not fully implemented:

1. **Real-time messaging** within groups
2. **Push notifications** for group activity
3. **File sharing** within groups
4. **Group events** and scheduling
5. **Advanced analytics** for group engagement

## Testing

Basic tests are included in `__tests__/SocialGroups.test.tsx`. To run tests:

```bash
npm test -- components/social-features/__tests__/SocialGroups.test.tsx
```

## Dependencies

This implementation leverages existing CanaBro utilities and follows established patterns:

- **React Native Reanimated v3.19.0+** for animations
- **WatermelonDB** for local data storage
- **Supabase** for backend services
- **i18next** for internationalization
- **@shopify/flash-list** for performance
- **react-native-gesture-handler** for interactions

## Architecture Compliance

This implementation follows the CanaBro architecture guidelines:

- ✅ Uses NativeWind v4 for styling
- ✅ Follows TypeScript strict mode
- ✅ Uses existing UI component patterns
- ✅ Implements proper error handling
- ✅ Supports dark/light themes
- ✅ Includes accessibility features
- ✅ Uses semantic color tokens
- ✅ Follows mobile-first design principles
--
-

## UserAchievements Component

### Overview

The **UserAchievements** component implements **ACF-T05.3: Create UserAchievements and gamification system** from the Advanced Community Features specification. It provides a comprehensive achievement system with progress tracking, leaderboards, and user statistics.

### Features Implemented

#### ✅ Achievement System
- Uses existing `AnimatedCard` and badge components for achievement display
- Progress tracking with visual progress bars
- Achievement categories (growing, community, social, knowledge)
- Difficulty levels (bronze, silver, gold, platinum)
- Real-time progress updates

#### ✅ Point Scoring and Leaderboards
- Uses existing `FlashListWrapper` for performance with large leaderboards
- Uses existing `StatItem` for statistics display
- User ranking system with real-time updates
- Level progression with experience points
- Community-wide leaderboard comparison

#### ✅ Badge System
- Uses existing `TagPill` components for difficulty badges
- Uses existing `NotificationBadge` for achievement indicators
- Category-based badge organization
- Visual achievement unlock indicators

#### ✅ Achievement Notifications
- Uses existing `useNotifications` hook for celebration notifications
- Celebration animations with React Native Reanimated v3.19.0+
- Haptic feedback for achievement unlocks
- Real-time notification delivery

#### ✅ Profile Integration
- Integrates with existing `ProfileDetail` patterns
- Activity tracking integration
- User statistics breakdown by category
- Level and title system based on expertise

### Components Structure

```
UserAchievements/
├── UserAchievements.tsx          # Main component with tabbed interface
├── UserAchievementsExample.tsx   # Usage example and integration guide
├── __tests__/
│   └── UserAchievements.test.tsx # Comprehensive test suite
└── README.md                     # This documentation
```

### Supporting Services

#### achievementService.ts
- Manages achievement data and user statistics
- Handles achievement unlocking and progress calculation
- Provides leaderboard functionality
- Integrates with Supabase database

#### useAchievements.ts Hook
- Reactive state management for achievements
- Real-time updates and notifications
- Mutation handling for stats updates
- Error handling and loading states

### Database Schema

The achievement system uses these Supabase tables:

#### user_achievements
- Individual achievement progress tracking
- Achievement metadata and requirements
- Unlock timestamps and progress percentages

#### user_stats
- User statistics and leaderboard data
- Level progression and experience points
- Category-based activity breakdown

### Achievement Categories

#### Growing Achievements
- First plant added
- First harvest completed
- Multiple plants grown
- Strain diversity

#### Community Achievements
- Helpful community answers
- Post engagement
- Comment contributions
- Community leadership

#### Social Achievements
- User following milestones
- Group participation
- Social connections
- Event attendance

#### Knowledge Achievements
- Strain reviews
- Questions answered
- Guides shared
- Expert recognition

### Usage Example

```tsx
import { UserAchievements } from '@/components/social-features';
import { useAchievements } from '@/lib/hooks/useAchievements';

function ProfileScreen() {
  const { user } = useAuth();
  
  const handleAchievementUnlocked = (achievement) => {
    // Trigger celebration UI
    showCelebrationModal(achievement);
  };
  
  return (
    <UserAchievements
      userId={user.id}
      userStats={userStats}
      onAchievementUnlocked={handleAchievementUnlocked}
    />
  );
}
```

### Integration with Existing Systems

#### Notification System
```tsx
// Achievement unlocks trigger notifications
const { scheduleNotification } = useNotifications();

await scheduleNotification({
  identifier: `achievement_${achievementId}`,
  title: 'Achievement Unlocked! 🏆',
  body: `Congratulations! You've unlocked: ${title}`,
  data: { type: 'achievement_unlocked', achievementId, points },
  scheduledFor: new Date(Date.now() + 1000),
});
```

#### Stats Updates
```tsx
// Update user stats when actions are performed
const { updateStats } = useAchievements({ userId });

// When user adds a plant
await updateStats('growing', {
  plantsGrown: currentCount + 1
});

// When user helps community
await updateStats('community', {
  helpfulAnswers: currentCount + 1
});
```

### Performance Optimizations

- **FlashList Virtualization**: Large achievement lists and leaderboards use `estimatedItemSize: 120` for achievements and `estimatedItemSize: 80` for leaderboard entries
- **React Native Reanimated v3.19.0+**: Automatic workletization for smooth animations
- **Intelligent Caching**: Achievement data cached for 5 minutes, leaderboard for 10 minutes
- **Optimistic Updates**: UI updates immediately while background sync occurs
- **Memory Management**: Proper cleanup of animations and subscriptions

### Accessibility Features

- Screen reader support for all achievement information
- Semantic labels for progress indicators
- High contrast support for achievement badges
- Haptic feedback for visual impairment support
- Keyboard navigation support

### Internationalization

Translation keys added to `lib/locales/en.json` under `achievements` namespace:

```json
{
  "achievements": {
    "title": "Achievements & Progress",
    "tabs": { "achievements": "Achievements", "leaderboard": "Leaderboard", "stats": "Statistics" },
    "categories": { "all": "All", "growing": "Growing", "community": "Community", "social": "Social", "knowledge": "Knowledge" },
    "achievements": {
      "first_plant": { "title": "Green Thumb", "description": "Add your first plant to the garden" }
    }
  }
}
```

### Testing

Comprehensive test suite includes:
- Achievement display and progress tracking
- Tab navigation and filtering
- Leaderboard ranking and user highlighting
- Stats overview and category breakdown
- Achievement unlock handling
- Loading states and error handling

### Requirements Satisfied

This implementation satisfies **Requirement 4: Enhanced Social Features**:

1. ✅ Users earn recognition through achievements and reputation scores
2. ✅ Users are recognized for valuable contributions through ratings and badges
3. ✅ Achievement system tracks growing, community, social, and knowledge activities
4. ✅ Leaderboard provides community comparison and motivation
5. ✅ Real-time notifications celebrate user progress

### Future Enhancements

- **Seasonal Achievements**: Time-limited special achievements
- **Team Achievements**: Group-based achievement unlocks
- **Achievement Sharing**: Social sharing of unlocked achievements
- **Custom Achievements**: User-defined personal goals
- **Achievement Analytics**: Detailed progress analytics and insights