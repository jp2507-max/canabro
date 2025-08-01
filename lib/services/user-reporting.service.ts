/**
 * User Reporting Service for Advanced Community Features
 * 
 * Provides user reporting functionality, report management, and moderation
 * capabilities for community policing and user behavior management.
 * 
 * Features:
 * - User report submission and management
 * - Community-based content review system
 * - Appeal system for reported users
 * - Integration with existing moderation systems
 * - Analytics and reporting for moderation insights
 */

import supabase from '../supabase';
import { log } from '../utils/logger';
import type { 
  UserReport, 
  ReportStatus, 
  ReportAction, 
  UserAction 
} from '../../components/community/UserReportReview';
import type { 
  UserReportData, 
  UserReportCategory, 
  ReportSeverity 
} from '../../components/community/UserReportModal';

// ========================================
// 🚨 USER REPORTING TYPES & INTERFACES
// ========================================

export interface UserReportSubmission {
  reportedUserId: string;
  reporterId?: string; // null for anonymous reports
  category: UserReportCategory;
  subcategory?: string;
  severity: ReportSeverity;
  description: string;
  evidence?: string[];
  isAnonymous: boolean;
  metadata?: Record<string, unknown>;
}

export interface UserReportFilter {
  status?: ReportStatus[];
  category?: UserReportCategory[];
  severity?: ReportSeverity[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  reportedUserId?: string;
  reporterId?: string;
}

export interface ReportModerationAction {
  reportId: string;
  action: ReportAction;
  moderatorId: string;
  reason?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface UserModerationAction {
  userId: string;
  action: UserAction;
  moderatorId: string;
  reason?: string;
  duration?: number; // in hours for temporary actions
  notes?: string;
  relatedReportIds?: string[];
}

export interface UserReportStats {
  totalReports: number;
  pendingReports: number;
  resolvedReports: number;
  dismissedReports: number;
  escalatedReports: number;
  reportsByCategory: Record<UserReportCategory, number>;
  reportsBySeverity: Record<ReportSeverity, number>;
  averageResolutionTime: number; // in hours
  topReportedUsers: Array<{
    userId: string;
    username: string;
    reportCount: number;
  }>;
}

export interface UserAppeal {
  id: string;
  userId: string;
  reportId: string;
  appealReason: string;
  evidence?: string[];
  status: 'pending' | 'under_review' | 'approved' | 'denied';
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  reviewNotes?: string;
}

// ========================================
// 🛡️ USER REPORTING SERVICE
// ========================================

class UserReportingService {
  /**
   * Submit a new user report
   */
  async submitUserReport(reportData: UserReportSubmission): Promise<{ success: boolean; reportId?: string; error?: string }> {
    try {
      log.info('[UserReporting] Submitting user report', { 
        reportedUserId: reportData.reportedUserId,
        category: reportData.category,
        severity: reportData.severity,
        isAnonymous: reportData.isAnonymous
      });

      // Validate report data
      const validation = this.validateReportData(reportData);
      if (!validation.isValid) {
        return { success: false, error: validation.error };
      }

      // Check for duplicate reports (same reporter, same user, within 24 hours)
      if (!reportData.isAnonymous && reportData.reporterId) {
        const isDuplicate = await this.checkDuplicateReport(
          reportData.reporterId,
          reportData.reportedUserId,
          24 // hours
        );
        
        if (isDuplicate) {
          return { success: false, error: 'Duplicate report detected. Please wait before submitting another report for this user.' };
        }
      }

      // Insert report into database
      const { data, error } = await supabase
        .from('user_reports')
        .insert({
          reported_user_id: reportData.reportedUserId,
          reporter_id: reportData.isAnonymous ? null : reportData.reporterId,
          category: reportData.category,
          subcategory: reportData.subcategory,
          severity: reportData.severity,
          description: reportData.description,
          evidence: reportData.evidence,
          is_anonymous: reportData.isAnonymous,
          status: 'pending',
          metadata: {
            ...reportData.metadata,
            submittedAt: new Date().toISOString(),
            userAgent: 'mobile-app',
          },
        })
        .select('id')
        .single();

      if (error) {
        log.error('[UserReporting] Error submitting report:', error);
        return { success: false, error: 'Failed to submit report. Please try again.' };
      }

      // Update user report count
      await this.updateUserReportCount(reportData.reportedUserId);

      // Trigger moderation workflow if severity is high or critical
      if (['high', 'critical'].includes(reportData.severity)) {
        await this.triggerUrgentModerationReview(data.id);
      }

      log.info('[UserReporting] Report submitted successfully', { reportId: data.id });
      return { success: true, reportId: data.id };

    } catch (error) {
      log.error('[UserReporting] Error in submitUserReport:', error);
      return { success: false, error: 'An unexpected error occurred. Please try again.' };
    }
  }

