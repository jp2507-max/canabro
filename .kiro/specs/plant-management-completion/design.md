# Plant Management System Completion - Design Document

## Overview

This design document outlines the completion of the Canabro plant management system. The existing architecture already provides 95% of the required functionality through WatermelonDB models, React Native components, and Supabase integration. This design focuses on the remaining components needed to create a comprehensive cannabis growing platform.

## Architecture

### Existing Foundation
- **Data Layer**: WatermelonDB with Plant model containing all necessary fields
- **UI Layer**: React Native with NativeWind v4 styling and Reanimated v3 animations
- **Forms**: React Hook Form with Zod validation
- **Image Handling**: Expo Camera/ImagePicker with Supabase Storage upload
- **Navigation**: Expo Router with deep linking support

### New Components Architecture
```
components/
├── plant-metrics/
│   ├── MetricsInputForm.tsx          # Uses EnhancedTextInput, ThemedView
│   ├── MetricsChart.tsx              # Uses ThemedView, ThemedText
│   ├── VPDCalculator.tsx             # Uses existing calculation utilities
│   └── TrichomeSelector.tsx          # Uses OptimizedIcon, AnimatedButton pattern
├── plant-gallery/
│   ├── PhotoGallery.tsx              # Uses ThemedView, OptimizedIcon
│   ├── PhotoViewer.tsx               # Uses existing image-picker utilities
│   └── PhotoUploadModal.tsx          # Extends existing AddPlantForm photo logic
├── plant-harvest/
│   ├── HarvestForm.tsx               # Uses EnhancedTextInput, react-hook-form pattern
│   ├── YieldCalculator.tsx           # Uses ThemedText, ThemedView
│   └── HarvestHistory.tsx            # Uses existing PlantCard styling patterns
├── plant-search/
│   ├── PlantSearchBar.tsx            # Uses EnhancedTextInput with search styling
│   ├── PlantFilters.tsx              # Uses AnimatedSelectionButton pattern
│   └── SearchResults.tsx             # Extends existing PlantList component
└── notifications/
    ├── CareReminders.tsx             # Uses ThemedView, OptimizedIcon
    └── NotificationScheduler.tsx     # Uses existing form patterns
```

### Existing Component Reuse Strategy
- **ThemedView/ThemedText**: All new components will use these for consistent theming
- **EnhancedTextInput**: All form inputs will use this component for consistency (supports labels, icons, validation, character counts)
- **OptimizedIcon**: All icons will use this component with proper theming
- **AnimatedButton/AnimatedSelectionButton**: Reuse existing button patterns from AddPlantForm
- **EnhancedKeyboardWrapper**: All forms will use this for proper keyboard handling and accessory toolbar
- **FlashListWrapper**: Use for all list components instead of FlatList for better performance
- **upload-image utilities**: Use existing uploadPlantGalleryImage and related functions for all image uploads
- **Existing form patterns**: Follow react-hook-form + Zod validation patterns from AddPlantForm
- **Existing animation patterns**: Use Reanimated v3 patterns from PlantCard and other components

## Components and Interfaces

### 1. Photo Gallery System

#### PhotoGallery Component
```typescript
interface PhotoGalleryProps {
  plantId: string;
  photos: PlantPhoto[];
  onPhotoPress: (photo: PlantPhoto, index: number) => void;
  onAddPhoto: () => void;
}

interface PlantPhoto {
  id: string;
  plantId: string;
  imageUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  takenAt: Date;
  growthStage: GrowthStage;
}
```

**Design Features:**
- Grid layout using ThemedView with NativeWind v4 responsive classes
- Lazy loading with FlatList (following PlantList.tsx patterns)
- Add photo button using existing AnimatedButton component from AddPlantForm
- Growth stage badges using OptimizedIcon with semantic color tokens
- Smooth animations using Reanimated v3 worklets (following PlantCard patterns)
- Uses existing image-picker utilities (takePhoto, selectFromGallery)

#### PhotoViewer Component
```typescript
interface PhotoViewerProps {
  photos: PlantPhoto[];
  initialIndex: number;
  visible: boolean;
  onClose: () => void;
  onDelete?: (photoId: string) => void;
}
```

**Design Features:**
- Full-screen modal with swipe gestures
- Zoom and pan capabilities using react-native-gesture-handler
- Photo metadata overlay (date, growth stage, caption)
- Delete functionality with confirmation
- Smooth transitions with shared element animations

### 2. Comprehensive Metrics System

