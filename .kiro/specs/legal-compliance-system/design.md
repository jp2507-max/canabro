# Legal & Compliance System - Design Document

## Overview

The Legal & Compliance System ensures CanaBro operates within legal boundaries across all supported jurisdictions. The system integrates with existing user management, content systems, and data storage while adding comprehensive compliance monitoring, automated moderation, and legal documentation management.

## Architecture

### Existing Foundation
- **User Management**: Supabase Auth with profile system
- **Content System**: Community posts, plant sharing, and user-generated content
- **Data Storage**: Supabase database with comprehensive user and plant data
- **Geographic Services**: Location detection and regional customization

### Compliance System Components
```
compliance/
├── privacy/
│   ├── GDPRManager.ts                # GDPR compliance management
│   ├── ConsentManager.ts             # User consent tracking and management
│   ├── DataExporter.ts               # Personal data export functionality
│   ├── DataEraser.ts                 # Right to be forgotten implementation
│   └── PrivacyPolicyManager.ts       # Privacy policy versioning and acceptance
├── moderation/
│   ├── ContentModerator.ts           # AI-powered content moderation
│   ├── ModerationQueue.ts            # Human moderation workflow
│   ├── ReportingSystem.ts            # User reporting and appeals
│   ├── ToxicityDetector.ts           # Toxic content detection
│   └── ModerationAuditLog.ts         # Moderation action tracking
├── age-verification/
│   ├── AgeVerifier.ts                # Age verification service
│   ├── IdentityValidator.ts          # Identity document validation
│   ├── AccessController.ts           # Age-based access control
│   └── VerificationAuditLog.ts       # Age verification audit trails
├── legal/
│   ├── TermsManager.ts               # Terms of service management
│   ├── LegalDocumentVersioning.ts    # Legal document version control
│   ├── JurisdictionManager.ts        # Geographic legal compliance
│   ├── CannabisRegulationChecker.ts  # Cannabis-specific compliance
│   └── LegalNotificationSystem.ts    # Legal notice delivery
├── data-governance/
│   ├── RetentionPolicyManager.ts     # Data retention policy enforcement
│   ├── DataClassifier.ts             # Personal data classification
│   ├── AutoDeletionService.ts        # Automated data deletion
│   └── DataLineageTracker.ts         # Data processing lineage tracking
└── audit/
    ├── ComplianceAuditor.ts          # Compliance monitoring and reporting
    ├── AuditTrailManager.ts          # Tamper-proof audit logging
    ├── ComplianceReporter.ts         # Automated compliance reporting
    └── RegulatoryResponseManager.ts   # Regulatory inquiry handling
```

## Components and Interfaces

### 1. GDPR and Privacy Compliance

#### GDPRManager Service
```typescript
interface GDPRRequest {
  id: string;
  userId: string;
  requestType: 'access' | 'deletion' | 'rectification' | 'portability' | 'restriction';
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  requestDate: Date;
  completionDate?: Date;
  requestDetails: string;
  responseData?: any;
  verificationMethod: 'email' | 'identity_document' | 'two_factor';
}

interface ConsentRecord {
  id: string;
  userId: string;
  consentType: 'data_processing' | 'marketing' | 'analytics' | 'third_party_sharing';
  consentGiven: boolean;
  consentDate: Date;
  consentMethod: 'explicit' | 'opt_in' | 'pre_checked' | 'implied';
  legalBasis: 'consent' | 'contract' | 'legal_obligation' | 'legitimate_interest';
  withdrawalDate?: Date;
  ipAddress: string;
  userAgent: string;
}

interface DataProcessingRecord {
  id: string;
  dataType: string;
  processingPurpose: string;
  legalBasis: string;
  dataSource: string;
  retentionPeriod: number; // days
  sharingPartners?: string[];
  securityMeasures: string[];
  lastReviewed: Date;
}

class GDPRManager {
  static async submitDataRequest(
    userId: string,
    requestType: GDPRRequest['requestType'],
    details: string
  ): Promise<string> {
    // Create GDPR data request
    // Verify user identity
    // Initiate processing workflow
    // Send confirmation to user
  }

  static async processDataAccess(
    requestId: string
  ): Promise<PersonalDataExport> {
    // Collect all personal data for user
    // Format data in machine-readable format
    // Include data processing information
    // Generate secure download link
  }

  static async processDataDeletion(
    requestId: string
  ): Promise<DeletionReport> {
    // Identify all personal data to delete
    // Preserve data required for legal obligations
    // Execute deletion across all systems
    // Generate deletion confirmation report
  }

  static async recordConsent(
    userId: string,
    consentType: ConsentRecord['consentType'],
    consentGiven: boolean,
    context: ConsentContext
  ): Promise<void> {
    // Record user consent with full context
    // Update user permissions and access
    // Notify relevant systems of consent changes
    // Maintain audit trail of consent history
  }
}
```

