# Legal & Compliance System - Design Document

## Overview

The Legal & Compliance System provides comprehensive legal protection and regulatory compliance for CanaBro. This system integrates privacy controls, content moderation, age verification, and jurisdiction-specific compliance to ensure safe and legal operation across different markets and regulatory environments.

## 2025 Technical Context

**GDPR & Privacy Libraries:**
- Didomi SDK for React Native - comprehensive consent management
- Axeptio React Native SDK - TCF compliance for publishers
- OneTrust integration available for enterprise consent management
- Supabase now GDPR-compliant with EU hosting and DPA (Data Processing Agreement)

**Content Moderation Solutions:**
- Stream Chat React Native includes built-in moderation tools
- NSFW.js for client-side image moderation
- TensorFlow.js for custom AI moderation models
- Parse-based content moderation applications available

**Age Verification Standards:**
- EU's official age verification app launching July 2025
- Privacy-preserving verification methods gaining adoption
- Mobile app consent management becoming more sophisticated on iOS

## Architecture

### Existing Foundation
- **User Authentication**: Supabase Auth with user profiles
- **Content System**: Community posts, comments, and user-generated content
- **Data Storage**: WatermelonDB and Supabase for user data management (Supabase is GDPR-compliant with EU hosting)
- **Location Services**: Expo Location for geographic compliance
- **Consent Management**: Consider Didomi SDK or Axeptio for comprehensive GDPR consent
- **Content Moderation**: Leverage Stream Chat's built-in moderation or custom TensorFlow.js solutions

### Compliance Components Architecture
```
compliance/
├── privacy/
│   ├── GDPRManager.ts                # GDPR compliance and data rights
│   ├── DataRetentionManager.ts       # Automated data retention and deletion
│   ├── ConsentManager.ts             # User consent tracking and management
│   └── DataPortabilityService.ts     # Data export and portability
├── moderation/
│   ├── ContentModerator.ts           # Automated content moderation
│   ├── ReportingSystem.ts            # User reporting and review system
│   ├── ModerationDashboard.ts        # Moderation management interface
│   └── AppealSystem.ts               # Content moderation appeals
├── age-verification/
│   ├── AgeVerificationService.ts     # Age verification and validation
│   ├── AccessControlManager.ts       # Age-based content restrictions
│   ├── JurisdictionManager.ts        # Location-based age requirements
│   └── ParentalControls.ts           # Additional safety measures
├── legal/
│   ├── TermsOfServiceManager.ts      # Terms and policy management
│   ├── LegalDocumentService.ts       # Legal document versioning
│   ├── ComplianceTracker.ts          # Compliance monitoring and reporting
│   └── LegalNotificationService.ts   # Legal notices and updates
└── jurisdiction/
    ├── LocationComplianceService.ts  # Geographic compliance management
    ├── LegalRestrictionManager.ts    # Jurisdiction-specific restrictions
    ├── ComplianceDatabase.ts         # Legal requirements database
    └── RegionalContentFilter.ts      # Location-based content filtering
```

## Components and Interfaces

### 1. GDPR and Privacy Compliance

#### GDPRManager Service
```typescript
interface DataProcessingPurpose {
  purpose: string;
  legalBasis: 'consent' | 'contract' | 'legal_obligation' | 'vital_interests' | 'public_task' | 'legitimate_interests';
  description: string;
  dataTypes: string[];
  retentionPeriod: number; // days
  thirdPartySharing: boolean;
}

interface UserConsent {
  userId: string;
  purposes: Record<string, boolean>;
  consentDate: Date;
  ipAddress: string;
  userAgent: string;
  version: string;
}

interface DataSubjectRequest {
  requestId: string;
  userId: string;
  requestType: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction' | 'objection';
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  requestDate: Date;
  completionDate?: Date;
  requestDetails: string;
  responseData?: any;
}

class GDPRManager {
  static async recordConsent(consent: UserConsent): Promise<void> {
    // Record user consent with full audit trail
    // Store consent proof with timestamp and context
    // Update user consent status across all systems
    // Notify relevant services of consent changes
  }

  static async processDataSubjectRequest(request: DataSubjectRequest): Promise<void> {
    // Process GDPR data subject requests
    // Coordinate data collection across all systems
    // Generate portable data exports
    // Execute data deletion with verification
  }

  static async checkConsentStatus(userId: string, purpose: string): Promise<boolean> {
    // Check if user has valid consent for specific purpose
    // Verify consent is current and not withdrawn
    // Handle consent expiration and renewal
  }

  static async withdrawConsent(userId: string, purposes: string[]): Promise<void> {
    // Process consent withdrawal
    // Stop data processing for withdrawn purposes
    // Update user experience based on consent changes
    // Maintain audit trail of consent changes
  }
}
```

