# Plant Diagnosis System - Design Document

## Overview

The Plant Diagnosis System extends CanaBro's existing diagnosis framework to create a comprehensive plant health analysis platform. The system builds upon existing DiagnosisAICore, CameraCapture, and DiagnosisResultCard components while adding advanced AI analysis, expert knowledge integration, and community consultation features.

## Architecture

### Existing Foundation
- **AI Core**: DiagnosisAICore with basic TensorFlow.js integration
- **Camera System**: CameraCapture component with photo analysis
- **Results Display**: DiagnosisResultCard for showing diagnosis results
- **Community Integration**: Existing community posting and interaction system
- **Plant Data**: Comprehensive plant metrics and photo tracking

### Enhanced Components Architecture
```
components/
├── diagnosis/
│   ├── SymptomGuide.tsx              # Visual symptom identification guide
│   ├── SymptomSelector.tsx           # Interactive symptom selection
│   ├── PhotoAnalyzer.tsx             # Enhanced AI photo analysis
│   ├── DiagnosisComparison.tsx       # Side-by-side photo comparison
│   └── DiagnosisHistory.tsx          # Historical diagnosis tracking
├── treatment/
│   ├── TreatmentPlan.tsx             # Step-by-step treatment instructions
│   ├── TreatmentTracker.tsx          # Treatment progress tracking
│   ├── SupplyChecker.tsx             # Required supplies verification
│   └── SafetyGuidelines.tsx          # Chemical safety and warnings
├── knowledge-base/
│   ├── ExpertGuides.tsx              # Cultivation best practices
│   ├── ProblemPrevention.tsx         # Proactive problem prevention
│   ├── KnowledgeSearch.tsx           # Searchable knowledge database
│   └── ResearchReferences.tsx        # Scientific backing and sources
├── prevention/
│   ├── RiskAssessment.tsx            # Plant health risk analysis
│   ├── PreventiveAlerts.tsx          # Proactive problem warnings
│   ├── EnvironmentalMonitor.tsx      # Environmental risk detection
│   └── PatternAnalysis.tsx           # Growth pattern anomaly detection
└── expert-consultation/
    ├── ExpertRequest.tsx             # Request expert consultation
    ├── CommunityDiagnosis.tsx        # Community-based diagnosis
    ├── ExpertResponse.tsx            # Expert advice display
    └── CaseStudyBuilder.tsx          # Build case studies from resolved issues
```

## Components and Interfaces

### 1. Enhanced Symptom Identification

#### SymptomGuide Component
```typescript
interface SymptomGuideProps {
  plantPart?: 'leaves' | 'stems' | 'buds' | 'roots' | 'all';
  onSymptomSelect: (symptom: PlantSymptom) => void;
  selectedSymptoms: PlantSymptom[];
}

interface PlantSymptom {
  id: string;
  name: string;
  category: SymptomCategory;
  plantPart: PlantPart;
  severity: 'mild' | 'moderate' | 'severe' | 'critical';
  description: string;
  visualIndicators: string[];
  referenceImages: SymptomImage[];
  commonCauses: string[];
  urgencyLevel: number; // 1-10 scale
}

interface SymptomImage {
  id: string;
  url: string;
  thumbnailUrl: string;
  description: string;
  severity: string;
  plantStage: GrowthStage;
  strain?: string;
}
```

**Design Features:**
- Interactive plant diagram for symptom location selection
- High-quality reference image gallery with zoom functionality
- Symptom progression timeline showing mild to severe stages
- Filter and search functionality for quick symptom finding
- Multi-symptom selection for complex diagnosis scenarios

#### PhotoAnalyzer Component (Enhanced)
```typescript
interface PhotoAnalyzerProps {
  plantId: string;
  onAnalysisComplete: (results: DiagnosisResults) => void;
  existingPhotos?: PlantPhoto[];
  comparisonMode?: boolean;
}

interface DiagnosisResults {
  primaryDiagnosis: Diagnosis[];
  confidence: number;
  analysisMetadata: {
    imageQuality: number;
    processingTime: number;
    modelVersion: string;
    detectedFeatures: string[];
  };
  recommendations: {
    additionalPhotos?: string[];
    manualVerification?: boolean;
    expertConsultation?: boolean;
  };
}

interface Diagnosis {
  condition: string;
  confidence: number;
  severity: 'mild' | 'moderate' | 'severe' | 'critical';
  affectedAreas: BoundingBox[];
  symptoms: PlantSymptom[];
  treatments: Treatment[];
  urgency: number;
}
```