#### DataExporter Service
```typescript
interface PersonalDataExport {
  userId: string;
  exportDate: Date;
  dataCategories: DataCategory[];
  totalRecords: number;
  exportFormat: 'json' | 'csv' | 'xml';
  downloadUrl: string;
  expirationDate: Date;
}

interface DataCategory {
  category: string;
  description: string;
  recordCount: number;
  data: any[];
  processingPurpose: string;
  legalBasis: string;
  retentionPeriod: string;
}

class DataExporter {
  static async exportUserData(
    userId: string,
    format: 'json' | 'csv' | 'xml' = 'json'
  ): Promise<PersonalDataExport> {
    // Collect all personal data from all systems
    // Organize data by category and purpose
    // Format data according to GDPR requirements
    // Generate secure, time-limited download link
  }

  static async generateDataMap(
    userId: string
  ): Promise<DataProcessingMap> {
    // Map all data processing activities for user
    // Include data flows and sharing relationships
    // Document legal basis for each processing activity
    // Provide clear, understandable explanations
  }
}
```

### 2. Content Moderation System

#### ContentModerator Service
```typescript
interface ModerationResult {
  contentId: string;
  action: 'approve' | 'flag' | 'hide' | 'remove' | 'escalate';
  confidence: number;
  reasons: ModerationReason[];
  automaticAction: boolean;
  reviewRequired: boolean;
  appealable: boolean;
}

interface ModerationReason {
  category: 'spam' | 'harassment' | 'illegal_content' | 'inappropriate' | 'copyright';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence: string[];
  ruleViolated: string;
}

interface ContentReport {
  id: string;
  contentId: string;
  reporterId: string;
  reportType: 'spam' | 'harassment' | 'inappropriate' | 'illegal' | 'copyright' | 'other';
  description: string;
  evidence?: string[];
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
  resolution?: string;
  reportDate: Date;
  resolvedDate?: Date;
}

class ContentModerator {
  static async moderateContent(
    contentId: string,
    contentType: 'post' | 'comment' | 'image' | 'profile',
    content: any
  ): Promise<ModerationResult> {
    // Analyze content using AI moderation tools
    // Check against community guidelines
    // Apply cannabis-specific content rules
    // Determine appropriate action and confidence level
  }

  static async processUserReport(
    report: Omit<ContentReport, 'id' | 'status' | 'reportDate'>
  ): Promise<string> {
    // Create user report record
    // Prioritize report based on severity
    // Add to moderation queue
    // Notify reporting user of receipt
  }

  static async appealModerationAction(
    contentId: string,
    userId: string,
    appealReason: string
  ): Promise<string> {
    // Create moderation appeal
    // Queue for human review
    // Notify user of appeal status
    // Track appeal resolution
  }

  static async trainModerationModel(
    trainingData: ModerationTrainingData[]
  ): Promise<void> {
    // Update AI moderation model with new training data
    // Validate model performance improvements
    // Deploy updated model with A/B testing
    // Monitor model accuracy and bias
  }
}
```

#### ModerationQueue Service
```typescript
interface ModerationQueueItem {
  id: string;
  contentId: string;
  contentType: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedModerator?: string;
  queuedDate: Date;
  reviewDeadline: Date;
  aiModerationResult?: ModerationResult;
  userReports: ContentReport[];
  status: 'queued' | 'assigned' | 'reviewing' | 'completed';
}

interface ModeratorAction {
  moderatorId: string;
  contentId: string;
  action: 'approve' | 'remove' | 'edit' | 'warn_user' | 'ban_user';
  reason: string;
  notes?: string;
  actionDate: Date;
  appealable: boolean;
}

class ModerationQueue {
  static async addToQueue(
    contentId: string,
    priority: ModerationQueueItem['priority'],
    reason: string
  ): Promise<string> {
    // Add content to moderation queue
    // Calculate priority and deadline
    // Assign to available moderator if urgent
    // Notify moderation team
  }

  static async assignModerator(
    queueItemId: string,
    moderatorId: string
  ): Promise<boolean> {
    // Assign queue item to specific moderator
    // Update queue status and timestamps
    // Notify moderator of assignment
    // Set review deadline
  }

  static async completeModerationReview(
    queueItemId: string,
    action: ModeratorAction
  ): Promise<void> {
    // Record moderator decision and action
    // Execute moderation action on content
    // Notify content creator if applicable
    // Update queue status and metrics
  }
}
```

