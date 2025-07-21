# Production Infrastructure Setup - Design Document

## Overview

The Production Infrastructure Setup establishes the foundation for CanaBro's production deployment and ongoing operations. The system integrates with existing Expo SDK 53 and React Native 0.79 architecture while adding enterprise-grade deployment, monitoring, and analytics capabilities.

## Architecture

### Existing Foundation
- **Build System**: EAS Build configured for iOS and Android
- **Backend**: Supabase for database, authentication, and storage
- **Notifications**: Expo Notifications with basic setup
- **Development**: TypeScript, NativeWind v4, comprehensive component library

### Production Infrastructure Components
```
infrastructure/
├── deployment/
│   ├── EASUpdateManager.ts           # OTA update management
│   ├── StagedRolloutController.ts    # Gradual deployment control
│   ├── RollbackManager.ts            # Automatic rollback system
│   └── DeploymentValidator.ts        # Pre-deployment validation
├── notifications/
│   ├── PushNotificationService.ts    # Centralized notification service
│   ├── NotificationScheduler.ts      # Advanced scheduling system
│   ├── DeepLinkHandler.ts            # Notification deep linking
│   └── NotificationAnalytics.ts      # Notification performance tracking
├── analytics/
│   ├── AnalyticsService.ts           # Event tracking and reporting
│   ├── UserBehaviorTracker.ts        # User journey and behavior analysis
│   ├── PerformanceMonitor.ts         # App performance metrics
│   └── ConversionTracker.ts          # Feature adoption and conversion
├── monitoring/
│   ├── ErrorReporter.ts              # Comprehensive error reporting
│   ├── CrashAnalyzer.ts              # Crash analysis and categorization
│   ├── HealthChecker.ts              # System health monitoring
│   └── AlertManager.ts               # Intelligent alerting system
├── security/
│   ├── SecurityMonitor.ts            # Security event monitoring
│   ├── ComplianceTracker.ts          # Regulatory compliance tracking
│   ├── AuditLogger.ts                # Comprehensive audit logging
│   └── IncidentResponder.ts          # Security incident response
└── performance/
    ├── MetricsCollector.ts           # Performance data collection
    ├── PerformanceAnalyzer.ts        # Performance trend analysis
    ├── OptimizationSuggester.ts      # Automated optimization recommendations
    └── BenchmarkTracker.ts           # Performance benchmarking
```

## Components and Interfaces

### 1. Over-the-Air Updates System

#### EASUpdateManager Service
```typescript
interface UpdateConfig {
  channel: 'production' | 'staging' | 'development';
  rolloutPercentage: number;
  forceUpdate: boolean;
  minimumAppVersion?: string;
  updateMessage?: string;
  rollbackOnError: boolean;
}

interface UpdateStatus {
  isUpdateAvailable: boolean;
  isUpdatePending: boolean;
  updateSize?: number;
  updateVersion: string;
  isRollback: boolean;
  downloadProgress?: number;
}

class EASUpdateManager {
  static async checkForUpdates(): Promise<UpdateStatus> {
    // Check EAS servers for available updates
    // Compare current version with available updates
    // Return update status with metadata
  }

  static async downloadUpdate(
    onProgress?: (progress: number) => void
  ): Promise<boolean> {
    // Download update bundle with progress tracking
    // Validate update integrity
    // Prepare update for installation
  }

  static async applyUpdate(
    config: UpdateConfig
  ): Promise<boolean> {
    // Apply downloaded update
    // Handle staged rollout logic
    // Monitor for update success/failure
  }

  static async rollbackUpdate(): Promise<boolean> {
    // Rollback to previous stable version
    // Clear problematic update cache
    // Notify monitoring systems
  }
}
```

#### StagedRolloutController Service
```typescript
interface RolloutConfig {
  initialPercentage: number;
  incrementPercentage: number;
  incrementInterval: number; // hours
  maxPercentage: number;
  errorThreshold: number;
  rollbackThreshold: number;
}

interface RolloutStatus {
  currentPercentage: number;
  usersAffected: number;
  errorRate: number;
  successRate: number;
  nextIncrementTime?: Date;
  isHalted: boolean;
  rollbackTriggered: boolean;
}

class StagedRolloutController {
  static async startRollout(
    updateId: string,
    config: RolloutConfig
  ): Promise<void> {
    // Initialize staged rollout
    // Set up monitoring and metrics collection
    // Schedule percentage increments
  }

  static async monitorRollout(
    updateId: string
  ): Promise<RolloutStatus> {
    // Monitor rollout health and metrics
    // Check error rates and user feedback
    // Determine if rollout should continue or halt
  }

  static async haltRollout(
    updateId: string,
    reason: string
  ): Promise<void> {
    // Stop rollout progression
    // Prevent new users from receiving update
    // Notify development team
  }
}
```