**Design Features:**
- Enhanced TensorFlow.js model with cannabis-specific training
- Real-time analysis progress with visual feedback
- Confidence scoring with uncertainty handling
- Bounding box visualization for affected areas
- Comparison mode for before/after treatment photos

### 2. Treatment System

#### TreatmentPlan Component
```typescript
interface TreatmentPlanProps {
  diagnosis: Diagnosis;
  plantId: string;
  onTreatmentStart: (plan: TreatmentPlan) => void;
  onTreatmentComplete: (outcome: TreatmentOutcome) => void;
}

interface TreatmentPlan {
  id: string;
  diagnosisId: string;
  name: string;
  description: string;
  steps: TreatmentStep[];
  requiredSupplies: Supply[];
  estimatedDuration: number; // days
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  successRate: number; // percentage
  safetyWarnings: SafetyWarning[];
  followUpSchedule: FollowUpTask[];
}

interface TreatmentStep {
  stepNumber: number;
  title: string;
  description: string;
  instructions: string[];
  requiredSupplies: string[];
  estimatedTime: number; // minutes
  photos?: string[]; // Reference photos
  videos?: string[]; // Instructional videos
  safetyNotes?: string[];
  checkpoints: string[]; // What to verify before proceeding
}

interface Supply {
  name: string;
  category: 'nutrient' | 'pesticide' | 'tool' | 'equipment' | 'other';
  amount?: string;
  alternatives?: string[];
  safetyRating: 'safe' | 'caution' | 'hazardous';
  purchaseLinks?: PurchaseLink[];
}
```

**Design Features:**
- Step-by-step treatment wizard with progress tracking
- Supply checklist with availability verification
- Safety warnings and protective equipment recommendations
- Alternative treatment options with pros/cons comparison
- Integration with calendar for treatment scheduling

#### TreatmentTracker Component
```typescript
interface TreatmentTrackerProps {
  treatmentPlan: TreatmentPlan;
  plantId: string;
  onProgressUpdate: (progress: TreatmentProgress) => void;
}

interface TreatmentProgress {
  treatmentId: string;
  currentStep: number;
  completedSteps: TreatmentStepCompletion[];
  overallProgress: number; // percentage
  startDate: Date;
  estimatedCompletion: Date;
  notes: string;
  photos: ProgressPhoto[];
  effectiveness: number; // 1-10 scale
  sideEffects?: string[];
}

interface TreatmentStepCompletion {
  stepNumber: number;
  completedAt: Date;
  notes?: string;
  photos?: string[];
  effectiveness?: number;
  issues?: string[];
  modifications?: string[];
}
```

**Design Features:**
- Visual progress indicator with step completion status
- Photo documentation for each treatment step
- Effectiveness rating and side effect tracking
- Treatment modification logging
- Automatic follow-up task scheduling

### 3. Knowledge Base System

#### ExpertGuides Component
```typescript
interface ExpertGuidesProps {
  category?: GuideCategory;
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced';
  onGuideSelect: (guide: ExpertGuide) => void;
}

interface ExpertGuide {
  id: string;
  title: string;
  category: GuideCategory;
  experienceLevel: ExperienceLevel;
  author: ExpertAuthor;
  content: GuideContent;
  lastUpdated: Date;
  rating: number;
  readTime: number; // minutes
  tags: string[];
  relatedGuides: string[];
  references: Reference[];
}

interface GuideContent {
  introduction: string;
  sections: GuideSection[];
  keyTakeaways: string[];
  commonMistakes: string[];
  troubleshooting: TroubleshootingItem[];
  resources: Resource[];
}

interface GuideSection {
  title: string;
  content: string;
  images?: GuideImage[];
  videos?: GuideVideo[];
  tips: string[];
  warnings?: string[];
}
```

**Design Features:**
- Hierarchical guide organization by topic and difficulty
- Expert author profiles with credentials and specializations
- Interactive content with embedded images and videos
- Bookmarking and personal note-taking functionality
- Progress tracking for multi-part guides

#### KnowledgeSearch Component
```typescript
interface KnowledgeSearchProps {
  onResultSelect: (result: SearchResult) => void;
  filters?: SearchFilters;
  recentSearches?: string[];
}

interface SearchResult {
  id: string;
  type: 'guide' | 'symptom' | 'treatment' | 'case_study';
  title: string;
  excerpt: string;
  relevanceScore: number;
  category: string;
  tags: string[];
  lastUpdated: Date;
  matchedTerms: string[];
}

interface SearchFilters {
  contentType: string[];
  experienceLevel: string[];
  category: string[];
  dateRange?: DateRange;
  authorType?: 'expert' | 'community' | 'all';
}
```

