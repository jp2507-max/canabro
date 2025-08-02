/**
 * ModerationDashboard Usage Example
 * 
 * Example of how to use the ModerationDashboard component in a screen
 */

import React from 'react';
import { View } from 'react-native';
import ModerationDashboard from './ModerationDashboard';

/**
 * Example screen that uses the ModerationDashboard
 * This would typically be placed in app/(app)/moderation.tsx or similar
 */
export default function ModerationScreen() {
  return (
    <View className="flex-1">
      <ModerationDashboard />
    </View>
  );
}

/**
 * Usage Notes:
 * 
 * 1. The ModerationDashboard component includes ProtectedRoute with admin check
 * 2. It automatically handles permissions and redirects non-admin users
 * 3. The component is fully self-contained with all necessary UI elements
 * 4. It uses existing components like ThemedView, SegmentedControl, FlashListWrapper
 * 5. All moderation actions include confirmation dialogs
 * 6. The component supports pull-to-refresh functionality
 * 7. Analytics are displayed with simple stat components
 * 
 * Integration Steps:
 * 1. Import the component: import { ModerationDashboard } from '@/components/community'
 * 2. Add to your route structure (e.g., app/(app)/moderation.tsx)
 * 3. Ensure user has admin permissions in your authentication system
 * 4. The component will handle the rest automatically
 * 
 * Required Permissions:
 * - User must be authenticated
 * - User must have admin role (checked via email containing 'admin' or user_metadata.role === 'admin')
 * 
 * Features Included:
 * - Flagged content review with bulk actions (approve, hide, delete)
 * - User management tools (warn, suspend, ban, unban)
 * - Moderation analytics with violation types and daily stats
 * - Real-time updates support (when integrated with backend)
 * - Responsive design with dark mode support
 * - Accessibility support with proper labels and roles
 * - Haptic feedback for all interactions
 * - Internationalization support via react-i18next
 */