/**
 * UserReporting Component
 * 
 * Main user reporting interface for community policing
 * Integrates UserReportModal and UserReportReview components
 */

import React, { useCallback, useMemo, useState } from 'react';
import ThemedView from '@/components/ui/ThemedView';
import ThemedText from '@/components/ui/ThemedText';
import UserReportModal, { type UserReportData } from './UserReportModal';
import UserReportReview from './UserReportReview';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userReportingService } from '@/lib/services/user-reporting.service';
import { useAuth } from '@/lib/contexts/AuthProvider';

/**
 * TODO(cdp-usrpt-001): contentId and contentType are reserved for future use
 * in cross-entity moderation (message/post/comment/user) to support
 * server-side correlation and audit trails. They remain optional and unused
 * within this component until backend wiring is implemented.
 */
interface UserReportingProps {
    // TODO(cdp-usrpt-001): Wire to backend when moderation endpoints accept content metadata
    contentId?: string;
    contentType?: 'message' | 'post' | 'comment' | 'user';
    reportedUserId?: string;
    reportedUser?: {
        id: string;
        username: string;
        avatar?: string;
        displayName?: string;
    };
    onReportSubmitted?: (reportData: UserReportData) => void;
    showReviewInterface?: boolean;
}


export const UserReporting: React.FC<UserReportingProps> = ({
    // Reserved for future backend integration
    contentId: _reservedContentId,
    contentType: _reservedContentType = 'message',
    reportedUserId,
    reportedUser,
    onReportSubmitted,
    showReviewInterface = false,
}) => {
    const { t } = useTranslation('community');
    const { user } = useAuth();
    const moderatorId = user?.id; // prefer authenticated user id
    const [showReportModal, setShowReportModal] = useState(false);

    // Fetch reports for review interface
    const {
        data: reportsData,
        isLoading: reportsLoading,
        refetch: refetchReports,
    } = useQuery({
        queryKey: ['userReports', { reportedUserId }],
        queryFn: async () => {
            // If a specific reportedUserId is provided, scope the view to that user; otherwise fetch all pending
            const { reports, totalCount } = await userReportingService.getUserReports(
                reportedUserId ? { reportedUserId, status: ['pending', 'under_review'] } : { status: ['pending', 'under_review'] },
                1,
                50
            );
            return { reports, totalCount };
        },
        enabled: showReviewInterface === true,
        staleTime: 30_000,
    });

    const reports = useMemo(() => reportsData?.reports ?? [], [reportsData]);

    // Mutations for report and user actions
    const queryClient = useQueryClient();

    const moderateReportMutation = useMutation({
        mutationFn: async (params: { reportId: string; action: import('./UserReportReview').ReportAction; reason?: string }) => {
            if (!moderatorId) {
                // Guard: do not submit without a valid moderator id
                throw new Error('Missing moderator ID. Please sign in as a moderator.');
            }
            return userReportingService.moderateReport({
                reportId: params.reportId,
                action: params.action,
                moderatorId,
                reason: params.reason,
                notes: params.reason,
            });
        },
        onSuccess: () => {
            // Refresh the list
            queryClient.invalidateQueries({ queryKey: ['userReports'] });
        },
    });

    const moderateUserMutation = useMutation({
        mutationFn: async (params: { userId: string; action: import('./UserReportReview').UserAction; reason?: string }) => {
            if (!moderatorId) {
                // Guard: do not submit without a valid moderator id
                throw new Error('Missing moderator ID. Please sign in as a moderator.');
            }
            return userReportingService.moderateUser({
                userId: params.userId,
                action: params.action,
                moderatorId,
                reason: params.reason,
                notes: params.reason,
            });
        },
        onSuccess: () => {
            // User moderation may also affect reports; refresh
            queryClient.invalidateQueries({ queryKey: ['userReports'] });
        },
    });

    const handleReportAction = useCallback(
        async (reportId: string, action: import('./UserReportReview').ReportAction, reason?: string) => {
            if (!moderatorId) {
                Alert.alert('Missing moderator', 'You must be signed in to perform moderation actions.');
                return;
            }
            try {
                const res = await moderateReportMutation.mutateAsync({ reportId, action, reason });
                if (!res.success) {
                    Alert.alert('Action failed', res.error ?? 'Unable to perform report action.');
                    return;
                }
                refetchReports();
            } catch (e: unknown) {
                const message = e instanceof Error ? e.message : 'Unable to perform report action.';
                Alert.alert('Action failed', message);
            }
        },
        [moderatorId, moderateReportMutation, refetchReports]
    );

    const handleUserAction = useCallback(
        async (userId: string, action: import('./UserReportReview').UserAction, reason?: string) => {
            if (!moderatorId) {
                Alert.alert('Missing moderator', 'You must be signed in to perform moderation actions.');
                return;
            }
            try {
                const res = await moderateUserMutation.mutateAsync({ userId, action, reason });
                if (!res.success) {
                    Alert.alert('Action failed', res.error ?? 'Unable to perform user action.');
                    return;
                }
                refetchReports();
            } catch (e: unknown) {
                const message = e instanceof Error ? e.message : 'Unable to perform user action.';
                Alert.alert('Action failed', message);
            }
        },
        [moderatorId, moderateUserMutation, refetchReports]
    );

    const handleReportSubmitted = (reportData: UserReportData) => {
        setShowReportModal(false);
        onReportSubmitted?.(reportData);
    };

    const userToReport = reportedUser || {
        id: reportedUserId || '',
        username: 'user',
        displayName: 'User'
    };

if (showReviewInterface) {
        return (
            <ThemedView
                className="flex-1"
                accessible
                accessibilityRole="summary"
                accessibilityLabel={t('userReporting.reviewRegionLabel', {
                    defaultValue: 'User report review section'
                })}
                accessibilityHint={t('userReporting.reviewRegionHint', {
                    defaultValue: 'Contains tools and information to review and manage user reports'
                })}
            >
                <UserReportReview
                    reports={reports}
                    onReportAction={handleReportAction}
                    onUserAction={handleUserAction}
                    loading={reportsLoading || moderateReportMutation.isPending || moderateUserMutation.isPending}
                    /* Accessibility note:
                     * UserReportReview is a custom component, not a native element.
                     * Pass container a11y via its outermost View internally.
                     * We avoid forwarding unsupported props here to keep typing strict.
                     */
                />
            </ThemedView>
        );
    }

return (
        <ThemedView
            className="flex-1"
            accessible
            accessibilityRole="summary"
            accessibilityLabel={t('userReporting.mainRegionLabel', {
                defaultValue: 'Community reporting section'
            })}
            accessibilityHint={t('userReporting.mainRegionHint', {
                defaultValue: 'Provides options to report users and manage reporting'
            })}
        >
            <ThemedText
                className="text-lg font-semibold mb-4"
                accessibilityRole="header"
                accessibilityLabel={t('userReporting.title', { defaultValue: 'Community Reporting' })}
                accessibilityHint={t('userReporting.titleHint', {
                    defaultValue: 'Heading for the community reporting section'
                })}
            >
                {t('userReporting.title', { defaultValue: 'Community Reporting' })}
            </ThemedText>

            {/* Open report modal button */}
<Pressable
                accessible
                accessibilityRole="button"
                accessibilityLabel={t('userReporting.openReport', { defaultValue: 'Report a user' })}
                accessibilityHint={t('userReporting.openReportHint', {
                    defaultValue: 'Opens a form to report a user for inappropriate behavior'
                })}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-md self-start mb-4"
                onPress={() => setShowReportModal(true)}
            >
                <ThemedText className="text-primary-foreground">
                    {t('userReporting.openReport', { defaultValue: 'Report a user' })}
                </ThemedText>
            </Pressable>

            <UserReportModal
                visible={showReportModal}
                onClose={() => setShowReportModal(false)}
                onSubmit={handleReportSubmitted}
                reportedUser={userToReport}
                // TODO(cdp-usrpt-001): Pass through when backend supports content metadata
                // contentId={_reservedContentId}
                // contentType={_reservedContentType}
            />
        </ThemedView>
    );
};

export default UserReporting;