**Design Features:**
- Full-text search with relevance scoring
- Advanced filtering and faceted search
- Search result highlighting and snippets
- Search history and saved searches
- Auto-complete and search suggestions

### 4. Prevention System

#### RiskAssessment Component
```typescript
interface RiskAssessmentProps {
  plantId: string;
  onRiskDetected: (risks: PlantRisk[]) => void;
  autoAssessment?: boolean;
}

interface PlantRisk {
  id: string;
  riskType: RiskType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  probability: number; // 0-1
  description: string;
  indicators: RiskIndicator[];
  preventionMeasures: PreventionMeasure[];
  timeframe: string; // "within 3 days", "next week", etc.
  confidence: number;
}

interface RiskIndicator {
  type: 'environmental' | 'growth_pattern' | 'visual' | 'historical';
  value: any;
  threshold: any;
  trend: 'improving' | 'stable' | 'worsening';
  description: string;
}

interface PreventionMeasure {
  action: string;
  priority: 'low' | 'medium' | 'high';
  difficulty: 'easy' | 'moderate' | 'difficult';
  cost: 'free' | 'low' | 'medium' | 'high';
  effectiveness: number; // percentage
  instructions: string[];
}
```

**Design Features:**
- Automated risk assessment using plant metrics and environmental data
- Visual risk dashboard with severity indicators
- Predictive modeling based on historical data
- Customizable risk thresholds and alert preferences
- Integration with calendar for preventive task scheduling

### 5. Expert Consultation System

#### ExpertRequest Component
```typescript
interface ExpertRequestProps {
  plantId: string;
  diagnosis?: Diagnosis;
  onRequestSubmitted: (request: ExpertRequest) => void;
}

interface ExpertRequest {
  id: string;
  plantId: string;
  userId: string;
  title: string;
  description: string;
  urgency: 'low' | 'medium' | 'high' | 'emergency';
  category: ConsultationCategory;
  attachments: RequestAttachment[];
  plantData: PlantDataSnapshot;
  preferredExpertise: string[];
  budget?: number;
  deadline?: Date;
  status: RequestStatus;
  responses: ExpertResponse[];
}

interface PlantDataSnapshot {
  basicInfo: PlantBasicInfo;
  currentMetrics: PlantMetrics;
  recentPhotos: PlantPhoto[];
  growthHistory: GrowthEvent[];
  environmentalData: EnvironmentalReading[];
  previousIssues: DiagnosisHistory[];
}

interface ExpertResponse {
  id: string;
  expertId: string;
  expert: ExpertProfile;
  response: string;
  confidence: number;
  recommendedActions: string[];
  followUpQuestions?: string[];
  estimatedCost?: number;
  availability?: AvailabilityWindow;
  rating?: number;
  isVerified: boolean;
}
```

**Design Features:**
- Comprehensive case building with automatic plant data inclusion
- Expert matching based on specialization and availability
- Secure communication channel with experts
- Payment integration for premium consultations
- Expert verification and rating system

## Data Models

### New Models

#### PlantDiagnosis Model
```typescript
export class PlantDiagnosis extends Model {
  static table = 'plant_diagnoses';
  
  @text('plant_id') plantId!: string;
  @text('diagnosis_type') diagnosisType!: string; // 'ai', 'manual', 'expert', 'community'
  @json('symptoms') symptoms!: PlantSymptom[];
  @json('diagnosis_results') diagnosisResults!: DiagnosisResults;
  @text('status') status!: string; // 'pending', 'confirmed', 'treated', 'resolved'
  @field('confidence_score') confidenceScore?: number;
  @text('treatment_plan_id') treatmentPlanId?: string;
  @json('photos') photos!: string[];
  @text('notes') notes?: string;
  @readonly @date('diagnosed_at') diagnosedAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
  
  @relation('plants', 'plant_id') plant!: Plant;
  @relation('treatment_plans', 'treatment_plan_id') treatmentPlan?: TreatmentPlan;
}
```

#### TreatmentPlan Model
```typescript
export class TreatmentPlan extends Model {
  static table = 'treatment_plans';
  
  @text('diagnosis_id') diagnosisId!: string;
  @text('name') name!: string;
  @text('description') description!: string;
  @json('steps') steps!: TreatmentStep[];
  @json('required_supplies') requiredSupplies!: Supply[];
  @field('estimated_duration') estimatedDuration!: number;
  @text('difficulty') difficulty!: string;
  @field('success_rate') successRate?: number;
  @json('safety_warnings') safetyWarnings?: SafetyWarning[];
  @text('status') status!: string; // 'planned', 'active', 'completed', 'abandoned'
  @date('started_at') startedAt?: Date;
  @date('completed_at') completedAt?: Date;
  @readonly @date('created_at') createdAt!: Date;
  
  @relation('plant_diagnoses', 'diagnosis_id') diagnosis!: PlantDiagnosis;
}
```

