/**
 * UserReportReview - Community-based user report review system
 * 
 * Features:
 * - Display user reports for moderation review
 * - Community-based content review using existing community components
 * - Appeal system using existing form patterns with EnhancedKeyboardWrapper
 * - Integration with existing UserAvatar and community features
 * - Moderation actions and user management tools
 */

import { useState, useCallback } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import { triggerLightHapticSync, triggerMediumHapticSync } from '@/lib/utils/haptics';
import ThemedView from '@/components/ui/ThemedView';
import ThemedText from '@/components/ui/ThemedText';
import { OptimizedIcon } from '@/components/ui/OptimizedIcon';
import { EnhancedTextInput } from '@/components/ui/EnhancedTextInput';
import { EnhancedKeyboardWrapper } from '@/components/keyboard/EnhancedKeyboardWrapper';
import SegmentedControl, { SegmentedControlOption } from '@/components/ui/SegmentedControl';
import TagPill from '@/components/ui/TagPill';
import UserAvatar from './UserAvatar';
import { FlashListWrapper } from '@/components/ui/FlashListWrapper';
import { useTranslation } from 'react-i18next';
import type { UserReportCategory, ReportSeverity } from './UserReportModal';

interface UserReportReviewProps {
    reports: UserReport[];
    onReportAction: (reportId: string, action: ReportAction, reason?: string) => void;
    onUserAction: (userId: string, action: UserAction, reason?: string) => void;
    loading?: boolean;
}

export interface UserReport {
    id: string;
    reportedUser: {
        id: string;
        username: string;
        avatar?: string;
        displayName?: string;
        joinedAt: Date;
        postsCount: number;
        reportsCount: number;
        lastActive: Date;
    };
    reporter: {
        id: string;
        username: string;
        avatar?: string;
        displayName?: string;
    } | null; // null for anonymous reports
    category: UserReportCategory;
    subcategory?: string;
    severity: ReportSeverity;
    description: string;
    evidence?: string[];
    status: ReportStatus;
    createdAt: Date;
    reviewedAt?: Date;
    reviewedBy?: string;
    moderatorNotes?: string;
    isAnonymous: boolean;
}

export type ReportStatus = 'pending' | 'under_review' | 'resolved' | 'dismissed' | 'escalated';
export type ReportAction = 'approve' | 'dismiss' | 'escalate' | 'require_action';
export type UserAction = 'warn' | 'suspend' | 'ban' | 'restrict' | 'clear_warning';

const REPORT_STATUS_OPTIONS: SegmentedControlOption[] = [
    { key: 'pending', label: 'Pending', icon: 'calendar', color: 'text-orange-600 dark:text-orange-400' },
    { key: 'under_review', label: 'Under Review', icon: 'eye-outline', color: 'text-blue-600 dark:text-blue-400' },
    { key: 'resolved', label: 'Resolved', icon: 'checkmark-circle', color: 'text-green-600 dark:text-green-400' },
    { key: 'dismissed', label: 'Dismissed', icon: 'close-circle', color: 'text-neutral-600 dark:text-neutral-400' },
];

const SEVERITY_COLORS = {
    low: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20',
    medium: 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20',
    high: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20',
    critical: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20',
};

const CATEGORY_ICONS = {
    harassment: 'person',
    spam: 'mail',
    inappropriate_behavior: 'warning',
    misinformation: 'help-circle',
    impersonation: 'person',
    community_guidelines: 'document-text-outline',
    other: 'settings',
};

