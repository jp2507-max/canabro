/**
 * Data Consistency Checker (2025 Standards)
 * 
 * Implements comprehensive data integrity validation for community features
 * with automated repair capabilities and detailed reporting.
 */

import { Observable, Subject } from 'rxjs';

import database from '../database/database';
import { log } from '../utils/logger';
import { generateId } from './sync/utils';

interface ConsistencyIssue {
  id: string;
  type: 'missing_reference' | 'orphaned_record' | 'data_mismatch' | 'timestamp_inconsistency' | 'duplicate_record';
  severity: 'low' | 'medium' | 'high' | 'critical';
  table: string;
  recordId: string;
  description: string;
  details: Record<string, unknown>;
  autoRepairable: boolean;
  timestamp: number;
}

interface ConsistencyReport {
  id: string;
  timestamp: number;
  duration: number;
  tablesChecked: string[];
  totalRecords: number;
  issuesFound: ConsistencyIssue[];
  issuesRepaired: ConsistencyIssue[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    repaired: number;
  };
}

interface ValidationRule {
  name: string;
  table: string;
  check: (record: Record<string, unknown> | null) => Promise<ConsistencyIssue[]>;
  repair?: (issue: ConsistencyIssue) => Promise<boolean>;
}

/**
 * Data Consistency Checker for Community Features
 */
export class DataConsistencyChecker {
  private validationRules: ValidationRule[] = [];
  private checkInProgress = false;
  private lastReport: ConsistencyReport | null = null;
  private issueSubject = new Subject<ConsistencyIssue>();

  constructor() {
    this.initializeValidationRules();
  }

  /**
   * Perform comprehensive data consistency check
   */
  async performConsistencyCheck(options: {
    tables?: string[];
    autoRepair?: boolean;
    includeOrphans?: boolean;
  } = {}): Promise<ConsistencyReport> {
    if (this.checkInProgress) {
      throw new Error('Consistency check already in progress');
    }

    this.checkInProgress = true;
    const startTime = Date.now();
    const reportId = generateId();

    log.info('Starting data consistency check', { reportId, options });

    try {
      const {
        tables = ['messages', 'conversations', 'notifications', 'user_profiles', 'social_groups'],
        autoRepair = false,
        includeOrphans = true,
      } = options;

      const allIssues: ConsistencyIssue[] = [];
      const repairedIssues: ConsistencyIssue[] = [];
      let totalRecords = 0;

      // Check each table
      for (const tableName of tables) {
        try {
          const tableIssues = await this.checkTable(tableName, includeOrphans);
          allIssues.push(...tableIssues);

          // Count records in table
          const collection = database.get(tableName);
          const records = await collection.query().fetch();
          totalRecords += records.length;

          log.debug('Table checked', { 
            table: tableName, 
            records: records.length, 
            issues: tableIssues.length 
          });
        } catch (error) {
          log.error('Table check failed', { table: tableName, error });
          
          // Create issue for table check failure
          allIssues.push({
            id: generateId(),
            type: 'data_mismatch',
            severity: 'high',
            table: tableName,
            recordId: 'N/A',
            description: `Failed to check table: ${error instanceof Error ? error.message : String(error)}`,
            details: { error: String(error) },
            autoRepairable: false,
            timestamp: Date.now(),
          });
        }
      }

      // Perform cross-table validation
      const crossTableIssues = await this.performCrossTableValidation(tables);
      allIssues.push(...crossTableIssues);

      // Auto-repair issues if requested
      if (autoRepair) {
        for (const issue of allIssues) {
          if (issue.autoRepairable) {
            try {
              const repaired = await this.repairIssue(issue);
              if (repaired) {
                repairedIssues.push(issue);
                log.debug('Issue auto-repaired', { issueId: issue.id });
              }
            } catch (error) {
              log.error('Auto-repair failed', { issueId: issue.id, error });
            }
          }
        }
      }

      // Generate report
      const duration = Date.now() - startTime;
      const report: ConsistencyReport = {
        id: reportId,
        timestamp: startTime,
        duration,
        tablesChecked: tables,
        totalRecords,
        issuesFound: allIssues,
        issuesRepaired: repairedIssues,
        summary: this.generateSummary(allIssues, repairedIssues),
      };

      this.lastReport = report;

      log.info('Data consistency check completed', {
        reportId,
        duration,
        totalIssues: allIssues.length,
        repaired: repairedIssues.length,
      });

      return report;
    } finally {
      this.checkInProgress = false;
    }
  }