### 3. Age Verification System

#### AgeVerifier Service
```typescript
interface AgeVerificationRequest {
  id: string;
  userId: string;
  verificationType: 'document' | 'credit_card' | 'phone' | 'third_party';
  status: 'pending' | 'processing' | 'verified' | 'failed' | 'expired';
  submittedDate: Date;
  verifiedDate?: Date;
  expirationDate?: Date;
  verificationData: VerificationData;
  failureReason?: string;
  retryCount: number;
}

interface VerificationData {
  documentType?: 'drivers_license' | 'passport' | 'national_id';
  documentImages?: string[];
  extractedData?: {
    dateOfBirth: Date;
    fullName: string;
    documentNumber: string;
    expirationDate: Date;
  };
  verificationScore?: number;
  thirdPartyResponse?: any;
}

interface AgeVerificationResult {
  isVerified: boolean;
  age: number;
  confidence: number;
  verificationMethod: string;
  expirationDate: Date;
  requiresReVerification: boolean;
}

class AgeVerifier {
  static async initiateVerification(
    userId: string,
    verificationType: AgeVerificationRequest['verificationType']
  ): Promise<string> {
    // Start age verification process
    // Generate verification session
    // Provide user with verification instructions
    // Set up verification monitoring
  }

  static async processDocumentVerification(
    verificationId: string,
    documentImages: string[]
  ): Promise<AgeVerificationResult> {
    // Extract data from identity documents
    // Verify document authenticity
    // Calculate age from date of birth
    // Return verification result with confidence score
  }

  static async verifyAge(
    userId: string
  ): Promise<AgeVerificationResult | null> {
    // Check current age verification status
    // Validate verification hasn't expired
    // Return current verification result
    // Trigger re-verification if needed
  }

  static async scheduleReVerification(
    userId: string,
    intervalMonths: number
  ): Promise<void> {
    // Schedule periodic age re-verification
    // Send reminder notifications to user
    // Restrict access if verification expires
    // Maintain verification audit trail
  }
}
```

### 4. Legal Documentation Management

#### TermsManager Service
```typescript
interface LegalDocument {
  id: string;
  type: 'terms_of_service' | 'privacy_policy' | 'community_guidelines' | 'cookie_policy';
  version: string;
  title: string;
  content: string;
  effectiveDate: Date;
  lastModified: Date;
  isActive: boolean;
  jurisdiction: string[];
  requiredAcceptance: boolean;
  acceptanceDeadline?: Date;
}

interface UserAcceptance {
  id: string;
  userId: string;
  documentId: string;
  documentVersion: string;
  acceptedDate: Date;
  acceptanceMethod: 'explicit_click' | 'continued_use' | 'registration';
  ipAddress: string;
  userAgent: string;
  isActive: boolean;
}

interface LegalNotification {
  id: string;
  userId: string;
  documentId: string;
  notificationType: 'new_terms' | 'updated_terms' | 'policy_change' | 'compliance_notice';
  title: string;
  message: string;
  sentDate: Date;
  readDate?: Date;
  acknowledgedDate?: Date;
  isUrgent: boolean;
}

class TermsManager {
  static async publishLegalDocument(
    document: Omit<LegalDocument, 'id' | 'lastModified' | 'isActive'>
  ): Promise<string> {
    // Publish new legal document version
    // Deactivate previous version
    // Notify users of changes if required
    // Schedule acceptance deadline if applicable
  }

  static async recordUserAcceptance(
    userId: string,
    documentId: string,
    acceptanceMethod: UserAcceptance['acceptanceMethod'],
    context: AcceptanceContext
  ): Promise<void> {
    // Record user acceptance of legal document
    // Update user's legal compliance status
    // Send confirmation to user
    // Maintain acceptance audit trail
  }

  static async checkUserCompliance(
    userId: string
  ): Promise<ComplianceStatus> {
    // Check if user has accepted all required documents
    // Identify any missing or expired acceptances
    // Calculate compliance score
    // Return detailed compliance status
  }

  static async sendLegalNotification(
    userId: string,
    notification: Omit<LegalNotification, 'id' | 'sentDate'>
  ): Promise<string> {
    // Send legal notification to user
    // Track delivery and read status
    // Schedule follow-up if acknowledgment required
    // Maintain notification audit trail
  }
}
```

### 5. Cannabis Regulation Compliance