export default function UserReportReview({
    reports,
    onReportAction,
    onUserAction,
    loading = false,
}: UserReportReviewProps) {
    const { t } = useTranslation('moderation');
    const [selectedStatus, setSelectedStatus] = useState<ReportStatus | 'all'>('all');
    const [expandedReports, setExpandedReports] = useState<Set<string>>(new Set());
    const [moderatorNotes, setModeratorNotes] = useState<Record<string, string>>({});

    // Filter reports based on selected status
    const filteredReports = reports.filter(report =>
        selectedStatus === 'all' || report.status === selectedStatus
    );

    const handleStatusChange = useCallback((status: string) => {
        setSelectedStatus(status as ReportStatus | 'all');
        triggerLightHapticSync();
    }, []);

    const toggleReportExpansion = useCallback((reportId: string) => {
        setExpandedReports(prev => {
            const newSet = new Set(prev);
            if (newSet.has(reportId)) {
                newSet.delete(reportId);
            } else {
                newSet.add(reportId);
            }
            return newSet;
        });
        triggerLightHapticSync();
    }, []);

    const handleReportAction = useCallback((report: UserReport, action: ReportAction) => {
        const notes = moderatorNotes[report.id];

        Alert.alert(
            t('userReportReview.confirmAction'),
            t('userReportReview.confirmActionDescription', { action }),
            [
                { text: t('userReportReview.cancel'), style: 'cancel' },
                {
                    text: t('userReportReview.confirm'),
                    style: action === 'dismiss' ? 'default' : 'destructive',
                    onPress: () => {
                        triggerMediumHapticSync();
                        onReportAction(report.id, action, notes);
                    },
                },
            ]
        );
    }, [moderatorNotes, onReportAction, t]);

    const handleUserAction = useCallback((report: UserReport, action: UserAction) => {
        const notes = moderatorNotes[report.id];

        Alert.alert(
            t('userReportReview.confirmUserAction'),
            t('userReportReview.confirmUserActionDescription', {
                action,
                user: report.reportedUser.displayName || report.reportedUser.username
            }),
            [
                { text: t('userReportReview.cancel'), style: 'cancel' },
                {
                    text: t('userReportReview.confirm'),
                    style: ['ban', 'suspend'].includes(action) ? 'destructive' : 'default',
                    onPress: () => {
                        triggerMediumHapticSync();
                        onUserAction(report.reportedUser.id, action, notes);
                    },
                },
            ]
        );
    }, [moderatorNotes, onUserAction, t]);

    const updateModeratorNotes = useCallback((reportId: string, notes: string) => {
        setModeratorNotes(prev => ({ ...prev, [reportId]: notes }));
    }, []);

    const renderReportItem = useCallback(({ item: report }: { item: UserReport }) => {
        const isExpanded = expandedReports.has(report.id);
        const severityColor = SEVERITY_COLORS[report.severity];
        const categoryIcon = CATEGORY_ICONS[report.category];

        return (
            <ThemedView className="mb-4 rounded-xl bg-white dark:bg-neutral-800 p-4 shadow-sm">
                {/* Report Header */}
                <Pressable
                    onPress={() => toggleReportExpansion(report.id)}
                    className="flex-row items-center justify-between"
                >
                    <View className="flex-row items-center flex-1">
                        <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${severityColor}`}>
                            <OptimizedIcon
                                name={categoryIcon as any}
                                size={20}
                                className={severityColor.split(' ')[0]}
                            />
                        </View>

                        <View className="flex-1">
                            <View className="flex-row items-center">
                                <ThemedText className="font-semibold text-base">
                                    {report.category.replace('_', ' ').toUpperCase()}
                                </ThemedText>
                                <TagPill
                                    text={report.severity}
                                    variant={report.severity === 'critical' ? 'default' : 'neutral'}
                                    size="small"
                                    className="ml-2"
                                />
                            </View>

                            <View className="flex-row items-center mt-1">
                                <UserAvatar
                                    uri={report.reportedUser.avatar || ''}
                                    size={20}
                                />
                                <ThemedText className="text-sm text-neutral-600 dark:text-neutral-400 ml-2">
                                    {report.reportedUser.displayName || report.reportedUser.username}
                                </ThemedText>
                                <ThemedText className="text-xs text-neutral-500 dark:text-neutral-500 ml-2">
                                    • {new Date(report.createdAt).toLocaleDateString()}
                                </ThemedText>
                            </View>
                        </View>
                    </View>

                    <OptimizedIcon
                        name={isExpanded ? "chevron-up" : "chevron-down"}
                        size={20}
                        className="text-neutral-400 dark:text-neutral-500"
                    />
                </Pressable>

                {/* Expanded Content */}
                {isExpanded && (
                    <View className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                        {/* Reporter Info */}
                        <View className="mb-4">
                            <ThemedText className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                                {t('userReportReview.reportedBy')}
                            </ThemedText>
                            {report.isAnonymous ? (
                                <View className="flex-row items-center">
                                    <OptimizedIcon
                                        name="eye-outline"
                                        size={16}
                                        className="text-neutral-500 dark:text-neutral-400 mr-2"
                                    />
                                    <ThemedText className="text-sm text-neutral-600 dark:text-neutral-400">
                                        {t('userReportReview.anonymousReport')}
                                    </ThemedText>
                                </View>
                            ) : report.reporter ? (
                                <View className="flex-row items-center">
                                    <UserAvatar
                                        uri={report.reporter.avatar || ''}
                                        size={24}
                                    />
                                    <ThemedText className="text-sm text-neutral-600 dark:text-neutral-400 ml-2">
                                        {report.reporter.displayName || report.reporter.username}
                                    </ThemedText>
                                </View>
                            ) : (
                                <ThemedText className="text-sm text-neutral-500 dark:text-neutral-400">
                                    {t('userReportReview.systemGenerated')}
                                </ThemedText>
                            )}
                        </View>

                        {/* Report Details */}
                        <View className="mb-4">
                            <ThemedText className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                                {t('userReportReview.description')}
                            </ThemedText>
                            <ThemedText className="text-sm text-neutral-600 dark:text-neutral-400 leading-5">
                                {report.description}
                            </ThemedText>
                            {report.subcategory && (
                                <TagPill
                                    text={report.subcategory}
                                    variant="neutral"
                                    size="small"
                                    className="mt-2"
                                />
                            )}
                        </View>

                        {/* User Stats */}
                        <View className="mb-4 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-700">
                            <ThemedText className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                                {t('userReportReview.userStats')}
                            </ThemedText>
                            <View className="flex-row justify-between">
                                <View>
                                    <ThemedText className="text-xs text-neutral-500 dark:text-neutral-400">
                                        {t('userReportReview.joinedOn')}
                                    </ThemedText>
                                    <ThemedText className="text-sm font-medium">
                                        {new Date(report.reportedUser.joinedAt).toLocaleDateString()}
                                    </ThemedText>
                                </View>
                                <View>
                                    <ThemedText className="text-xs text-neutral-500 dark:text-neutral-400">
                                        {t('userReportReview.posts')}
                                    </ThemedText>
                                    <ThemedText className="text-sm font-medium">
                                        {report.reportedUser.postsCount}
                                    </ThemedText>
                                </View>
                                <View>
                                    <ThemedText className="text-xs text-neutral-500 dark:text-neutral-400">
                                        {t('userReportReview.reports')}
                                    </ThemedText>
                                    <ThemedText className="text-sm font-medium text-red-600 dark:text-red-400">
                                        {report.reportedUser.reportsCount}
                                    </ThemedText>
                                </View>
                            </View>
                        </View>

                        {/* Moderator Notes */}
                        <View className="mb-4">
                            <EnhancedTextInput
                                label={t('userReportReview.moderatorNotes')}
                                placeholder={t('userReportReview.moderatorNotesPlaceholder')}
                                value={moderatorNotes[report.id] || ''}
                                onChangeText={(text) => updateModeratorNotes(report.id, text)}
                                multiline
                                numberOfLines={3}
                                maxLength={500}
                            />
                        </View>

                        {/* Action Buttons */}
                        <View className="space-y-3">
                            {/* Report Actions */}
                            <View>
                                <ThemedText className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                                    {t('userReportReview.reportActions')}
                                </ThemedText>
                                <View className="flex-row space-x-2">
                                    <Pressable
                                        onPress={() => handleReportAction(report, 'dismiss')}
                                        className="flex-1 py-2 px-3 rounded-lg bg-neutral-100 dark:bg-neutral-700 items-center"
                                    >
                                        <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                            {t('userReportReview.dismiss')}
                                        </Text>
                                    </Pressable>

                                    <Pressable
                                        onPress={() => handleReportAction(report, 'escalate')}
                                        className="flex-1 py-2 px-3 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 items-center"
                                    >
                                        <Text className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                                            {t('userReportReview.escalate')}
                                        </Text>
                                    </Pressable>
                                </View>
                            </View>

                            {/* User Actions */}
                            <View>
                                <ThemedText className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                                    {t('userReportReview.userActions')}
                                </ThemedText>
                                <View className="flex-row space-x-2">
                                    <Pressable
                                        onPress={() => handleUserAction(report, 'warn')}
                                        className="flex-1 py-2 px-3 rounded-lg bg-orange-100 dark:bg-orange-900/30 items-center"
                                    >
                                        <Text className="text-sm font-medium text-orange-700 dark:text-orange-300">
                                            {t('userReportReview.warn')}
                                        </Text>
                                    </Pressable>

                                    <Pressable
                                        onPress={() => handleUserAction(report, 'suspend')}
                                        className="flex-1 py-2 px-3 rounded-lg bg-red-100 dark:bg-red-900/30 items-center"
                                    >
                                        <Text className="text-sm font-medium text-red-700 dark:text-red-300">
                                            {t('userReportReview.suspend')}
                                        </Text>
                                    </Pressable>
                                </View>
                            </View>
                        </View>
                    </View>
                )}
            </ThemedView>
        );
    }, [expandedReports, moderatorNotes, handleReportAction, handleUserAction, toggleReportExpansion, updateModeratorNotes, t]);

    if (loading) {
        return (
            <ThemedView className="flex-1 items-center justify-center p-6">
                <OptimizedIcon
                    name="refresh"
                    size={32}
                    className="text-neutral-400 dark:text-neutral-500 mb-4"
                />
                <ThemedText className="text-neutral-600 dark:text-neutral-400">
                    {t('userReportReview.loading')}
                </ThemedText>
            </ThemedView>
        );
    }

    return (
        <EnhancedKeyboardWrapper>
            <ThemedView className="flex-1 bg-neutral-50 dark:bg-neutral-900">
                {/* Header */}
                <View className="p-4 bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
                    <ThemedText className="text-xl font-bold mb-2">
                        {t('userReportReview.title')}
                    </ThemedText>
                    <ThemedText className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                        {t('userReportReview.subtitle')}
                    </ThemedText>

                    {/* Status Filter */}
                    <SegmentedControl
                        options={[
                            { key: 'all', label: t('userReportReview.all'), icon: 'settings', color: 'text-neutral-600 dark:text-neutral-400' },
                            ...REPORT_STATUS_OPTIONS,
                        ]}
                        selectedKey={selectedStatus}
                        onSelectionChange={handleStatusChange}
                    />
                </View>

                {/* Reports List */}
                {filteredReports.length === 0 ? (
                    <View className="flex-1 items-center justify-center p-6">
                        <OptimizedIcon
                            name="checkmark-circle"
                            size={64}
                            className="text-green-500 dark:text-green-400 mb-4"
                        />
                        <ThemedText className="text-lg font-semibold mb-2">
                            {t('userReportReview.noReports')}
                        </ThemedText>
                        <ThemedText className="text-neutral-600 dark:text-neutral-400 text-center">
                            {t('userReportReview.noReportsDescription')}
                        </ThemedText>
                    </View>
                ) : (
                    <FlashListWrapper
                        data={filteredReports}
                        renderItem={renderReportItem}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={{ padding: 16 }}
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </ThemedView>
        </EnhancedKeyboardWrapper>
    );
}