  /**
   * Get observable for real-time issue notifications
   */
  getIssueStream(): Observable<ConsistencyIssue> {
    return this.issueSubject.asObservable();
  }

  /**
   * Get the last consistency report
   */
  getLastReport(): ConsistencyReport | null {
    return this.lastReport;
  }

  /**
   * Repair a specific issue
   */
  async repairIssue(issue: ConsistencyIssue): Promise<boolean> {
    if (!issue.autoRepairable) {
      throw new Error('Issue is not auto-repairable');
    }

    const rule = this.validationRules.find(r => 
      r.table === issue.table && r.repair
    );

    if (!rule || !rule.repair) {
      throw new Error('No repair function available for this issue type');
    }

    try {
      const repaired = await rule.repair(issue);
      
      if (repaired) {
        log.info('Issue repaired successfully', { issueId: issue.id });
      }

      return repaired;
    } catch (error) {
      log.error('Issue repair failed', { issueId: issue.id, error });
      throw error;
    }
  }

  /**
   * Validate message integrity
   */
  async validateMessages(): Promise<ConsistencyIssue[]> {
    const issues: ConsistencyIssue[] = [];

    try {
      const messages = await database.get('messages').query().fetch();

      for (const message of messages) {
        const messageRecord = message as any; // Cast to access properties
        
        // Check required fields
        if (!messageRecord.content || !messageRecord.senderId || !messageRecord.threadId) {
          issues.push({
            id: generateId(),
            type: 'data_mismatch',
            severity: 'high',
            table: 'messages',
            recordId: message.id,
            description: 'Message missing required fields',
            details: {
              hasContent: !!messageRecord.content,
              hasSenderId: !!messageRecord.senderId,
              hasThreadId: !!messageRecord.threadId,
            },
            autoRepairable: false,
            timestamp: Date.now(),
          });
        }

        // Check timestamp validity
        if (!messageRecord.sentAt || messageRecord.sentAt.getTime() > Date.now()) {
          issues.push({
            id: generateId(),
            type: 'timestamp_inconsistency',
            severity: 'medium',
            table: 'messages',
            recordId: message.id,
            description: 'Invalid message timestamp',
            details: {
              sentAt: messageRecord.sentAt?.getTime(),
              currentTime: Date.now(),
            },
            autoRepairable: true,
            timestamp: Date.now(),
          });
        }

        // Check for conversation thread existence
        try {
          await database.get('conversation_threads').find(messageRecord.threadId);
          // If we reach here, conversation exists
        } catch (error) {
          // Conversation doesn't exist
          issues.push({
            id: generateId(),
            type: 'missing_reference',
            severity: 'high',
            table: 'messages',
            recordId: message.id,
            description: 'Message references non-existent conversation thread',
            details: {
              threadId: messageRecord.threadId,
              error: String(error),
            },
            autoRepairable: false,
            timestamp: Date.now(),
          });
        }
      }
    } catch (error) {
      log.error('Message validation failed', { error });
    }

    return issues;
  }

  /**
   * Check for orphaned records
   */
  async checkOrphanedRecords(tableName: string): Promise<ConsistencyIssue[]> {
    const issues: ConsistencyIssue[] = [];

    try {
      switch (tableName) {
        case 'messages': {
          // Check for messages without conversation threads
          const messages = await database.get('messages').query().fetch();
          const threadIds = new Set(
            (await database.get('conversation_threads').query().fetch()).map(c => c.id)
          );

          for (const message of messages) {
            const messageRecord = message as any;
            if (!threadIds.has(messageRecord.threadId)) {
              issues.push({
                id: generateId(),
                type: 'orphaned_record',
                severity: 'medium',
                table: 'messages',
                recordId: message.id,
                description: 'Orphaned message without conversation thread',
                details: {
                  threadId: messageRecord.threadId,
                },
                autoRepairable: true,
                timestamp: Date.now(),
              });
            }
          }
          break;
        }

        case 'notifications': {
          // Check for notifications without users
          const notifications = await database.get('notifications').query().fetch();
          const userIds = new Set(
            (await database.get('profiles').query().fetch()).map(p => p.id)
          );

          for (const notification of notifications) {
            const notificationRecord = notification as any;
            if (!userIds.has(notificationRecord.userId)) {
              issues.push({
                id: generateId(),
                type: 'orphaned_record',
                severity: 'low',
                table: 'notifications',
                recordId: notification.id,
                description: 'Orphaned notification without user',
                details: {
                  userId: notificationRecord.userId,
                },
                autoRepairable: true,
                timestamp: Date.now(),
              });
            }
          }
          break;
        }
      }
    } catch (error) {
      log.error('Orphaned record check failed', { table: tableName, error });
    }

    return issues;
  }