#### CannabisRegulationChecker Service
```typescript
interface JurisdictionRules {
  jurisdiction: string;
  country: string;
  state?: string;
  legalStatus: 'legal' | 'medical_only' | 'decriminalized' | 'illegal';
  cultivationAllowed: boolean;
  plantLimits?: {
    personal: number;
    medical: number;
    commercial: number;
  };
  ageRestrictions: {
    minimumAge: number;
    medicalAge?: number;
  };
  contentRestrictions: {
    advertisingAllowed: boolean;
    publicDisplayAllowed: boolean;
    salesDiscussionAllowed: boolean;
  };
  lastUpdated: Date;
}

interface ComplianceCheck {
  userId: string;
  jurisdiction: string;
  checkType: 'access' | 'content' | 'cultivation' | 'sharing';
  isCompliant: boolean;
  violations: ComplianceViolation[];
  recommendations: string[];
  checkDate: Date;
}

interface ComplianceViolation {
  type: 'age' | 'jurisdiction' | 'plant_count' | 'content' | 'advertising';
  severity: 'warning' | 'violation' | 'critical';
  description: string;
  requiredAction: string;
  deadline?: Date;
}

class CannabisRegulationChecker {
  static async checkJurisdictionCompliance(
    userId: string,
    userLocation: GeographicLocation
  ): Promise<ComplianceCheck> {
    // Check user's location against cannabis laws
    // Verify legal status in user's jurisdiction
    // Identify any compliance issues
    // Provide recommendations for compliance
  }

  static async validatePlantCount(
    userId: string,
    plantCount: number
  ): Promise<boolean> {
    // Check plant count against local limits
    // Consider user's medical status if applicable
    // Warn user if approaching limits
    // Block features if limits exceeded
  }

  static async moderateCannabisContent(
    content: any,
    userLocation: GeographicLocation
  ): Promise<ModerationResult> {
    // Check content against local cannabis regulations
    // Identify advertising or promotion violations
    // Apply jurisdiction-specific content rules
    // Recommend content modifications if needed
  }

  static async updateJurisdictionRules(
    jurisdiction: string,
    rules: JurisdictionRules
  ): Promise<void> {
    // Update cannabis regulation rules for jurisdiction
    // Notify affected users of changes
    // Trigger compliance re-checks
    // Maintain rule change audit trail
  }
}
```

## Data Models

### New Models

#### GDPRRequest Model
```typescript
export class GDPRRequest extends Model {
  static table = 'gdpr_requests';
  
  @text('user_id') userId!: string;
  @text('request_type') requestType!: string;
  @text('status') status!: string;
  @text('request_details') requestDetails!: string;
  @json('response_data') responseData?: any;
  @text('verification_method') verificationMethod!: string;
  @readonly @date('request_date') requestDate!: Date;
  @date('completion_date') completionDate?: Date;
  @date('deadline_date') deadlineDate!: Date;
  
  @relation('profiles', 'user_id') user!: Profile;
}
```

#### ConsentRecord Model
```typescript
export class ConsentRecord extends Model {
  static table = 'consent_records';
  
  @text('user_id') userId!: string;
  @text('consent_type') consentType!: string;
  @field('consent_given') consentGiven!: boolean;
  @text('legal_basis') legalBasis!: string;
  @text('consent_method') consentMethod!: string;
  @text('ip_address') ipAddress!: string;
  @text('user_agent') userAgent!: string;
  @readonly @date('consent_date') consentDate!: Date;
  @date('withdrawal_date') withdrawalDate?: Date;
  
  @relation('profiles', 'user_id') user!: Profile;
}
```

#### ModerationAction Model
```typescript
export class ModerationAction extends Model {
  static table = 'moderation_actions';
  
  @text('content_id') contentId!: string;
  @text('content_type') contentType!: string;
  @text('moderator_id') moderatorId?: string;
  @text('action') action!: string;
  @text('reason') reason!: string;
  @text('notes') notes?: string;
  @field('automatic_action') automaticAction!: boolean;
  @field('confidence_score') confidenceScore?: number;
  @field('appealable') appealable!: boolean;
  @readonly @date('action_date') actionDate!: Date;
  @date('appeal_date') appealDate?: Date;
  @text('appeal_status') appealStatus?: string;
}
```

#### AgeVerification Model
```typescript
export class AgeVerification extends Model {
  static table = 'age_verifications';
  
  @text('user_id') userId!: string;
  @text('verification_type') verificationType!: string;
  @text('status') status!: string;
  @json('verification_data') verificationData!: VerificationData;
  @field('verification_score') verificationScore?: number;
  @text('failure_reason') failureReason?: string;
  @field('retry_count') retryCount!: number;
  @readonly @date('submitted_date') submittedDate!: Date;
  @date('verified_date') verifiedDate?: Date;
  @date('expiration_date') expirationDate?: Date;
  
  @relation('profiles', 'user_id') user!: Profile;
}
```