#### ExpertGuide Model
```typescript
export class ExpertGuide extends Model {
  static table = 'expert_guides';
  
  @text('title') title!: string;
  @text('category') category!: string;
  @text('experience_level') experienceLevel!: string;
  @text('author_id') authorId!: string;
  @json('content') content!: GuideContent;
  @field('rating') rating?: number;
  @field('read_time') readTime!: number;
  @json('tags') tags!: string[];
  @json('related_guides') relatedGuides?: string[];
  @field('view_count') viewCount!: number;
  @field('is_featured') isFeatured!: boolean;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}
```

#### PlantRiskAssessment Model
```typescript
export class PlantRiskAssessment extends Model {
  static table = 'plant_risk_assessments';
  
  @text('plant_id') plantId!: string;
  @json('risks') risks!: PlantRisk[];
  @field('overall_risk_score') overallRiskScore!: number;
  @json('recommendations') recommendations!: PreventionMeasure[];
  @text('assessment_type') assessmentType!: string; // 'automatic', 'manual', 'scheduled'
  @field('is_active') isActive!: boolean;
  @date('next_assessment') nextAssessment?: Date;
  @readonly @date('assessed_at') assessedAt!: Date;
  
  @relation('plants', 'plant_id') plant!: Plant;
}
```

## Error Handling

### AI Analysis Reliability
- **Model Failures**: Graceful fallback to manual symptom selection
- **Image Quality Issues**: Automatic quality assessment with improvement suggestions
- **Confidence Thresholds**: Clear uncertainty communication with alternative options
- **Network Failures**: Offline diagnosis capability with sync when available

### Treatment Safety
- **Chemical Safety**: Comprehensive safety warnings and protective equipment requirements
- **Dosage Calculations**: Validation and double-checking of chemical concentrations
- **Interaction Warnings**: Detection of conflicting treatments or chemicals
- **Emergency Protocols**: Clear escalation paths for severe plant health emergencies

### Expert System Reliability
- **Expert Availability**: Backup expert assignment and community fallback
- **Response Quality**: Expert response validation and quality scoring
- **Communication Security**: Encrypted communication channels for sensitive information
- **Payment Processing**: Secure payment handling with dispute resolution

## Testing Strategy

### AI Model Testing
- **Accuracy Validation**: Test AI diagnosis accuracy against expert-verified cases
- **Edge Case Handling**: Test with poor quality images, unusual symptoms, multiple issues
- **Performance Testing**: Validate analysis speed and resource usage
- **Model Updates**: Test model versioning and seamless updates

### Treatment Effectiveness
- **Outcome Tracking**: Monitor treatment success rates and effectiveness
- **Safety Validation**: Verify safety warnings and protective measures
- **User Experience**: Test treatment plan usability and completion rates
- **Integration Testing**: Validate calendar integration and follow-up scheduling

### Knowledge Base Quality
- **Content Accuracy**: Expert review of all guides and recommendations
- **Search Relevance**: Test search result quality and relevance scoring
- **User Engagement**: Monitor guide usage and user feedback
- **Content Updates**: Test content versioning and update distribution

## Security Considerations

### Data Privacy
- **Plant Health Data**: Secure storage of sensitive cultivation information
- **Photo Analysis**: Privacy-preserving AI analysis with optional cloud processing
- **Expert Consultations**: Encrypted communication and data protection
- **User Anonymity**: Optional anonymous consultation and case sharing

### Expert Verification
- **Credential Verification**: Thorough vetting of expert qualifications
- **Response Quality**: Monitoring and rating of expert advice quality
- **Liability Protection**: Clear disclaimers and liability limitations
- **Professional Standards**: Enforcement of professional conduct standards

## Performance Optimizations

### AI Processing
- **Model Optimization**: Compressed models for mobile deployment
- **Batch Processing**: Efficient handling of multiple image analyses
- **Caching Strategy**: Cache common diagnosis results and recommendations
- **Progressive Loading**: Incremental result delivery for better user experience

### Knowledge Base Performance
- **Content Indexing**: Efficient full-text search indexing
- **Image Optimization**: Compressed images with progressive loading
- **Caching Strategy**: Cache frequently accessed guides and search results
- **Offline Access**: Download guides for offline reading and reference