  /**
   * Check for duplicate records
   */
  async checkDuplicateRecords(tableName: string): Promise<ConsistencyIssue[]> {
    const issues: ConsistencyIssue[] = [];

    try {
      const collection = database.get(tableName);
      const records = await collection.query().fetch();

      // Group records by potential duplicate keys
      const groups = new Map<string, any[]>();

      for (const record of records) {
        let key = '';
        
        switch (tableName) {
          case 'messages': {
            const messageRecord = record as any;
            key = `${messageRecord.threadId}_${messageRecord.senderId}_${messageRecord.sentAt?.getTime()}`;
            break;
          }
          case 'notifications': {
            const notificationRecord = record as any;
            key = `${notificationRecord.userId}_${notificationRecord.type}_${notificationRecord.createdAt?.getTime()}`;
            break;
          }
          case 'user_profiles': {
            const profileRecord = record as any;
            key = profileRecord.email || profileRecord.username;
            break;
          }
          default:
            continue;
        }

        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key)!.push(record);
      }

      // Find duplicates
      for (const [key, duplicates] of groups.entries()) {
        if (duplicates.length > 1) {
          for (let i = 1; i < duplicates.length; i++) {
            issues.push({
              id: generateId(),
              type: 'duplicate_record',
              severity: 'medium',
              table: tableName,
              recordId: duplicates[i].id,
              description: 'Duplicate record detected',
              details: {
                duplicateKey: key,
                originalId: duplicates[0].id,
                duplicateCount: duplicates.length,
              },
              autoRepairable: true,
              timestamp: Date.now(),
            });
          }
        }
      }
    } catch (error) {
      log.error('Duplicate record check failed', { table: tableName, error });
    }