#### DataRetentionManager Service
```typescript
interface RetentionPolicy {
  dataType: string;
  retentionPeriod: number; // days
  deletionMethod: 'hard_delete' | 'anonymize' | 'archive';
  legalBasis: string;
  exceptions: RetentionException[];
}

interface RetentionSchedule {
  scheduleId: string;
  userId?: string;
  dataType: string;
  scheduledDeletion: Date;
  status: 'scheduled' | 'processing' | 'completed' | 'failed';
  retentionPolicy: RetentionPolicy;
}

class DataRetentionManager {
  static async scheduleDataDeletion(userId: string, dataTypes: string[]): Promise<void> {
    // Schedule data for deletion based on retention policies
    // Calculate deletion dates based on data types
    // Create deletion tasks with appropriate timing
    // Handle dependencies between different data types
  }

  static async executeScheduledDeletions(): Promise<void> {
    // Execute scheduled data deletions
    // Verify deletion completion across all systems
    // Generate deletion confirmation reports
    // Handle deletion failures with retry logic
  }

  static async anonymizeUserData(userId: string): Promise<void> {
    // Anonymize user data while preserving analytics value
    // Remove personally identifiable information
    // Maintain data relationships for legitimate purposes
    // Generate anonymization audit trail
  }
}
```

### 2. Content Moderation System

#### ContentModerator Service
```typescript
interface ModerationRule {
  ruleId: string;
  name: string;
  description: string;
  contentTypes: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  action: 'flag' | 'hide' | 'remove' | 'ban_user';
  patterns: ModerationPattern[];
  isActive: boolean;
}

interface ModerationPattern {
  type: 'keyword' | 'regex' | 'image_hash' | 'ai_classification';
  pattern: string;
  confidence: number;
  context?: string;
}

interface ModerationResult {
  contentId: string;
  contentType: string;
  userId: string;
  violations: ModerationViolation[];
  overallScore: number;
  recommendedAction: string;
  requiresHumanReview: boolean;
  processedAt: Date;
}

interface ModerationViolation {
  ruleId: string;
  ruleName: string;
  severity: string;
  confidence: number;
  evidence: string[];
  context: string;
}

class ContentModerator {
  static async moderateContent(
    contentId: string,
    contentType: string,
    content: any
  ): Promise<ModerationResult> {
    // Apply automated moderation rules
    // Analyze text, images, and metadata
    // Calculate violation scores and confidence
    // Determine appropriate moderation actions
  }

  static async reviewFlaggedContent(
    contentId: string,
    moderatorId: string,
    decision: 'approve' | 'reject' | 'escalate'
  ): Promise<void> {
    // Process human moderation decisions
    // Update content status and visibility
    // Apply user penalties if necessary
    // Update moderation rule effectiveness
  }

  static async trainModerationModel(
    trainingData: ModerationTrainingData[]
  ): Promise<void> {
    // Update AI moderation models with new training data
    // Improve pattern recognition accuracy
    // Adjust confidence thresholds based on performance
    // Deploy updated models to production
  }
}
```

