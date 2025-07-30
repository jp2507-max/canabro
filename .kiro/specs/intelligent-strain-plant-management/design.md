# Design Document: Intelligent Strain‑Based Plant Management

## Overview

Transform generic plant tracking into a personalized, strain‑specific flow. We normalize strain API data, derive deterministic schedules and windows (not single dates), and adapt tasks by difficulty, environment, and hemisphere. Baselines differ by plant type:

- **Photoperiod:** baseline = **flip (12/12)** + flowering days range.
- **Autoflower:** baseline = **germination** + seed‑to‑harvest days range.

Default timezone: **Europe/Berlin**; hemisphere derived from location with user override.

## Architecture

### High‑Level Architecture

```mermaid
graph TB
    subgraph "User Interface Layer"
        SAC[StrainAutocomplete]
        PMF[Plant Creation/Editing Forms]
        CAL[Calendar Views]
        TDV[Task Dashboard]
        CMP[Compare View]
    end
    
    subgraph "Service Layer"
        SPS[Strain Processing Service]
        SIS[Strain Integration Service]
        TSS[Task Scheduling Service]
        PPS[Prediction Service]
        LGS[Learning Service]
    end
    
    subgraph "Data Layer"
        API[Strain API]
        WDB[WatermelonDB (offline)]
        SB[Supabase (sync)]
    end
    
    subgraph "External Systems"
        TRE[Task Reminder Engine]
        CAM[Calendar Management]
        NOT[Notification System]
    end
    
    SAC --> SPS
    PMF --> SIS
    SPS --> API
    SIS --> TSS
    SIS --> PPS
    TSS --> TRE
    TSS --> CAM
    SPS --> WDB
    SIS --> SB
    TRE --> NOT
    SIS --> LGS
    LGS --> SB
```

### Data Flow

1. **Strain Selection**: User selects strain via StrainAutocomplete
2. **Data Processing**: Strain Processing Service parses API response
3. **Plant Creation**: Enhanced plant creation with strain-specific data
4. **Schedule Generation**: Intelligent task scheduling based on strain characteristics
5. **Prediction Calculation**: Harvest dates, yield expectations, milestone predictions
6. **Task Management**: Integration with existing task and calendar systems
7. **Continuous Learning**: Feedback loop for improving predictions

## Components and Interfaces

### Core Services

#### 1. Strain Processing Service
**Purpose**: Parse and normalize strain API data for internal use

```typescript
interface StrainProcessingService {
  parseStrainData(apiResponse: RawStrainApiResponse): ProcessedStrainData;
  extractCultivationData(strainData: ProcessedStrainData): CultivationProfile;
  validateStrainData(data: ProcessedStrainData): ValidationResult;
  enrichStrainData(baseData: ProcessedStrainData, plantContext: PlantContext): EnrichedStrainData;
}

interface ProcessedStrainData {
  id: string;
  name: string;
  genetics: StrainGenetics;
  cultivation: CultivationProfile;
  characteristics: StrainCharacteristics;
  metadata: StrainMetadata;
}

interface CultivationProfile {
  floweringTime: TimeRange;
  harvestWindow: SeasonalWindow;
  yieldExpectations: YieldProfile;
  growthDifficulty: DifficultyLevel;
  environmentalNeeds: EnvironmentalRequirements;
  commonIssues: CultivationIssue[];
}
```

#### 2. Strain Integration Service
**Purpose**: Integrate strain data with plant management system

```typescript
interface StrainIntegrationService {
  createStrainBasedPlant(plantData: CreatePlantData, strainData: ProcessedStrainData): Promise<Plant>;
  generateStrainSchedule(plant: Plant, strainProfile: CultivationProfile): Promise<StrainSchedule>;
  calculatePredictions(plant: Plant, strainProfile: CultivationProfile): Promise<StrainPredictions>;
  updatePlantWithStrainData(plant: Plant, strainData: ProcessedStrainData): Promise<void>;
}

interface StrainSchedule {
  milestones: GrowthMilestone[];
  tasks: ScheduledTask[];
  criticalDates: CriticalDate[];
  flexibleTasks: FlexibleTask[];
}

interface StrainPredictions {
  harvestDate: DateRange;
  yieldEstimate: YieldRange;
  growthMilestones: MilestonePredicton[];
  potentialIssues: IssuePredicton[];
}
```

#### 3. Strain-Based Task Generator
**Purpose**: Generate intelligent task schedules based on strain characteristics