#### MetricsInputForm Component
```typescript
interface PlantMetrics {
  // Basic Health
  healthPercentage: number;
  nextWateringDays: number;
  nextNutrientDays: number;
  
  // Growth Measurements
  height: number;
  heightUnit: 'cm' | 'inches';
  nodeCount: number;
  stemDiameter: number;
  
  // Environmental
  pH: number;
  ecPpm: number;
  temperature: number;
  temperatureUnit: 'celsius' | 'fahrenheit';
  humidity: number;
  vpd?: number; // Auto-calculated
  
  // Flowering
  trichomeStatus: 'clear' | 'cloudy' | 'amber' | 'mixed';
  pistilBrownPercentage: number;
  budDensity: number; // 1-10 scale
  
  recordedAt: Date;
  notes?: string;
}
```

**Design Features:**
- Multi-step form with logical groupings
- Visual indicators for trichome status (color-coded icons)
- Unit toggles for measurements (metric/imperial)
- Auto-calculation of VPD from temperature and humidity
- Input validation with helpful error messages
- Progress indicators showing optimal ranges

#### MetricsChart Component
```typescript
interface MetricsChartProps {
  plantId: string;
  metricType: keyof PlantMetrics;
  timeRange: '7d' | '30d' | '90d' | 'all';
  showOptimalRange?: boolean;
}
```

**Design Features:**
- Line charts using react-native-chart-kit or Victory Native
- Optimal range highlighting (green zones)
- Interactive data points with tooltips
- Time range selector
- Export functionality for data sharing

### 3. Harvest Management System

#### HarvestForm Component
```typescript
interface HarvestData {
  plantId: string;
  harvestDate: Date;
  wetWeight: number;
  dryWeight: number;
  trimWeight: number;
  weightUnit: 'grams' | 'ounces';
  dryingMethod: string;
  curingNotes: string;
  totalGrowDays: number; // Auto-calculated
  yieldPerDay: number; // Auto-calculated
}
```

**Design Features:**
- Step-by-step harvest recording process
- Weight input with unit conversion
- Automatic yield efficiency calculations
- Photo capture for harvest documentation
- Integration with plant timeline

### 4. Search and Filter System

#### PlantSearchBar Component
```typescript
interface PlantSearchBarProps {
  onSearchChange: (query: string) => void;
  onFilterPress: () => void;
  placeholder?: string;
  showFilterBadge?: boolean;
}
```

**Design Features:**
- Real-time search with debouncing
- Clear button when text is entered
- Filter button with active filter indicator
- Smooth animations for state changes

#### PlantFilters Component
```typescript
interface PlantFilters {
  growthStages: GrowthStage[];
  healthRange: [number, number];
  strainTypes: CannabisType[];
  needsAttention: boolean;
  sortBy: 'name' | 'planted_date' | 'health' | 'next_watering';
  sortOrder: 'asc' | 'desc';
}
```

**Design Features:**
- Bottom sheet modal for filter options
- Multi-select chips for categories
- Range sliders for numeric values
- Quick filter presets (e.g., "Needs Attention")
- Clear all filters option

### 5. Notification System

#### CareReminders Component
```typescript
interface CareReminder {
  id: string;
  plantId: string;
  type: 'watering' | 'nutrients' | 'inspection' | 'custom';
  title: string;
  description?: string;
  scheduledFor: Date;
  isCompleted: boolean;
  repeatInterval?: number; // days
}
```

**Design Features:**
- Local notifications using expo-notifications
- Reminder cards with plant photos
- Quick action buttons (Mark Done, Snooze, Reschedule)
- Batch operations for multiple plants
- Integration with device calendar

## Data Models

### Extended Plant Model
The existing Plant model already contains most required fields. We'll add:

```typescript
// Additional fields to add to Plant model
@field('node_count') nodeCount?: number;
@field('stem_diameter') stemDiameter?: number;
@field('ph_level') phLevel?: number;
@field('ec_ppm') ecPpm?: number;
@field('temperature') temperature?: number;
@field('humidity') humidity?: number;
@field('vpd') vpd?: number;
@text('trichome_status') trichomeStatus?: string;
@field('pistil_brown_percentage') pistilBrownPercentage?: number;
@field('bud_density') budDensity?: number;
@field('wet_weight') wetWeight?: number;
@field('dry_weight') dryWeight?: number;
@field('trim_weight') trimWeight?: number;
@date('harvest_date') harvestDate?: Date;
```

### New Models

