# Database Backup and Rollback System
## Automated Migration Safety for Community Data

This guide covers the automated database backup and rollback system implemented for the community data migration (Task 3.18). The system provides comprehensive safety measures for database migrations with automated health monitoring and recovery procedures.

## 📋 Table of Contents

1. [Overview](#overview)
2. [System Components](#system-components)
3. [Pre-Migration Backup](#pre-migration-backup)
4. [Health Monitoring](#health-monitoring)
5. [Rollback Procedures](#rollback-procedures)
6. [Command Reference](#command-reference)
7. [Emergency Procedures](#emergency-procedures)
8. [Best Practices](#best-practices)

## 🎯 Overview

The backup and rollback system ensures safe database migrations by:

- ✅ **Automated pre-migration backups** with data integrity checks
- ✅ **Real-time health monitoring** during and after migrations
- ✅ **Automated rollback procedures** with confirmation safeguards
- ✅ **Data validation** and integrity verification
- ✅ **Comprehensive logging** and audit trails
- ✅ **Recovery documentation** and step-by-step guidance

### Key Features

- **Zero Data Loss**: Comprehensive backups before any migration
- **Health Monitoring**: Continuous validation of data integrity
- **Safe Rollbacks**: Multi-step confirmation for rollback procedures
- **Audit Trail**: Complete logging of all backup and rollback operations
- **CLI Interface**: Easy-to-use command-line tools for operations
- **Status Reporting**: Detailed migration status and health reports

## 🏗️ System Components

### 1. DatabaseBackupRollbackSystem
Core class providing all backup, rollback, and monitoring functionality.

**Location**: `scripts/backup-rollback-system.ts`

**Key Methods**:
- `createPreMigrationBackup()` - Create comprehensive data backup
- `validateMigrationHealth()` - Check system health and data integrity
- `generateRollbackPlan()` - Create detailed rollback procedure
- `executeRollback()` - Execute rollback with confirmation
- `startMigrationMonitoring()` - Begin continuous health monitoring

### 2. Migration CLI Tool
Command-line interface for easy backup and rollback operations.

**Location**: `scripts/migration-cli.ts`

**Available Commands**:
```bash
npm run migration:backup <migration-name>      # Create backup
npm run migration:health-check                 # Check system health
npm run migration:rollback <backup-id>         # Execute rollback
npm run migration:monitor [interval-minutes]   # Start monitoring
npm run migration:status                       # Show status report
npm run migration:help                         # Show help
```

### 3. Backup Storage Structure
```
project-root/
├── backups/
│   ├── pre-migration/           # Pre-migration backups
│   │   ├── backup_<timestamp>_<migration>.json
│   │   └── backup_<timestamp>_<migration>_metadata.json
│   ├── post-migration/          # Post-migration backups
│   ├── rollback_plan_<backup-id>.json
│   ├── migration-log.json       # Comprehensive event log
│   └── migration_status_<timestamp>.md
```

## 📦 Pre-Migration Backup

### Creating a Backup

```bash
# Create backup before migration
npm run migration:backup "remove_legacy_posts"
```

### What Gets Backed Up

The system backs up all critical tables:
- `community_questions` - New questions table
- `community_plant_shares` - New plant shares table  
- `posts` - Legacy posts table (if still exists)
- `profiles` - User profiles
- `plants` - Plant data
- `diary_entries` - User diary entries

### Backup Metadata

Each backup includes:
- **Unique ID** for rollback reference
- **Timestamp** of backup creation
- **Table list** and record counts
- **Data checksums** for integrity verification
- **Migration target** name for tracking
- **Size information** for storage planning

### Example Backup Process

```bash
$ npm run migration:backup "remove_legacy_posts"

🚀 Community Migration CLI Tool
================================

📦 Creating backup for migration: remove_legacy_posts
🤔 This will create a comprehensive backup of all community data. Continue? (y/N): y

🔄 Creating pre-migration backup: backup_1642678901234_remove_legacy_posts
📊 Backing up table: community_questions
✅ Backed up 142 records from community_questions
📊 Backing up table: community_plant_shares  
✅ Backed up 89 records from community_plant_shares
📊 Backing up table: posts
✅ Backed up 231 records from posts
📊 Backing up table: profiles
✅ Backed up 67 records from profiles
📊 Backing up table: plants
✅ Backed up 45 records from plants
📊 Backing up table: diary_entries
✅ Backed up 189 records from diary_entries

✅ Backup completed: backup_1642678901234_remove_legacy_posts (12.45MB)

🔍 Running post-backup health check...
✅ System health: OK

💡 Next steps:
1. Proceed with your migration
2. Run health checks during migration
3. Use this backup ID for rollback if needed:
   npm run migration:rollback backup_1642678901234_remove_legacy_posts
```

## 🔍 Health Monitoring

### Manual Health Check

```bash
npm run migration:health-check
```

### Continuous Monitoring

```bash
# Monitor every 5 minutes (default)
npm run migration:monitor

# Monitor every 10 minutes
npm run migration:monitor 10
```

### Health Check Components

1. **Table Existence**: Verify all required tables exist
2. **Data Integrity**: Check constraints and required fields
3. **Record Counts**: Monitor data volume changes
4. **Foreign Key Validation**: Ensure referential integrity
5. **Performance Metrics**: Monitor query performance

### Example Health Check Output

```bash
$ npm run migration:health-check

🔍 Running comprehensive health check...

📊 Health Check Results
=======================
🕐 Timestamp: 2025-01-15T14:30:45.123Z
📋 Tables Exist: ✅
🔒 Data Integrity: ✅

📈 Record Counts:
   community_questions: 142 records
   community_plant_shares: 89 records
   profiles: 67 records

✅ No errors detected

🎯 Overall Status: 🟢 HEALTHY
```

## 🔄 Rollback Procedures

### When to Use Rollback

Consider rollback when:
- ❌ Migration fails or produces errors
- ❌ Data integrity issues are detected
- ❌ Application functionality is broken
- ❌ Performance degradation occurs
- ❌ User-reported issues arise

### Rollback Process

```bash
npm run migration:rollback <backup-id>
```

### Safety Confirmations

The rollback process requires multiple confirmations:

1. **Data Loss Understanding**: Confirm understanding of implications
2. **Final Confirmation**: Explicit "yes" to proceed
3. **Confirmation Code**: Enter generated code to execute

### Example Rollback

```bash
$ npm run migration:rollback backup_1642678901234_remove_legacy_posts

🔄 Preparing rollback for backup: backup_1642678901234_remove_legacy_posts

📋 Rollback Plan
================
⏱️  Estimated Time: 15-30 minutes
📝 Steps: 7

🚨 DATA LOSS WARNING:
⚠️  WARNING: Rolling back will:
1. Lose any data created in community_questions and community_plant_shares after the backup
2. Restore the legacy posts table structure
3. Require re-running the migration if you want to proceed again
4. May cause temporary service disruption

Backup created: 2025-01-15T12:00:00.000Z
Tables affected: community_questions, community_plant_shares, posts, profiles, plants, diary_entries
Data size: 12.45MB

📝 Rollback Steps:
   1. [🟡 Standard] Create backup of current state before rollback
   2. [🟡 Standard] Disable triggers and constraints temporarily
   3. [🔴 CRITICAL] Clear current data from new tables
   4. [🔴 CRITICAL] Restore legacy posts table if needed
   5. [🔴 CRITICAL] Restore backed up data
   6. [🟡 Standard] Re-enable triggers and constraints
   7. [🔴 CRITICAL] Verify data integrity after rollback

❓ Do you understand the data loss implications? (yes/no): yes
❓ Are you absolutely sure you want to proceed with rollback? (yes/no): yes
❓ Please enter the confirmation code to proceed: ROLLBACK_01234567
   Code: ROLLBACK_01234567

🔄 Starting rollback procedure...
⚠️  DO NOT INTERRUPT THIS PROCESS

📝 Step 1: Create backup of current state before rollback
✅ Step 1 completed
📝 Step 2: Disable triggers and constraints temporarily
✅ Step 2 completed
📝 Step 3: Clear current data from new tables
✅ Step 3 completed
📝 Step 4: Restore legacy posts table if needed
✅ Step 4 completed
📝 Step 5: Restore backed up data
✅ Step 5 completed
📝 Step 6: Re-enable triggers and constraints
✅ Step 6 completed
📝 Step 7: Verify data integrity after rollback
✅ Step 7 completed

✅ Rollback completed successfully in 8.3 seconds

🔍 Running post-rollback health check...
✅ Post-rollback health check: OK

💡 Next steps:
1. Verify application functionality
2. Check user-facing features
3. Monitor for any issues
4. Plan migration retry if needed
```

## 📚 Command Reference

### Backup Commands

```bash
# Create backup before migration
npm run migration:backup "migration_name"

# Examples
npm run migration:backup "remove_legacy_posts"
npm run migration:backup "add_new_constraints" 
npm run migration:backup "schema_update_v2"
```

### Health Check Commands

```bash
# Single health check
npm run migration:health-check

# Continuous monitoring (every 5 minutes)
npm run migration:monitor

# Continuous monitoring (custom interval)
npm run migration:monitor 10  # Every 10 minutes
npm run migration:monitor 1   # Every 1 minute
```

### Rollback Commands

```bash
# Execute rollback (requires backup ID)
npm run migration:rollback backup_1642678901234_migration_name

# Find available backup IDs
npm run migration:status
```

### Status and Information

```bash
# Show detailed status report
npm run migration:status

# Show help and usage
npm run migration:help
```

## 🚨 Emergency Procedures

### Critical Migration Failure

If a migration fails catastrophically:

1. **Immediate Response**
   ```bash
   # Check current system health
   npm run migration:health-check
   
   # Get status and available backups
   npm run migration:status
   ```

2. **Assess Severity**
   - Review health check errors
   - Check application functionality
   - Monitor user impact

3. **Execute Emergency Rollback**
   ```bash
   # Use most recent backup
   npm run migration:rollback <backup-id>
   ```

### Service Restoration

After emergency rollback:

1. **Verify Service**
   - Test application functionality
   - Check user-facing features
   - Monitor performance metrics

2. **Communication**
   - Notify stakeholders of resolution
   - Document incident details
   - Plan migration retry

3. **Post-Incident Analysis**
   - Review logs and error details
   - Identify root cause
   - Update migration procedures

### Data Corruption Detection

If data corruption is suspected:

1. **Immediate Assessment**
   ```bash
   npm run migration:health-check
   ```

2. **Stop Ongoing Operations**
   - Halt any running migrations
   - Stop continuous monitoring
   - Pause application updates

3. **Emergency Backup**
   ```bash
   npm run migration:backup "emergency_$(date +%s)"
   ```

4. **Execute Rollback**
   Follow standard rollback procedures with most recent clean backup

## 📈 Best Practices

### Before Migration

- ✅ **Always create backup** before any schema changes
- ✅ **Run health check** to establish baseline
- ✅ **Document migration plan** with expected changes
- ✅ **Test migration** in staging environment first
- ✅ **Verify environment variables** are correctly set

### During Migration

- ✅ **Monitor health continuously** during long migrations
- ✅ **Keep backup IDs** readily available
- ✅ **Watch for performance degradation**
- ✅ **Have rollback plan ready**
- ✅ **Communicate with team** about migration progress

### After Migration

- ✅ **Run comprehensive health check**
- ✅ **Test application functionality**
- ✅ **Monitor for 24-48 hours**
- ✅ **Document any issues**
- ✅ **Clean up old backups** after stability confirmed

### Rollback Considerations

- ⚠️ **Understand data loss implications** before rollback
- ⚠️ **Communicate with stakeholders** about potential downtime
- ⚠️ **Have fix-forward plan** ready as alternative
- ⚠️ **Test rollback procedure** in staging first
- ⚠️ **Monitor system closely** after rollback

### Environment Setup

Ensure these environment variables are set:

```bash
# Required for backup/rollback operations
EXPO_PUBLIC_SUPABASE_URL=your_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Storage Management

- 📁 **Regular cleanup** of old backups (keep last 10)
- 📁 **Monitor disk space** for backup storage
- 📁 **Archive important backups** for long-term retention
- 📁 **Test backup restoration** periodically

## 🔧 Troubleshooting

### Common Issues

**Environment Variables Not Set**
```bash
❌ Missing required environment variables:
   EXPO_PUBLIC_SUPABASE_URL
   SUPABASE_SERVICE_ROLE_KEY
```
*Solution*: Set environment variables in your `.env` file

**Backup Creation Fails**
```bash
❌ Backup failed: Failed to backup posts: relation "posts" does not exist
```
*Solution*: Normal if table doesn't exist; backup continues with other tables

**Health Check Shows Errors**
```bash
⚠️ Health issues detected: 3 errors
```
*Solution*: Run `npm run migration:health-check` for detailed error list

**Rollback Confirmation Code Rejected**
```bash
❌ Invalid confirmation code - rollback cancelled
```
*Solution*: Enter exact code shown (case-sensitive)

### Getting Help

1. **Check Status**: `npm run migration:status`
2. **Review Logs**: Check `backups/migration-log.json`
3. **Health Check**: `npm run migration:health-check`
4. **Documentation**: This guide and inline help
5. **Team Escalation**: Contact development team with backup ID and error details

## 📝 Migration Log Example

The system maintains detailed logs of all operations:

```json
{
  "timestamp": "2025-01-15T14:30:45.123Z",
  "event": "backup-created",
  "details": {
    "backupId": "backup_1642678901234_remove_legacy_posts",
    "migrationName": "remove_legacy_posts",
    "tablesBackedUp": 6,
    "totalRecords": 763,
    "sizeBytes": 13058127
  }
}
```

This comprehensive backup and rollback system ensures safe database migrations while providing peace of mind and rapid recovery capabilities for the community data migration project. 