```typescript
interface StrainTaskGenerator {
  generateFloweringSchedule(strain: CultivationProfile, plantedDate: Date): TaskSchedule;
  generateNutrientSchedule(strain: CultivationProfile, growthStage: GrowthStage): TaskSchedule;
  generateMonitoringTasks(strain: CultivationProfile, difficulty: DifficultyLevel): TaskSchedule;
  adaptScheduleForEnvironment(schedule: TaskSchedule, environment: GrowEnvironment): TaskSchedule;
}

interface TaskSchedule {
  tasks: StrainTask[];
  intervals: TaskInterval[];
  priorities: TaskPriority[];
  dependencies: TaskDependency[];
}

interface StrainTask extends PlantTask {
  strainSpecific: boolean;
  adaptationReason: string;
  originalInterval?: number;
  strainInterval: number;
  confidenceLevel: number;
}
```

### Data Models

#### Enhanced Plant Model Extensions
```typescript
interface PlantStrainData {
  // Strain identification
  strainApiId: string;
  strainName: string;
  strainGenetics: string;
  
  // Cultivation profile
  expectedFloweringWeeks: number;
  expectedHarvestDate: Date;
  yieldExpectationMin: number;
  yieldExpectationMax: number;
  growDifficultyLevel: 'easy' | 'medium' | 'hard';
  
  // Environmental preferences
  preferredTemperatureRange: TemperatureRange;
  preferredHumidityRange: HumidityRange;
  lightRequirements: LightRequirements;
  
  // Strain-specific scheduling
  wateringInterval: number;
  feedingInterval: number;
  inspectionFrequency: number;
  
  // Prediction tracking
  actualVsPredicted: ActualVsPredictedData;
  strainLearningData: StrainLearningData;
}
```

#### Strain Profile Model
```typescript
interface StrainProfile {
  id: string;
  apiId: string;
  name: string;
  
  // Genetic information
  genetics: string;
  parentStrains: string[];
  dominantType: 'indica' | 'sativa' | 'hybrid';
  indicaPercentage: number;
  sativaPercentage: number;
  
  // Cultivation data
  floweringTimeMin: number;
  floweringTimeMax: number;
  harvestTimeOutdoor: string;
  yieldIndoor: string;
  yieldOutdoor: string;
  heightIndoor: string;
  heightOutdoor: string;
  growDifficulty: string;
  
  // Chemical profile
  thcLevel: string;
  cbdLevel: string;
  terpeneProfile: string[];
  
  // Sensory data
  effects: string[];
  flavors: string[];
  aromas: string[];
  
  // Cultivation guidance
  commonIssues: string[];
  preventiveMeasures: string[];
  optimalConditions: EnvironmentalConditions;
  
  // Learning data
  userSuccessRate: number;
  averageYieldAchieved: number;
  commonUserMistakes: string[];
  
  createdAt: Date;
  updatedAt: Date;
}
```

### Integration Points

#### 1. StrainAutocomplete Enhancement
```typescript
interface EnhancedStrainAutocomplete extends StrainAutocomplete {
  onStrainSelect: (strain: RawStrainApiResponse, cultivationData: CultivationProfile) => void;
  showCultivationPreview: boolean;
  previewData: CultivationPreview;
}

interface CultivationPreview {
  floweringTime: string;
  difficulty: string;
  yieldExpectation: string;
  harvestTiming: string;
  keyCharacteristics: string[];
}
```

#### 2. Plant Creation Form Integration
```typescript
interface StrainEnhancedPlantForm {
  selectedStrain: ProcessedStrainData | null;
  strainPredictions: StrainPredictions;
  customizationOptions: StrainCustomizationOptions;
  schedulePreview: SchedulePreview;
}

interface StrainCustomizationOptions {
  adjustFloweringTime: boolean;
  customEnvironment: EnvironmentalOverrides;
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  growingGoals: GrowingGoal[];
}
```

#### 3. Task System Integration
```typescript
interface StrainTaskIntegration {
  generateStrainTasks(plant: Plant, strainProfile: CultivationProfile): Promise<PlantTask[]>;
  updateTasksForStrainChange(plant: Plant, newStrain: ProcessedStrainData): Promise<void>;
  adaptTasksForGrowthStage(plant: Plant, stage: GrowthStage): Promise<void>;
  optimizeTaskSchedule(tasks: PlantTask[], strainProfile: CultivationProfile): Promise<PlantTask[]>;
}
```