### 2. Push Notification Infrastructure

#### PushNotificationService
```typescript
interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  badge?: number;
  sound?: string;
  category?: string;
  deepLink?: string;
  imageUrl?: string;
}

interface NotificationSchedule {
  trigger: 'immediate' | 'scheduled' | 'recurring';
  scheduledTime?: Date;
  recurringPattern?: RecurringPattern;
  timezone?: string;
}

interface RecurringPattern {
  frequency: 'daily' | 'weekly' | 'monthly';
  daysOfWeek?: number[];
  time: string; // HH:MM format
  endDate?: Date;
}

class PushNotificationService {
  static async requestPermissions(): Promise<boolean> {
    // Request notification permissions
    // Handle permission states and user preferences
    // Set up notification categories and actions
  }

  static async sendNotification(
    userId: string,
    payload: NotificationPayload,
    schedule?: NotificationSchedule
  ): Promise<string> {
    // Send push notification via Expo Push API
    // Handle scheduling and recurring notifications
    // Track delivery and engagement metrics
  }

  static async sendBulkNotifications(
    notifications: Array<{
      userId: string;
      payload: NotificationPayload;
      schedule?: NotificationSchedule;
    }>
  ): Promise<string[]> {
    // Send notifications in batches
    // Handle rate limiting and retry logic
    // Optimize for delivery performance
  }

  static async cancelNotification(
    notificationId: string
  ): Promise<boolean> {
    // Cancel scheduled notification
    // Remove from user's notification queue
    // Update analytics and tracking
  }
}
```

#### DeepLinkHandler Service
```typescript
interface DeepLinkConfig {
  scheme: string;
  host?: string;
  path: string;
  params?: Record<string, string>;
}

interface DeepLinkContext {
  source: 'notification' | 'url' | 'qr_code' | 'share';
  timestamp: Date;
  userId?: string;
  campaignId?: string;
}

class DeepLinkHandler {
  static async handleDeepLink(
    url: string,
    context: DeepLinkContext
  ): Promise<boolean> {
    // Parse deep link URL
    // Validate link authenticity and permissions
    // Navigate to appropriate screen with context
    // Track deep link engagement
  }

  static async generateDeepLink(
    config: DeepLinkConfig
  ): Promise<string> {
    // Generate deep link URL
    // Add tracking parameters
    // Ensure link validity and expiration
  }

  static async trackDeepLinkEngagement(
    url: string,
    context: DeepLinkContext,
    outcome: 'success' | 'failure' | 'ignored'
  ): Promise<void> {
    // Track deep link performance
    // Analyze conversion rates
    // Optimize link generation
  }
}
```

### 3. Analytics and User Behavior Tracking

#### AnalyticsService
```typescript
interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  userId?: string;
  sessionId: string;
  timestamp: Date;
  screen?: string;
  category?: string;
}

interface UserProperties {
  userId: string;
  growingExperience: 'beginner' | 'intermediate' | 'advanced';
  plantCount: number;
  subscriptionTier?: string;
  lastActiveDate: Date;
  preferredLanguage: string;
  deviceInfo: DeviceInfo;
}

interface ConversionFunnel {
  name: string;
  steps: FunnelStep[];
  timeWindow: number; // hours
}

interface FunnelStep {
  name: string;
  eventName: string;
  requiredProperties?: Record<string, any>;
}

class AnalyticsService {
  static async trackEvent(event: AnalyticsEvent): Promise<void> {
    // Send event to analytics platform
    // Ensure data privacy compliance
    // Handle offline event queuing
  }

  static async setUserProperties(
    properties: UserProperties
  ): Promise<void> {
    // Update user profile in analytics
    // Sync with user preferences
    // Maintain data consistency
  }

  static async trackScreen(
    screenName: string,
    properties?: Record<string, any>
  ): Promise<void> {
    // Track screen views and navigation
    // Measure time spent on screens
    // Analyze user journey patterns
  }

  static async trackConversion(
    funnelName: string,
    stepName: string,
    properties?: Record<string, any>
  ): Promise<void> {
    // Track conversion funnel progress
    // Identify drop-off points
    // Optimize conversion rates
  }
}
```

