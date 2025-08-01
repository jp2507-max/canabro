/**
 * UserReportingExample - Example integration of the UserReporting system
 * 
 * This component demonstrates how to integrate the user reporting system
 * with existing community features and user profiles.
 */

import React, { useState, useCallback } from 'react';
import { View, Pressable, Alert } from 'react-native';
import { triggerMediumHapticSync } from '@/lib/utils/haptics';
import ThemedText from '@/components/ui/ThemedText';
import { OptimizedIcon } from '@/components/ui/OptimizedIcon';
import UserReportModal, { UserReportData } from './UserReportModal';
import UserAppealModal, { AppealData } from './UserAppealModal';
import { userReportingService } from '@/lib/services/user-reporting.service';
import { useTranslation } from 'react-i18next';

interface UserReportingExampleProps {
  user: {
    id: string;
    username: string;
    displayName?: string;
    avatar?: string;
  };
  currentUserId: string;
  onReportSubmitted?: (reportId: string) => void;
  onAppealSubmitted?: (appealId: string) => void;
}

export default function UserReportingExample({
  user,
  currentUserId,
  onReportSubmitted,
  onAppealSubmitted,
}: UserReportingExampleProps) {
  const { t } = useTranslation('community');
  const [showReportModal, setShowReportModal] = useState(false);
  const [showAppealModal, setShowAppealModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Example report data for appeal modal
  const [exampleReport] = useState({
    id: 'example-report-id',
    category: 'harassment',
    severity: 'medium',
    description: 'User was reported for inappropriate behavior in community discussions.',
    createdAt: new Date(),
    moderationAction: 'Warning issued',
  });

  const handleReportUser = useCallback(() => {
    if (user.id === currentUserId) {
      Alert.alert(
        t('userReporting.error'),
        t('userReporting.cannotReportSelf')
      );
      return;
    }

    triggerMediumHapticSync();
    setShowReportModal(true);
  }, [user.id, currentUserId, t]);

  const handleSubmitReport = useCallback(async (reportData: UserReportData) => {
    setSubmitting(true);
    
    try {
      const result = await userReportingService.submitUserReport({
        reportedUserId: reportData.reportedUserId,
        reporterId: reportData.isAnonymous ? undefined : currentUserId,
        category: reportData.category,
        subcategory: reportData.subcategory,
        severity: reportData.severity,
        description: reportData.description,
        evidence: reportData.evidence,
        isAnonymous: reportData.isAnonymous,
      });

      if (result.success && result.reportId) {
        Alert.alert(
          t('userReporting.success'),
          t('userReporting.reportSubmitted'),
          [
            {
              text: t('common.ok'),
              onPress: () => {
                setShowReportModal(false);
                onReportSubmitted?.(result.reportId!);
              },
            },
          ]
        );
      } else {
        Alert.alert(
          t('userReporting.error'),
          result.error || t('userReporting.submitFailed')
        );
      }
    } catch (error) {
      Alert.alert(
        t('userReporting.error'),
        t('userReporting.unexpectedError')
      );
    } finally {
      setSubmitting(false);
    }
  }, [currentUserId, onReportSubmitted, t]);

  const handleSubmitAppeal = useCallback(async (appealData: AppealData) => {
    setSubmitting(true);
    
    try {
      const result = await userReportingService.submitAppeal(
        currentUserId,
        appealData.reportId,
        appealData.appealReason,
        appealData.evidence
      );

      if (result.success && result.appealId) {
        Alert.alert(
          t('userAppeal.success'),
          t('userAppeal.appealSubmitted'),
          [
            {
              text: t('common.ok'),
              onPress: () => {
                setShowAppealModal(false);
                onAppealSubmitted?.(result.appealId!);
              },
            },
          ]
        );
      } else {
        Alert.alert(
          t('userAppeal.error'),
          result.error || t('userAppeal.submitFailed')
        );
      }
    } catch (error) {
      Alert.alert(
        t('userAppeal.error'),
        t('userAppeal.unexpectedError')
      );
    } finally {
      setSubmitting(false);
    }
  }, [currentUserId, onAppealSubmitted, t]);

  return (
    <View className="p-4 bg-white dark:bg-neutral-800 rounded-xl">
      <ThemedText className="text-lg font-semibold mb-4">
        User Reporting System Demo
      </ThemedText>
      
      <View className="space-y-3">
        {/* Report User Button */}
        <Pressable
          onPress={handleReportUser}
          className="flex-row items-center p-3 rounded-lg bg-red-50 dark:bg-red-900/20"
        >
          <OptimizedIcon
            name="warning"
            size={20}
            className="text-red-600 dark:text-red-400 mr-3"
          />
          <View className="flex-1">
            <ThemedText className="font-medium text-red-700 dark:text-red-300">
              Report User
            </ThemedText>
            <ThemedText className="text-sm text-red-600 dark:text-red-400">
              Report {user.displayName || user.username} for community violations
            </ThemedText>
          </View>
        </Pressable>

        {/* Appeal Example Button */}
        <Pressable
          onPress={() => setShowAppealModal(true)}
          className="flex-row items-center p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20"
        >
          <OptimizedIcon
            name="document-text-outline"
            size={20}
            className="text-blue-600 dark:text-blue-400 mr-3"
          />
          <View className="flex-1">
            <ThemedText className="font-medium text-blue-700 dark:text-blue-300">
              Appeal Report (Demo)
            </ThemedText>
            <ThemedText className="text-sm text-blue-600 dark:text-blue-400">
              Contest a moderation decision
            </ThemedText>
          </View>
        </Pressable>
      </View>

      {/* User Report Modal */}
      <UserReportModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        onSubmit={handleSubmitReport}
        reportedUser={user}
        submitting={submitting}
      />

      {/* User Appeal Modal */}
      <UserAppealModal
        visible={showAppealModal}
        onClose={() => setShowAppealModal(false)}
        onSubmit={handleSubmitAppeal}
        reportData={exampleReport}
        submitting={submitting}
      />
    </View>
  );
}