#### ReportingSystem Service
```typescript
interface ContentReport {
  reportId: string;
  contentId: string;
  contentType: string;
  reporterId: string;
  reportedUserId: string;
  reason: string;
  category: 'spam' | 'harassment' | 'inappropriate' | 'illegal' | 'other';
  description: string;
  evidence: string[];
  status: 'pending' | 'under_review' | 'resolved' | 'dismissed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: Date;
  resolvedAt?: Date;
  resolution?: string;
}

class ReportingSystem {
  static async submitReport(report: Omit<ContentReport, 'reportId' | 'status' | 'createdAt'>): Promise<string> {
    // Process user content reports
    // Validate report information and evidence
    // Assign priority based on report category
    // Queue for moderation review
  }

  static async processReport(reportId: string, moderatorId: string): Promise<void> {
    // Review reported content and context
    // Make moderation decisions
    // Apply appropriate actions
    // Notify reporter and content creator
  }

  static async getReportStatistics(timeRange: DateRange): Promise<ReportStatistics> {
    // Generate reporting statistics and trends
    // Analyze report categories and resolution rates
    // Identify problematic content patterns
    // Provide insights for moderation improvement
  }
}
```

### 3. Age Verification System

#### AgeVerificationService
```typescript
interface AgeVerificationRequest {
  userId: string;
  dateOfBirth: Date;
  verificationMethod: 'self_declaration' | 'id_document' | 'credit_card' | 'third_party';
  documentType?: string;
  documentNumber?: string;
  verificationData: any;
  ipAddress: string;
  userAgent: string;
}

interface AgeVerificationResult {
  userId: string;
  isVerified: boolean;
  verifiedAge: number;
  verificationLevel: 'basic' | 'enhanced' | 'premium';
  verificationDate: Date;
  expirationDate?: Date;
  restrictions: AgeRestriction[];
}

interface AgeRestriction {
  restrictionType: string;
  minAge: number;
  jurisdiction: string;
  description: string;
  isActive: boolean;
}

class AgeVerificationService {
  static async verifyAge(request: AgeVerificationRequest): Promise<AgeVerificationResult> {
    // Process age verification requests
    // Validate provided documentation
    // Check against jurisdiction requirements
    // Store verification results securely
  }

  static async checkAgeRestrictions(userId: string, contentType: string): Promise<boolean> {
    // Check if user meets age requirements for content
    // Apply jurisdiction-specific age restrictions
    // Handle different content sensitivity levels
    // Return access permission status
  }

  static async updateAgeRestrictions(jurisdiction: string, restrictions: AgeRestriction[]): Promise<void> {
    // Update age restrictions for specific jurisdictions
    // Apply new restrictions to existing users
    // Notify affected users of changes
    // Maintain compliance audit trail
  }
}
```

### 4. Legal Documentation System

#### TermsOfServiceManager
```typescript
interface LegalDocument {
  documentId: string;
  type: 'terms_of_service' | 'privacy_policy' | 'community_guidelines' | 'cookie_policy';
  version: string;
  content: string;
  effectiveDate: Date;
  jurisdiction: string;
  language: string;
  isActive: boolean;
  previousVersion?: string;
}

interface UserAcceptance {
  userId: string;
  documentId: string;
  documentVersion: string;
  acceptedAt: Date;
  ipAddress: string;
  userAgent: string;
  acceptanceMethod: 'registration' | 'update_prompt' | 'explicit_action';
}

class TermsOfServiceManager {
  static async createLegalDocument(document: Omit<LegalDocument, 'documentId'>): Promise<string> {
    // Create new legal document version
    // Validate document content and structure
    // Set up document activation schedule
    // Prepare user notification campaigns
  }

  static async requireUserAcceptance(documentId: string, userIds?: string[]): Promise<void> {
    // Require users to accept updated legal documents
    // Send notifications about document changes
    // Track acceptance status and follow up
    // Restrict access for non-compliant users
  }

  static async recordAcceptance(acceptance: UserAcceptance): Promise<void> {
    // Record user acceptance of legal documents
    // Store acceptance proof with full context
    // Update user compliance status
    // Generate acceptance confirmation
  }

  static async getUserComplianceStatus(userId: string): Promise<ComplianceStatus> {
    // Check user compliance with all legal documents
    // Identify required acceptances
    // Calculate compliance score
    // Provide compliance improvement recommendations
  }
}
```

### 5. Jurisdiction Compliance System