#### PlantPhoto Model
```typescript
export class PlantPhoto extends Model {
  static table = 'plant_photos';
  
  @text('plant_id') plantId!: string;
  @text('image_url') imageUrl!: string;
  @text('thumbnail_url') thumbnailUrl?: string;
  @text('caption') caption?: string;
  @text('growth_stage') growthStage!: string;
  @readonly @date('taken_at') takenAt!: Date;
  @field('file_size') fileSize?: number;
  @field('width') width?: number;
  @field('height') height?: number;
  
  @relation('plants', 'plant_id') plant!: Plant;
}
```

#### PlantMetrics Model
```typescript
export class PlantMetrics extends Model {
  static table = 'plant_metrics';
  
  @text('plant_id') plantId!: string;
  @field('health_percentage') healthPercentage?: number;
  @field('height') height?: number;
  @field('node_count') nodeCount?: number;
  @field('ph_level') phLevel?: number;
  @field('ec_ppm') ecPpm?: number;
  @field('temperature') temperature?: number;
  @field('humidity') humidity?: number;
  @field('vpd') vpd?: number;
  @text('trichome_status') trichomeStatus?: string;
  @field('bud_density') budDensity?: number;
  @text('notes') notes?: string;
  @readonly @date('recorded_at') recordedAt!: Date;
  
  @relation('plants', 'plant_id') plant!: Plant;
}
```

#### CareReminder Model
```typescript
export class CareReminder extends Model {
  static table = 'care_reminders';
  
  @text('plant_id') plantId!: string;
  @text('type') type!: string;
  @text('title') title!: string;
  @text('description') description?: string;
  @date('scheduled_for') scheduledFor!: Date;
  @field('is_completed') isCompleted!: boolean;
  @field('repeat_interval') repeatInterval?: number;
  @readonly @date('created_at') createdAt!: Date;
  
  @relation('plants', 'plant_id') plant!: Plant;
}
```

## Error Handling

### Validation Strategy
- **Form Validation**: Zod schemas for all input forms with custom error messages
- **Data Validation**: Model-level validation for database constraints
- **Network Errors**: Graceful handling of Supabase sync failures
- **Image Upload Errors**: Retry logic with user feedback

### Error Recovery
- **Offline Support**: WatermelonDB provides offline-first functionality
- **Sync Conflicts**: Automatic resolution with user notification for critical conflicts
- **Data Corruption**: Backup and restore mechanisms
- **Performance Issues**: Lazy loading and pagination for large datasets

## Testing Strategy

### Unit Testing
- **Component Testing**: React Native Testing Library for all new components
- **Model Testing**: WatermelonDB model validation and relationships
- **Utility Testing**: Calculation functions (VPD, yield efficiency)
- **Form Testing**: Validation logic and error handling

### Integration Testing
- **End-to-End Flows**: Complete plant lifecycle from creation to harvest
- **Photo Upload**: Camera integration and Supabase storage
- **Notification System**: Local notification scheduling and handling
- **Search Performance**: Large dataset filtering and sorting

### Performance Testing
- **Large Photo Collections**: Gallery performance with 100+ photos
- **Metrics History**: Chart rendering with extensive historical data
- **Search Responsiveness**: Real-time filtering with large plant collections
- **Memory Usage**: Image caching and cleanup strategies

## Security Considerations

### Data Privacy
- **Local Storage**: Sensitive grow data stored locally in WatermelonDB
- **Image Privacy**: Plant photos not stored in device gallery by default
- **User Authentication**: Supabase Auth for cloud sync (optional)
- **Data Encryption**: Sensitive fields encrypted at rest

### Access Control
- **Multi-User Support**: Plant ownership and sharing permissions
- **Guest Mode**: Limited functionality without account creation
- **Data Export**: User-controlled data portability
- **Account Deletion**: Complete data removal on request

## Performance Optimizations

### Image Handling
- **Thumbnail Generation**: Automatic thumbnail creation for gallery views
- **Lazy Loading**: Progressive image loading in galleries
- **Compression**: Automatic image compression before upload
- **Caching**: Intelligent image caching with cleanup

### Database Performance
- **Indexing**: Proper indexes on frequently queried fields
- **Pagination**: Limit query results for large datasets
- **Background Sync**: Non-blocking Supabase synchronization
- **Query Optimization**: Efficient WatermelonDB queries with proper relations

### UI Performance
- **Memoization**: React.memo for expensive components
- **Virtualization**: FlatList for large plant collections
- **Animation Optimization**: Reanimated v3 worklets for smooth animations
- **Bundle Splitting**: Code splitting for optional features