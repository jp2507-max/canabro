/**
 * UserReporting Component
 * 
 * Main user reporting interface for community policing
 * Integrates UserReportModal and UserReportReview components
 */

import React, { useState } from 'react';
import ThemedView from '@/components/ui/ThemedView';
import ThemedText from '@/components/ui/ThemedText';
import UserReportModal, { type UserReportData } from './UserReportModal';
import UserReportReview from './UserReportReview';
import { useTranslation } from 'react-i18next';

interface UserReportingProps {
    _contentId?: string;
    _contentType?: 'message' | 'post' | 'comment' | 'user';
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
    _contentId,
    _contentType = 'message',
    reportedUserId,
    reportedUser,
    onReportSubmitted,
    showReviewInterface = false,
}) => {
    const { t } = useTranslation('community');
    const [showReportModal, setShowReportModal] = useState(false);

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
            <ThemedView className="flex-1">
                <UserReportReview
                    reports={[]}
                    onReportAction={() => { }}
                    onUserAction={() => { }}
                />
            </ThemedView>
        );
    }

    return (
        <ThemedView className="flex-1">
            <ThemedText className="text-lg font-semibold mb-4">
                {t('userReporting.title', { defaultValue: 'Community Reporting' })}
            </ThemedText>

            <UserReportModal
                visible={showReportModal}
                onClose={() => setShowReportModal(false)}
                onSubmit={handleReportSubmitted}
                reportedUser={userToReport}
            />
        </ThemedView>
    );
};

export default UserReporting;