#### PerformanceMonitor Service
```typescript
interface PerformanceMetrics {
  appStartTime: number;
  screenLoadTime: number;
  apiResponseTime: number;
  memoryUsage: number;
  cpuUsage: number;
  networkLatency: number;
  crashCount: number;
  errorCount: number;
}

interface PerformanceBenchmark {
  metric: keyof PerformanceMetrics;
  target: number;
  warning: number;
  critical: number;
  unit: string;
}

class PerformanceMonitor {
  static async collectMetrics(): Promise<PerformanceMetrics> {
    // Collect real-time performance metrics
    // Monitor system resource usage
    // Track API and database performance
  }

  static async setBenchmarks(
    benchmarks: PerformanceBenchmark[]
  ): Promise<void> {
    // Set performance targets and thresholds
    // Configure alerting rules
    // Enable automated optimization
  }

  static async analyzePerformanceTrends(
    timeRange: TimeRange
  ): Promise<PerformanceAnalysis> {
    // Analyze performance over time
    // Identify degradation patterns
    // Suggest optimization opportunities
  }
}
```

### 4. Error Monitoring and Crash Reporting

#### ErrorReporter Service
```typescript
interface ErrorReport {
  id: string;
  type: 'javascript' | 'native' | 'network' | 'database';
  message: string;
  stack?: string;
  userId?: string;
  sessionId: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context: ErrorContext;
  fingerprint: string;
  isResolved: boolean;
}

interface ErrorContext {
  screen: string;
  userAction: string;
  deviceInfo: DeviceInfo;
  appVersion: string;
  buildNumber: string;
  networkStatus: string;
  memoryUsage: number;
  customData?: Record<string, any>;
}

interface ErrorTrend {
  errorType: string;
  count: number;
  affectedUsers: number;
  firstSeen: Date;
  lastSeen: Date;
  trend: 'increasing' | 'decreasing' | 'stable';
  impact: 'low' | 'medium' | 'high' | 'critical';
}

class ErrorReporter {
  static async reportError(
    error: Error,
    context: Partial<ErrorContext>
  ): Promise<string> {
    // Capture and report errors with context
    // Generate unique fingerprint for grouping
    // Send to error monitoring service
    // Queue for offline reporting if needed
  }

  static async reportCrash(
    crashData: CrashData
  ): Promise<string> {
    // Report native and JavaScript crashes
    // Include stack traces and device info
    // Prioritize critical crashes
  }

  static async analyzeErrorTrends(
    timeRange: TimeRange
  ): Promise<ErrorTrend[]> {
    // Analyze error patterns and trends
    // Identify recurring issues
    // Prioritize fixes by impact
  }

  static async resolveError(
    errorId: string,
    resolution: string
  ): Promise<void> {
    // Mark error as resolved
    // Track resolution time
    // Verify fix effectiveness
  }
}
```

### 5. Security and Compliance Infrastructure

#### SecurityMonitor Service
```typescript
interface SecurityEvent {
  id: string;
  type: 'authentication' | 'authorization' | 'data_access' | 'suspicious_activity';
  severity: 'info' | 'warning' | 'critical';
  userId?: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  details: Record<string, any>;
  riskScore: number;
}

interface ComplianceRule {
  id: string;
  name: string;
  regulation: 'GDPR' | 'CCPA' | 'COPPA' | 'CANNABIS_REGULATION';
  description: string;
  requirements: string[];
  validationRules: ValidationRule[];
  isActive: boolean;
}

interface AuditTrail {
  id: string;
  userId: string;
  action: string;
  resource: string;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  result: 'success' | 'failure';
  details: Record<string, any>;
}

class SecurityMonitor {
  static async logSecurityEvent(
    event: SecurityEvent
  ): Promise<void> {
    // Log security events for monitoring
    // Calculate risk scores
    // Trigger alerts for high-risk events
  }

  static async validateCompliance(
    rule: ComplianceRule,
    data: any
  ): Promise<boolean> {
    // Validate data against compliance rules
    // Generate compliance reports
    // Track compliance status
  }

  static async createAuditTrail(
    trail: AuditTrail
  ): Promise<void> {
    // Create comprehensive audit logs
    // Ensure tamper-proof logging
    // Enable compliance reporting
  }

  static async detectAnomalies(
    timeRange: TimeRange
  ): Promise<SecurityAnomaly[]> {
    // Detect unusual security patterns
    // Identify potential threats
    // Recommend security improvements
  }
}
```

## Data Models

### New Models

#### DeploymentHistory Model
```typescript
export class DeploymentHistory extends Model {
  static table = 'deployment_history';
  
  @text('version') version!: string;
  @text('build_number') buildNumber!: string;
  @text('channel') channel!: string;
  @text('status') status!: string; // 'pending', 'active', 'rolled_back', 'failed'
  @field('rollout_percentage') rolloutPercentage!: number;
  @field('users_affected') usersAffected?: number;
  @field('error_rate') errorRate?: number;
  @json('metadata') metadata?: Record<string, any>;
  @readonly @date('deployed_at') deployedAt!: Date;
  @date('rolled_back_at') rolledBackAt?: Date;
}
```