#### LocationComplianceService
```typescript
interface JurisdictionRules {
  jurisdiction: string;
  country: string;
  region?: string;
  cannabisLegal: boolean;
  minAge: number;
  contentRestrictions: ContentRestriction[];
  dataProtectionLaws: string[];
  specialRequirements: SpecialRequirement[];
  lastUpdated: Date;
}

interface ContentRestriction {
  contentType: string;
  restrictionLevel: 'blocked' | 'warning' | 'age_restricted' | 'allowed';
  reason: string;
  alternatives?: string[];
}

interface ComplianceCheck {
  userId: string;
  location: GeographicLocation;
  jurisdiction: string;
  complianceStatus: 'compliant' | 'restricted' | 'blocked';
  restrictions: ActiveRestriction[];
  warnings: ComplianceWarning[];
  checkedAt: Date;
}

class LocationComplianceService {
  static async checkLocationCompliance(
    userId: string,
    location: GeographicLocation
  ): Promise<ComplianceCheck> {
    // Check user location against jurisdiction rules
    // Determine applicable legal restrictions
    // Calculate compliance status and required actions
    // Generate compliance warnings and guidance
  }

  static async updateJurisdictionRules(
    jurisdiction: string,
    rules: JurisdictionRules
  ): Promise<void> {
    // Update legal rules for specific jurisdictions
    // Validate rule changes against legal requirements
    // Apply changes to affected users
    // Notify stakeholders of compliance changes
  }

  static async enforceLocationRestrictions(userId: string): Promise<void> {
    // Apply location-based restrictions to user account
    // Update content visibility and access permissions
    // Notify user of applicable restrictions
    // Provide guidance for compliance
  }
}
```

## Data Models

### New Models

#### UserConsent Model
```typescript
export class UserConsent extends Model {
  static table = 'user_consents';
  
  @text('user_id') userId!: string;
  @json('purposes') purposes!: Record<string, boolean>;
  @text('consent_version') consentVersion!: string;
  @text('ip_address') ipAddress!: string;
  @text('user_agent') userAgent!: string;
  @field('is_active') isActive!: boolean;
  @readonly @date('consent_date') consentDate!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
  
  @relation('users', 'user_id') user!: User;
}
```

#### ContentModeration Model
```typescript
export class ContentModeration extends Model {
  static table = 'content_moderations';
  
  @text('content_id') contentId!: string;
  @text('content_type') contentType!: string;
  @text('user_id') userId!: string;
  @json('violations') violations!: ModerationViolation[];
  @field('overall_score') overallScore!: number;
  @text('status') status!: string; // 'pending', 'approved', 'rejected', 'escalated'
  @text('action_taken') actionTaken?: string;
  @text('moderator_id') moderatorId?: string;
  @text('notes') notes?: string;
  @readonly @date('moderated_at') moderatedAt!: Date;
  @readonly @date('reviewed_at') reviewedAt?: Date;
}
```

#### AgeVerification Model
```typescript
export class AgeVerification extends Model {
  static table = 'age_verifications';
  
  @text('user_id') userId!: string;
  @date('date_of_birth') dateOfBirth!: Date;
  @text('verification_method') verificationMethod!: string;
  @text('verification_level') verificationLevel!: string;
  @field('is_verified') isVerified!: boolean;
  @date('verification_date') verificationDate!: Date;
  @date('expiration_date') expirationDate?: Date;
  @json('restrictions') restrictions!: AgeRestriction[];
  @text('jurisdiction') jurisdiction!: string;
  
  @relation('users', 'user_id') user!: User;
}
```

#### LegalDocument Model
```typescript
export class LegalDocument extends Model {
  static table = 'legal_documents';
  
  @text('document_type') documentType!: string;
  @text('version') version!: string;
  @text('content') content!: string;
  @date('effective_date') effectiveDate!: Date;
  @text('jurisdiction') jurisdiction!: string;
  @text('language') language!: string;
  @field('is_active') isActive!: boolean;
  @text('previous_version') previousVersion?: string;
  @readonly @date('created_at') createdAt!: Date;
}
```