    return issues;
  }

  // Private methods

  private initializeValidationRules(): void {
    this.validationRules = [
      {
        name: 'message_integrity',
        table: 'messages',
        check: async (record) => this.validateMessages(),
        repair: async (issue) => this.repairTimestampIssue(issue),
      },
      {
        name: 'orphaned_messages',
        table: 'messages',
        check: async () => this.checkOrphanedRecords('messages'),
        repair: async (issue) => this.repairOrphanedRecord(issue),
      },
      {
        name: 'duplicate_messages',
        table: 'messages',
        check: async () => this.checkDuplicateRecords('messages'),
        repair: async (issue) => this.repairDuplicateRecord(issue),
      },
      {
        name: 'orphaned_notifications',
        table: 'notifications',
        check: async () => this.checkOrphanedRecords('notifications'),
        repair: async (issue) => this.repairOrphanedRecord(issue),
      },
    ];
  }

  private async checkTable(tableName: string, includeOrphans: boolean): Promise<ConsistencyIssue[]> {
    const issues: ConsistencyIssue[] = [];

    // Run all validation rules for this table
    const tableRules = this.validationRules.filter(rule => rule.table === tableName);

    for (const rule of tableRules) {
      try {
        const ruleIssues = await rule.check(null);
        issues.push(...ruleIssues);
      } catch (error) {
        log.error('Validation rule failed', { rule: rule.name, table: tableName, error });
      }
    }

    return issues;
  }

  private async performCrossTableValidation(tables: string[]): Promise<ConsistencyIssue[]> {
    const issues: ConsistencyIssue[] = [];

    try {
      // Check referential integrity between tables
      if (tables.includes('messages') && tables.includes('conversations')) {
        const messageConversationIssues = await this.validateMessageConversationReferences();
        issues.push(...messageConversationIssues);
      }

      if (tables.includes('notifications') && tables.includes('user_profiles')) {
        const notificationUserIssues = await this.validateNotificationUserReferences();
        issues.push(...notificationUserIssues);
      }
    } catch (error) {
      log.error('Cross-table validation failed', { error });
    }

    return issues;
  }

  private async validateMessageConversationReferences(): Promise<ConsistencyIssue[]> {
    const issues: ConsistencyIssue[] = [];

    try {
      const messages = await database.get('messages').query().fetch();
      const threads = await database.get('conversation_threads').query().fetch();
      const threadIds = new Set(threads.map(c => c.id));

      for (const message of messages) {
        const messageRecord = message as any;
        if (!threadIds.has(messageRecord.threadId)) {
          issues.push({
            id: generateId(),
            type: 'missing_reference',
            severity: 'high',
            table: 'messages',
            recordId: message.id,
            description: 'Message references non-existent conversation thread',
            details: {
              threadId: messageRecord.threadId,
            },
            autoRepairable: false,
            timestamp: Date.now(),
          });
        }
      }
    } catch (error) {
      log.error('Message-thread validation failed', { error });
    }

    return issues;
  }

  private async validateNotificationUserReferences(): Promise<ConsistencyIssue[]> {
    const issues: ConsistencyIssue[] = [];

    try {
      const notifications = await database.get('notifications').query().fetch();
      const profiles = await database.get('profiles').query().fetch();
      const userIds = new Set(profiles.map(p => p.id));

      for (const notification of notifications) {
        const notificationRecord = notification as any;
        if (!userIds.has(notificationRecord.userId)) {
          issues.push({
            id: generateId(),
            type: 'missing_reference',
            severity: 'medium',
            table: 'notifications',
            recordId: notification.id,
            description: 'Notification references non-existent user',
            details: {
              userId: notificationRecord.userId,
            },
            autoRepairable: true,
            timestamp: Date.now(),
          });
        }
      }
    } catch (error) {
      log.error('Notification-user validation failed', { error });
    }

    return issues;
  }

  private async repairTimestampIssue(issue: ConsistencyIssue): Promise<boolean> {
    try {
      await database.write(async () => {
        const collection = database.get(issue.table);
        const record = await collection.find(issue.recordId);
        
        await record.update((r: any) => {
          if (issue.table === 'messages') {
            r.sentAt = new Date();
          } else {
            r.createdAt = new Date();
          }
        });
      });

      return true;
    } catch (error) {
      log.error('Timestamp repair failed', { issueId: issue.id, error });
      return false;
    }
  }

  private async repairOrphanedRecord(issue: ConsistencyIssue): Promise<boolean> {
    try {
      await database.write(async () => {
        const collection = database.get(issue.table);
        const record = await collection.find(issue.recordId);
        await record.destroyPermanently();
      });

      log.info('Orphaned record removed', { 
        table: issue.table, 
        recordId: issue.recordId 
      });
      
      return true;
    } catch (error) {
      log.error('Orphaned record repair failed', { issueId: issue.id, error });
      return false;
    }
  }

  private async repairDuplicateRecord(issue: ConsistencyIssue): Promise<boolean> {
    try {
      await database.write(async () => {
        const collection = database.get(issue.table);
        const record = await collection.find(issue.recordId);
        await record.destroyPermanently();
      });

      log.info('Duplicate record removed', { 
        table: issue.table, 
        recordId: issue.recordId 
      });
      
      return true;
    } catch (error) {
      log.error('Duplicate record repair failed', { issueId: issue.id, error });
      return false;
    }
  }

  private generateSummary(
    allIssues: ConsistencyIssue[], 
    repairedIssues: ConsistencyIssue[]
  ): ConsistencyReport['summary'] {
    const summary = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      repaired: repairedIssues.length,
    };

    for (const issue of allIssues) {
      summary[issue.severity]++;
    }

    return summary;
  }
}

// Export singleton instance
export const dataConsistencyChecker = new DataConsistencyChecker();

// Export types for external use
export type { ConsistencyIssue, ConsistencyReport };