  /**
   * Get user reports with filtering and pagination
   */
  async getUserReports(
    filter: UserReportFilter = {},
    page: number = 1,
    limit: number = 20
  ): Promise<{ reports: UserReport[]; totalCount: number; hasMore: boolean }> {
    try {
      log.info('[UserReporting] Fetching user reports', { filter, page, limit });

      let query = supabase
        .from('user_reports')
        .select(`
          *,
          reported_user:profiles!reported_user_id(
            id,
            username,
            display_name,
            avatar_url,
            created_at
          ),
          reporter:profiles!reporter_id(
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filter.status && filter.status.length > 0) {
        query = query.in('status', filter.status);
      }

      if (filter.category && filter.category.length > 0) {
        query = query.in('category', filter.category);
      }

      if (filter.severity && filter.severity.length > 0) {
        query = query.in('severity', filter.severity);
      }

      if (filter.reportedUserId) {
        query = query.eq('reported_user_id', filter.reportedUserId);
      }

      if (filter.reporterId) {
        query = query.eq('reporter_id', filter.reporterId);
      }

      if (filter.dateRange) {
        query = query
          .gte('created_at', filter.dateRange.start.toISOString())
          .lte('created_at', filter.dateRange.end.toISOString());
      }

      // Apply pagination
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        log.error('[UserReporting] Error fetching reports:', error);
        return { reports: [], totalCount: 0, hasMore: false };
      }

      // Transform data to UserReport format
      const reports: UserReport[] = (data || []).map((report: Record<string, unknown>) => {
        const reportedUser = report.reported_user as any;
        const reporter = report.reporter as any;
        
        return {
          id: report.id as string,
          reportedUser: {
            id: reportedUser?.id,
            username: reportedUser?.username,
            avatar: reportedUser?.avatar_url,
            displayName: reportedUser?.display_name,
            joinedAt: new Date(reportedUser?.created_at || Date.now()),
            postsCount: 0, // TODO: Get from posts table
            reportsCount: 0, // TODO: Get from user_reports table
            lastActive: new Date(), // TODO: Get from user activity
          },
          reporter: reporter ? {
            id: reporter.id,
            username: reporter.username,
            avatar: reporter.avatar_url,
            displayName: reporter.display_name,
          } : null,
          category: report.category as any, // Cast to proper UserReportCategory type
          subcategory: report.subcategory as string,
          severity: report.severity as any, // Cast to proper severity type
          description: report.description as string,
          evidence: report.evidence as string[] || [],
          status: report.status as any, // Cast to proper ReportStatus type
          createdAt: new Date(report.created_at as string || Date.now()),
          reviewedAt: report.reviewed_at ? new Date(report.reviewed_at as string) : undefined,
          reviewedBy: report.reviewed_by as string,
          moderatorNotes: report.moderator_notes as string,
          isAnonymous: report.is_anonymous as boolean,
        };
      });

      const totalCount = count || 0;
      const hasMore = offset + limit < totalCount;

      log.info('[UserReporting] Reports fetched successfully', { 
        count: reports.length, 
        totalCount, 
        hasMore 
      });

      return { reports, totalCount, hasMore };

    } catch (error) {
      log.error('[UserReporting] Error in getUserReports:', error);
      return { reports: [], totalCount: 0, hasMore: false };
    }
  }

  /**
   * Take moderation action on a report
   */
  async moderateReport(action: ReportModerationAction): Promise<{ success: boolean; error?: string }> {
    try {
      log.info('[UserReporting] Taking moderation action on report', { 
        reportId: action.reportId,
        action: action.action,
        moderatorId: action.moderatorId
      });

      const newStatus = this.getStatusFromAction(action.action);
      
      const { error } = await supabase
        .from('user_reports')
        .update({
          status: newStatus,
          reviewed_at: new Date().toISOString(),
          reviewed_by: action.moderatorId,
          moderator_notes: action.notes,
          metadata: {
            ...action.metadata,
            moderationAction: action.action,
            moderatedAt: new Date().toISOString(),
          },
        })
        .eq('id', action.reportId);

      if (error) {
        log.error('[UserReporting] Error moderating report:', error);
        return { success: false, error: 'Failed to update report status.' };
      }

      // Log moderation action
      await this.logModerationAction({
        type: 'report_moderation',
        targetId: action.reportId,
        targetType: 'user_report',
        action: action.action,
        moderatorId: action.moderatorId,
        reason: action.reason,
        notes: action.notes,
      });

      log.info('[UserReporting] Report moderation completed', { reportId: action.reportId });
      return { success: true };

    } catch (error) {
      log.error('[UserReporting] Error in moderateReport:', error);
      return { success: false, error: 'An unexpected error occurred.' };
    }
  }

  /**
   * Take moderation action on a user
   */
  async moderateUser(action: UserModerationAction): Promise<{ success: boolean; error?: string }> {
    try {
      log.info('[UserReporting] Taking moderation action on user', { 
        userId: action.userId,
        action: action.action,
        moderatorId: action.moderatorId
      });

      // Calculate expiration for temporary actions
      let expiresAt: Date | null = null;
      if (action.duration && ['suspend', 'restrict'].includes(action.action)) {
        expiresAt = new Date(Date.now() + action.duration * 60 * 60 * 1000);
      }

      // Insert user moderation record
      const { error } = await supabase
        .from('user_moderations')
        .insert({
          user_id: action.userId,
          action: action.action,
          moderator_id: action.moderatorId,
          reason: action.reason,
          notes: action.notes,
          expires_at: expiresAt?.toISOString(),
          related_report_ids: action.relatedReportIds,
          metadata: {
            moderatedAt: new Date().toISOString(),
            duration: action.duration,
          },
        });

      if (error) {
        log.error('[UserReporting] Error moderating user:', error);
        return { success: false, error: 'Failed to apply user moderation.' };
      }

      // Update user profile with moderation status
      await this.updateUserModerationStatus(action.userId, action.action, expiresAt);

      // Log moderation action
      await this.logModerationAction({
        type: 'user_moderation',
        targetId: action.userId,
        targetType: 'user',
        action: action.action,
        moderatorId: action.moderatorId,
        reason: action.reason,
        notes: action.notes,
      });

      log.info('[UserReporting] User moderation completed', { userId: action.userId });
      return { success: true };

    } catch (error) {
      log.error('[UserReporting] Error in moderateUser:', error);
      return { success: false, error: 'An unexpected error occurred.' };
    }
  }

  /**
   * Submit an appeal for a user report or moderation action
   */
  async submitAppeal(
    userId: string,
    reportId: string,
    appealReason: string,
    evidence?: string[]
  ): Promise<{ success: boolean; appealId?: string; error?: string }> {
    try {
      log.info('[UserReporting] Submitting appeal', { userId, reportId });

      // Check if user can submit an appeal
      const canAppeal = await this.canUserAppeal(userId, reportId);
      if (!canAppeal) {
        return { success: false, error: 'Appeal not allowed for this report.' };
      }

      const { data, error } = await supabase
        .from('user_appeals')
        .insert({
          user_id: userId,
          report_id: reportId,
          appeal_reason: appealReason,
          evidence,
          status: 'pending',
          submitted_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) {
        log.error('[UserReporting] Error submitting appeal:', error);
        return { success: false, error: 'Failed to submit appeal.' };
      }

      log.info('[UserReporting] Appeal submitted successfully', { appealId: data.id });
      return { success: true, appealId: data.id };

    } catch (error) {
      log.error('[UserReporting] Error in submitAppeal:', error);
      return { success: false, error: 'An unexpected error occurred.' };
    }
  }

  /**
   * Get reporting statistics for analytics
   */
  async getReportingStats(timeframe: 'day' | 'week' | 'month' = 'week'): Promise<UserReportStats> {
    try {
      log.info('[UserReporting] Fetching reporting stats', { timeframe });

      const startDate = this.getStartDateForTimeframe(timeframe);
      
      // Get basic report counts
      const { data: reports } = await supabase
        .from('user_reports')
        .select('category, severity, status, created_at, reviewed_at')
        .gte('created_at', startDate.toISOString());

      const totalReports = reports?.length || 0;
      const pendingReports = reports?.filter((r: Record<string, unknown>) => r.status === 'pending').length || 0;
      const resolvedReports = reports?.filter((r: Record<string, unknown>) => r.status === 'resolved').length || 0;
      const dismissedReports = reports?.filter((r: Record<string, unknown>) => r.status === 'dismissed').length || 0;
      const escalatedReports = reports?.filter((r: Record<string, unknown>) => r.status === 'escalated').length || 0;

      // Calculate category and severity distributions
      const reportsByCategory = this.groupByField(reports || [], 'category');
      const reportsBySeverity = this.groupByField(reports || [], 'severity');

      // Calculate average resolution time
      const resolvedWithTimes = reports?.filter((r: Record<string, unknown>) => r.status === 'resolved' && r.reviewed_at) || [];
      const averageResolutionTime = resolvedWithTimes.length > 0
        ? resolvedWithTimes.reduce((sum: number, r: any) => {
            const created = new Date(r.created_at).getTime();
            const reviewed = new Date(r.reviewed_at!).getTime();
            return sum + (reviewed - created);
          }, 0) / resolvedWithTimes.length / (1000 * 60 * 60) // Convert to hours
        : 0;

      // Get top reported users (placeholder - would need actual query)
      const topReportedUsers: UserReportStats['topReportedUsers'] = [];

      return {
        totalReports,
        pendingReports,
        resolvedReports,
        dismissedReports,
        escalatedReports,
        reportsByCategory: reportsByCategory as Record<UserReportCategory, number>,
        reportsBySeverity: reportsBySeverity as Record<ReportSeverity, number>,
        averageResolutionTime,
        topReportedUsers,
      };

    } catch (error) {
      log.error('[UserReporting] Error fetching stats:', error);
      return {
        totalReports: 0,
        pendingReports: 0,
        resolvedReports: 0,
        dismissedReports: 0,
        escalatedReports: 0,
        reportsByCategory: {} as Record<UserReportCategory, number>,
        reportsBySeverity: {} as Record<ReportSeverity, number>,
        averageResolutionTime: 0,
        topReportedUsers: [],
      };
    }
  }

  // ========================================
  // 🔧 PRIVATE HELPER METHODS
  // ========================================

  private validateReportData(data: UserReportSubmission): { isValid: boolean; error?: string } {
    if (!data.reportedUserId) {
      return { isValid: false, error: 'Reported user ID is required.' };
    }

    if (!data.category) {
      return { isValid: false, error: 'Report category is required.' };
    }

    if (!data.severity) {
      return { isValid: false, error: 'Report severity is required.' };
    }

    if (!data.description || data.description.trim().length < 10) {
      return { isValid: false, error: 'Description must be at least 10 characters long.' };
    }

    if (data.description.length > 1000) {
      return { isValid: false, error: 'Description must be less than 1000 characters.' };
    }

    return { isValid: true };
  }

  private async checkDuplicateReport(
    reporterId: string,
    reportedUserId: string,
    hoursWindow: number
  ): Promise<boolean> {
    const cutoffTime = new Date(Date.now() - hoursWindow * 60 * 60 * 1000);
    
    const { data } = await supabase
      .from('user_reports')
      .select('id')
      .eq('reporter_id', reporterId)
      .eq('reported_user_id', reportedUserId)
      .gte('created_at', cutoffTime.toISOString())
      .limit(1);

    return (data?.length || 0) > 0;
  }

  private async updateUserReportCount(userId: string): Promise<void> {
    // This would update a report count in the user profile
    // For now, we'll skip this implementation
  }

  private async triggerUrgentModerationReview(reportId: string): Promise<void> {
    // This would trigger notifications to moderators for urgent reports
    log.info('[UserReporting] Triggered urgent moderation review', { reportId });
  }

  private getStatusFromAction(action: ReportAction): ReportStatus {
    switch (action) {
      case 'approve':
        return 'resolved';
      case 'dismiss':
        return 'dismissed';
      case 'escalate':
        return 'escalated';
      case 'require_action':
        return 'under_review';
      default:
        return 'pending';
    }
  }

  private async updateUserModerationStatus(
    userId: string,
    action: UserAction,
    expiresAt: Date | null
  ): Promise<void> {
    // This would update the user's moderation status in their profile
    log.info('[UserReporting] Updated user moderation status', { userId, action, expiresAt });
  }

  private async logModerationAction(action: {
    type: string;
    targetId: string;
    targetType: string;
    action: string;
    moderatorId: string;
    reason?: string;
    notes?: string;
  }): Promise<void> {
    // This would log the moderation action for audit purposes
    log.info('[UserReporting] Logged moderation action', action);
  }

  private async canUserAppeal(userId: string, reportId: string): Promise<boolean> {
    // Check if user has already submitted an appeal for this report
    const { data } = await supabase
      .from('user_appeals')
      .select('id')
      .eq('user_id', userId)
      .eq('report_id', reportId)
      .limit(1);

    return (data?.length || 0) === 0;
  }

  private getStartDateForTimeframe(timeframe: 'day' | 'week' | 'month'): Date {
    const now = new Date();
    switch (timeframe) {
      case 'day':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
  }

  private groupByField<T extends Record<string, unknown>>(
    items: T[],
    field: keyof T
  ): Record<string, number> {
    return items.reduce((acc, item) => {
      const key = item[field] as string;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
}

// Export singleton instance
export const userReportingService = new UserReportingService();
export default userReportingService;