#### ComplianceLog Model
```typescript
export class ComplianceLog extends Model {
  static table = 'compliance_logs';
  
  @text('user_id') userId?: string;
  @text('event_type') eventType!: string;
  @text('jurisdiction') jurisdiction!: string;
  @json('event_data') eventData!: Record<string, any>;
  @text('compliance_status') complianceStatus!: string;
  @text('action_taken') actionTaken?: string;
  @text('ip_address') ipAddress?: string;
  @readonly @date('logged_at') loggedAt!: Date;
}
```

## Error Handling

### Privacy Compliance Failures
- **Consent Withdrawal**: Immediate data processing cessation with audit trail
- **Data Deletion Failures**: Retry mechanisms with manual escalation procedures
- **Cross-Border Data Transfer**: Automatic restriction with user notification
- **Breach Detection**: Immediate containment and regulatory notification procedures

### Content Moderation Failures
- **False Positives**: Appeal system with human review escalation
- **Moderation Overload**: Automatic priority queuing and resource scaling
- **Rule Conflicts**: Hierarchical rule resolution with audit logging
- **Appeal Processing**: Guaranteed response times with escalation procedures

### Age Verification Issues
- **Verification Failures**: Multiple verification method options with support
- **Document Fraud**: Enhanced verification with third-party validation
- **Age Disputes**: Appeal process with additional verification requirements
- **System Bypasses**: Enhanced detection and prevention mechanisms

## Testing Strategy

### Compliance Testing
- **GDPR Compliance**: Automated testing of data subject rights and consent management
- **Content Moderation**: Testing moderation accuracy with diverse content samples
- **Age Verification**: Testing verification processes with various document types
- **Legal Document Management**: Testing document versioning and user acceptance flows

### Security Testing
- **Data Protection**: Testing encryption, access controls, and data isolation
- **Privacy Controls**: Testing consent management and data deletion processes
- **Content Security**: Testing moderation bypass attempts and evasion techniques
- **Access Control**: Testing age-based restrictions and jurisdiction compliance

### Integration Testing
- **Cross-System Compliance**: Testing compliance across all app features
- **Jurisdiction Changes**: Testing dynamic compliance rule application
- **User Journey Testing**: Testing complete compliance workflows
- **Emergency Procedures**: Testing incident response and breach procedures

## Security Considerations

### Data Protection
- **Encryption**: End-to-end encryption for all sensitive compliance data
- **Access Control**: Role-based access with audit logging for compliance systems
- **Data Minimization**: Collect only necessary data for compliance purposes
- **Secure Storage**: Encrypted storage with geographic restrictions for sensitive data

### Privacy Protection
- **Anonymization**: Robust anonymization techniques for analytics and research
- **Consent Management**: Granular consent with easy withdrawal mechanisms
- **Data Portability**: Secure data export with identity verification
- **Right to Erasure**: Complete data deletion with verification and audit trails

### Legal Protection
- **Document Integrity**: Digital signatures and version control for legal documents
- **Audit Trails**: Comprehensive logging of all compliance-related activities
- **Regulatory Reporting**: Automated compliance reporting with regulatory authorities
- **Legal Review**: Regular legal review of compliance procedures and effectiveness

## Performance Optimizations

### Compliance Processing
- **Batch Processing**: Efficient batch processing of compliance operations
- **Caching Strategy**: Cache frequently accessed compliance rules and decisions
- **Background Processing**: Process compliance tasks in background threads
- **Database Optimization**: Optimized queries for compliance data retrieval

### Content Moderation
- **AI Optimization**: Optimized AI models for fast content analysis
- **Parallel Processing**: Parallel moderation of multiple content items
- **Priority Queuing**: Priority-based processing of high-risk content
- **Result Caching**: Cache moderation results for similar content

### User Experience
- **Progressive Compliance**: Gradual compliance collection to minimize user friction
- **Smart Notifications**: Intelligent timing of compliance notifications
- **Streamlined Processes**: Simplified compliance workflows with clear guidance
- **Performance Monitoring**: Monitor compliance system performance and user impact