#### AnalyticsEvent Model
```typescript
export class AnalyticsEvent extends Model {
  static table = 'analytics_events';
  
  @text('event_name') eventName!: string;
  @text('user_id') userId?: string;
  @text('session_id') sessionId!: string;
  @text('screen_name') screenName?: string;
  @text('category') category?: string;
  @json('properties') properties?: Record<string, any>;
  @json('device_info') deviceInfo!: DeviceInfo;
  @readonly @date('timestamp') timestamp!: Date;
}
```

#### ErrorLog Model
```typescript
export class ErrorLog extends Model {
  static table = 'error_logs';
  
  @text('error_type') errorType!: string;
  @text('message') message!: string;
  @text('stack_trace') stackTrace?: string;
  @text('fingerprint') fingerprint!: string;
  @text('user_id') userId?: string;
  @text('session_id') sessionId!: string;
  @text('severity') severity!: string;
  @json('context') context!: ErrorContext;
  @field('is_resolved') isResolved!: boolean;
  @readonly @date('occurred_at') occurredAt!: Date;
  @date('resolved_at') resolvedAt?: Date;
}
```

#### NotificationLog Model
```typescript
export class NotificationLog extends Model {
  static table = 'notification_logs';
  
  @text('notification_id') notificationId!: string;
  @text('user_id') userId!: string;
  @text('type') type!: string;
  @text('title') title!: string;
  @text('body') body!: string;
  @json('payload') payload?: Record<string, any>;
  @text('status') status!: string; // 'sent', 'delivered', 'opened', 'failed'
  @text('deep_link') deepLink?: string;
  @readonly @date('sent_at') sentAt!: Date;
  @date('delivered_at') deliveredAt?: Date;
  @date('opened_at') openedAt?: Date;
}
```

## Error Handling

### Deployment Reliability
- **Update Failures**: Automatic rollback with user notification
- **Network Issues**: Offline update queuing with retry logic
- **Version Conflicts**: Compatibility checking and graceful degradation
- **Rollout Problems**: Staged rollout monitoring with automatic halt

### Monitoring Reliability
- **Data Collection Failures**: Offline queuing with batch upload
- **Analytics Service Outages**: Local storage with sync when available
- **Alert Delivery**: Multiple notification channels with escalation
- **Performance Impact**: Lightweight monitoring with minimal overhead

### Security Resilience
- **Attack Detection**: Real-time threat monitoring with automated response
- **Data Breaches**: Incident response automation with notification
- **Compliance Violations**: Automatic remediation and reporting
- **Audit Trail Integrity**: Tamper-proof logging with verification

## Testing Strategy

### Infrastructure Testing
- **Deployment Pipeline**: Automated testing of CI/CD workflows
- **Update Mechanism**: Testing OTA updates across different scenarios
- **Notification Delivery**: End-to-end notification testing
- **Analytics Accuracy**: Validation of event tracking and reporting

### Performance Testing
- **Monitoring Overhead**: Ensure minimal impact on app performance
- **Scalability**: Test infrastructure under high load conditions
- **Reliability**: Validate system resilience and recovery
- **Integration**: Test all infrastructure components working together

### Security Testing
- **Vulnerability Assessment**: Regular security scanning and testing
- **Penetration Testing**: Simulated attacks to validate defenses
- **Compliance Validation**: Automated compliance rule testing
- **Incident Response**: Testing of security incident procedures

## Security Considerations

### Data Protection
- **Analytics Privacy**: User consent and data anonymization
- **Error Reporting**: Sensitive data filtering and encryption
- **Audit Logs**: Secure storage with access controls
- **Notification Security**: Encrypted payload delivery

### Access Control
- **Infrastructure Access**: Role-based access with multi-factor authentication
- **API Security**: Secure API endpoints with rate limiting
- **Deployment Controls**: Approval workflows for production deployments
- **Monitoring Access**: Restricted access to sensitive monitoring data

## Performance Optimizations

### Monitoring Efficiency
- **Batch Processing**: Efficient data collection and transmission
- **Sampling**: Smart sampling to reduce overhead while maintaining accuracy
- **Caching**: Local caching of configuration and reference data
- **Compression**: Data compression for network efficiency

### Infrastructure Scaling
- **Auto-scaling**: Dynamic resource allocation based on demand
- **Load Balancing**: Distributed processing for high availability
- **CDN Integration**: Global content delivery for updates and assets
- **Database Optimization**: Efficient data storage and retrieval patterns