## Data Models

### Strain Data Processing Pipeline

```mermaid
graph LR
    API[Strain API Response] --> PARSE[Parse & Validate]
    PARSE --> NORM[Normalize Data]
    NORM --> ENRICH[Enrich with Context]
    ENRICH --> STORE[Store Profile]
    STORE --> SCHED[Generate Schedule]
    SCHED --> PRED[Calculate Predictions]
    PRED --> TASKS[Create Tasks]
```

### Database Schema Extensions

#### strain_profiles table
```sql
CREATE TABLE strain_profiles (
  id TEXT PRIMARY KEY,
  api_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  genetics TEXT,
  flowering_time_min INTEGER,
  flowering_time_max INTEGER,
  harvest_time_outdoor TEXT,
  yield_indoor TEXT,
  yield_outdoor TEXT,
  grow_difficulty TEXT,
  thc_level TEXT,
  cbd_level TEXT,
  effects TEXT[], -- JSON array
  flavors TEXT[], -- JSON array
  cultivation_data TEXT, -- JSON object
  learning_data TEXT, -- JSON object
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### plant_strain_data table
```sql
CREATE TABLE plant_strain_data (
  id TEXT PRIMARY KEY,
  plant_id TEXT REFERENCES plants(id),
  strain_profile_id TEXT REFERENCES strain_profiles(id),
  expected_flowering_weeks INTEGER,
  expected_harvest_date TIMESTAMP,
  yield_expectation_min REAL,
  yield_expectation_max REAL,
  customizations TEXT, -- JSON object
  actual_vs_predicted TEXT, -- JSON object
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Error Handling

### Error Categories

1. **Strain Data Errors**
   - Invalid API response format
   - Missing critical cultivation data
   - Conflicting strain information

2. **Integration Errors**
   - Plant creation failures with strain data
   - Task generation errors
   - Schedule calculation failures

3. **Prediction Errors**
   - Insufficient data for predictions
   - Environmental factor conflicts
   - Timeline calculation errors

### Error Recovery Strategies

```typescript
interface ErrorRecoveryStrategy {
  handleStrainDataError(error: StrainDataError): FallbackStrategy;
  handleIntegrationError(error: IntegrationError): RecoveryAction;
  handlePredictionError(error: PredictionError): DefaultPrediction;
}

interface FallbackStrategy {
  useGenericProfile: boolean;
  usePartialData: boolean;
  requestUserInput: boolean;
  fallbackToManualSchedule: boolean;
}
```

## Testing Strategy

### Unit Testing
- Strain data parsing and validation
- Cultivation profile generation
- Task scheduling algorithms
- Prediction calculations

### Integration Testing
- StrainAutocomplete → Plant creation flow
- Strain data → Task generation pipeline
- Calendar integration with strain schedules
- Notification system with strain-specific tasks

### End-to-End Testing
- Complete strain selection to harvest workflow
- Multi-plant strain comparison scenarios
- Growth stage transition handling
- Prediction accuracy validation

### Performance Testing
- Strain data processing speed
- Large-scale task generation
- Calendar view rendering with strain data
- Database query optimization

## Security Considerations

### Data Privacy
- Strain selection history encryption
- User cultivation data protection
- Anonymous usage analytics only

### API Security
- Rate limiting for strain API calls
- Secure storage of API responses
- Data validation and sanitization

### User Data Protection
- Encrypted storage of sensitive cultivation data
- Secure transmission of strain preferences
- GDPR compliance for EU users

## Performance Optimization

### Caching Strategy
- Strain profile caching (24-hour TTL)
- Cultivation data preprocessing
- Task schedule template caching
- Prediction result memoization

### Database Optimization
- Indexed strain lookups
- Efficient task queries
- Optimized plant-strain relationships
- Background data processing

### Memory Management
- Lazy loading of strain details
- Efficient data structures
- Garbage collection optimization
- Resource cleanup on component unmount

## Monitoring and Analytics

### Key Metrics
- Strain selection accuracy
- Prediction vs. actual results
- User engagement with strain features
- Task completion rates by strain difficulty

### Performance Monitoring
- Strain data processing time
- Task generation performance
- Calendar rendering speed
- Database query performance

### User Analytics
- Most popular strain selections
- Success rates by strain type
- Feature usage patterns
- Error rates and recovery success