#### LegalDocument Model
```typescript
export class LegalDocument extends Model {
  static table = 'legal_documents';
  
  @text('type') type!: string;
  @text('version') version!: string;
  @text('title') title!: string;
  @text('content') content!: string;
  @json('jurisdiction') jurisdiction!: string[];
  @field('required_acceptance') requiredAcceptance!: boolean;
  @field('is_active') isActive!: boolean;
  @readonly @date('effective_date') effectiveDate!: Date;
  @readonly @date('last_modified') lastModified!: Date;
  @date('acceptance_deadline') acceptanceDeadline?: Date;
}
```

#### UserAcceptance Model
```typescript
export class UserAcceptance extends Model {
  static table = 'user_acceptances';
  
  @text('user_id') userId!: string;
  @text('document_id') documentId!: string;
  @text('document_version') documentVersion!: string;
  @text('acceptance_method') acceptanceMethod!: string;
  @text('ip_address') ipAddress!: string;
  @text('user_agent') userAgent!: string;
  @field('is_active') isActive!: boolean;
  @readonly @date('accepted_date') acceptedDate!: Date;
  
  @relation('profiles', 'user_id') user!: Profile;
  @relation('legal_documents', 'document_id') document!: LegalDocument;
}
```

## Error Handling

### Privacy Compliance
- **GDPR Request Failures**: Automated retry with escalation to legal team
- **Data Export Errors**: Partial export with clear indication of missing data
- **Consent Management Issues**: Conservative approach with explicit re-consent
- **Cross-Border Data Transfer**: Automatic compliance checking and blocking

### Content Moderation
- **AI Moderation Failures**: Fallback to human moderation queue
- **False Positives**: Easy appeal process with rapid human review
- **Moderation Overload**: Automatic escalation and priority queuing
- **Appeal Processing**: Transparent timeline with status updates

### Age Verification
- **Verification Service Outages**: Multiple verification method fallbacks
- **Document Processing Errors**: Clear error messages with retry options
- **Identity Fraud Detection**: Immediate account suspension with appeal process
- **Verification Expiration**: Graceful access restriction with re-verification prompts

## Testing Strategy

### Compliance Testing
- **GDPR Compliance**: Automated testing of data subject rights
- **Content Moderation**: Testing with known problematic content
- **Age Verification**: Testing with various document types and edge cases
- **Legal Documentation**: Version control and acceptance workflow testing

### Security Testing
- **Data Protection**: Encryption and access control validation
- **Audit Trail Integrity**: Tamper-proof logging verification
- **Privacy Controls**: Data minimization and purpose limitation testing
- **Incident Response**: Breach detection and response procedure testing

### Regulatory Testing
- **Multi-Jurisdiction**: Testing compliance across different legal frameworks
- **Cannabis Regulations**: Validation against current cannabis laws
- **Content Restrictions**: Testing of jurisdiction-specific content rules
- **Legal Updates**: Testing of regulation change adaptation

## Security Considerations

### Data Protection
- **Encryption**: End-to-end encryption for sensitive compliance data
- **Access Controls**: Role-based access with audit logging
- **Data Minimization**: Collect only necessary data for compliance
- **Secure Storage**: Compliance data stored with enhanced security measures

### Privacy Protection
- **Anonymization**: Personal data anonymization where legally permissible
- **Pseudonymization**: Use of pseudonyms for analytics and reporting
- **Data Segregation**: Separation of compliance data from operational data
- **Retention Controls**: Automated deletion based on retention policies

### Audit Security
- **Tamper-Proof Logging**: Cryptographic integrity for audit trails
- **Access Monitoring**: All audit log access monitored and logged
- **Backup Security**: Secure backup of compliance and audit data
- **Incident Response**: Rapid response to compliance-related security incidents

## Performance Optimizations

### Compliance Processing
- **Batch Processing**: Efficient processing of bulk compliance operations
- **Caching**: Cache frequently accessed compliance rules and policies
- **Async Processing**: Non-blocking compliance checks and data processing
- **Database Optimization**: Optimized queries for compliance reporting

### Content Moderation
- **AI Model Optimization**: Efficient AI models for real-time moderation
- **Queue Management**: Intelligent prioritization of moderation queue
- **Parallel Processing**: Concurrent processing of multiple moderation tasks
- **Result Caching**: Cache moderation results for similar content

### Audit and Reporting
- **Incremental Reporting**: Generate reports incrementally to reduce load
- **Data Aggregation**: Pre-aggregate compliance metrics for faster reporting
- **Archive Management**: Efficient archival of old compliance data
- **Query Optimization**: Optimized database queries for compliance analytics