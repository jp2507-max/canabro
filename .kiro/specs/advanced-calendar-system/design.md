# Advanced Calendar System - Design Document

## Overview

The Advanced Calendar System builds upon CanaBro's existing task management foundation to create a comprehensive cultivation planning platform. The system integrates with existing Plant, PlantTask, and CareReminder models while adding new calendar-specific functionality and visual interfaces.

## Architecture

### Existing Foundation
- **Data Layer**: WatermelonDB with Plant, PlantTask, CareReminder models
- **UI Layer**: React Native with NativeWind v4, existing DateSelector component
- **Navigation**: Expo Router with calendar screen already implemented
- **Notifications**: Expo Notifications with basic reminder system

### New Components Architecture
```
components/
├── calendar/
│   ├── CalendarView.tsx              # Main visual calendar interface
│   ├── MonthlyCalendar.tsx           # Month view with task indicators
│   ├── WeeklyCalendar.tsx            # Week view for detailed planning
│   ├── DailyTaskList.tsx             # Day-specific task list
│   ├── TaskIndicator.tsx             # Color-coded task markers
│   └── CalendarNavigation.tsx        # Month/week/day navigation
├── schedule-templates/
│   ├── TemplateLibrary.tsx           # Browse and select templates
│   ├── TemplateEditor.tsx            # Create/edit custom templates
│   ├── TemplateApplicator.tsx        # Apply templates to plants
│   └── TemplateSharing.tsx           # Share templates with community
├── growth-automation/
│   ├── GrowthStageDetector.tsx       # Automatic stage progression
│   ├── AutoScheduler.tsx             # Automated task scheduling
│   ├── ReminderEngine.tsx            # Smart notification system
│   └── ScheduleAdjuster.tsx          # Dynamic schedule modifications
└── task-management/
    ├── TaskCompletionModal.tsx       # Enhanced task completion
    ├── BulkTaskActions.tsx           # Multi-task operations
    ├── TaskHistoryView.tsx           # Historical task analysis
    └── OverdueTaskAlert.tsx          # Overdue task management
```

## Components and Interfaces

### 1. Visual Calendar System

#### CalendarView Component
```typescript
interface CalendarViewProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  viewMode: 'month' | 'week' | 'day';
  onViewModeChange: (mode: 'month' | 'week' | 'day') => void;
}

interface CalendarTask {
  id: string;
  plantId: string;
  plantName: string;
  taskType: TaskType;
  title: string;
  scheduledDate: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  isCompleted: boolean;
  isOverdue: boolean;
  growthStage: GrowthStage;
}
```

**Design Features:**
- Monthly view with color-coded task indicators
- Week view for detailed daily planning
- Day view with hourly task scheduling
- Smooth transitions between view modes using Reanimated v3
- Pull-to-refresh for task updates
- Gesture-based navigation (swipe between months/weeks)

#### TaskIndicator Component
```typescript
interface TaskIndicatorProps {
  tasks: CalendarTask[];
  date: Date;
  size: 'small' | 'medium' | 'large';
  showCount?: boolean;
}

const TASK_COLORS = {
  watering: '#3B82F6',      // Blue
  feeding: '#10B981',       // Green
  inspection: '#F59E0B',    // Amber
  pruning: '#EF4444',       // Red
  harvest: '#8B5CF6',       // Purple
  transplant: '#F97316',    // Orange
} as const;
```

**Design Features:**
- Dot indicators for task presence
- Color coding by task type
- Task count badges for multiple tasks
- Priority-based visual emphasis
- Animated state changes

### 2. Schedule Template System

#### ScheduleTemplate Model
```typescript
export class ScheduleTemplate extends Model {
  static table = 'schedule_templates';
  
  @text('name') name!: string;
  @text('description') description?: string;
  @text('category') category!: string; // 'indoor', 'outdoor', 'hydroponic', etc.
  @text('strain_type') strainType?: string; // 'indica', 'sativa', 'hybrid'
  @field('duration_weeks') durationWeeks!: number;
  @text('created_by') createdBy!: string;
  @field('is_public') isPublic!: boolean;
  @field('usage_count') usageCount!: number;
  @json('template_data') templateData!: TemplateTaskData[];
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}

interface TemplateTaskData {
  weekNumber: number;
  dayOfWeek: number;
  taskType: TaskType;
  title: string;
  description: string;
  priority: TaskPriority;
  estimatedDuration: number; // minutes
  requiredSupplies?: string[];
}
```

#### TemplateEditor Component
```typescript
interface TemplateEditorProps {
  template?: ScheduleTemplate;
  onSave: (template: ScheduleTemplateData) => void;
  onCancel: () => void;
}

interface TemplateEditorState {
  basicInfo: {
    name: string;
    description: string;
    category: string;
    strainType: string;
    durationWeeks: number;
  };
  tasks: TemplateTaskData[];
  currentWeek: number;
}
```

**Design Features:**
- Week-by-week task planning interface
- Drag-and-drop task scheduling
- Task template library with common activities
- Preview mode showing full schedule timeline
- Validation for schedule completeness and logic

### 3. Growth Automation System

#### AutoScheduler Service
```typescript
class AutoScheduler {
  static async scheduleForGrowthStage(
    plant: Plant,
    newStage: GrowthStage,
    template?: ScheduleTemplate
  ): Promise<PlantTask[]> {
    // Generate stage-appropriate tasks
    // Consider plant strain characteristics
    // Apply template if provided
    // Schedule with appropriate intervals
    
    /**
     * IDEMPOTENCY & CONFLICT HANDLING:
     * 
     * This method is designed to be idempotent - calling it multiple times with
     * the same parameters will not create duplicate PlantTask entries.
     * 
     * Duplicate Prevention Strategy:
     * - Uses composite unique keys in WatermelonDB: (plantId, taskType, scheduledDate, growthStage)
     * - Before creating new tasks, queries existing tasks for the plant/stage combination
     * - Employs upsert pattern: updates existing tasks or creates new ones as needed
     * 
     * Race Condition Handling:
     * - Utilizes WatermelonDB's action queue to serialize all database writes
     * - Wraps all task creation in database.write() action for atomic operations
     * - Implements optimistic locking using task version numbers
     * - Uses mutex-like behavior through WatermelonDB's built-in transaction system
     * 
     * Conflict Resolution:
     * - If duplicate task detected: updates existing task with new parameters
     * - If scheduling conflict exists: adjusts timing by ±30 minutes automatically
     * - If critical conflict persists: throws SchedulingConflictError with details
     * - Maintains audit trail of all scheduling changes for debugging
     * 
     * Error Recovery:
     * - Failed operations are automatically retried up to 3 times with exponential backoff
     * - Partial failures rollback entire operation to maintain data consistency
     * - Returns detailed error information including conflicting task IDs
     */
  }

  static async adjustScheduleForConditions(
    plantId: string,
    conditions: EnvironmentalConditions
  ): Promise<void> {
    // Adjust watering frequency based on humidity
    // Modify feeding schedule based on growth rate
    // Update inspection frequency for problem prevention
  }

  static async generateRecurringTasks(
    plant: Plant,
    taskType: TaskType,
    interval: number,
    endDate?: Date
  ): Promise<PlantTask[]> {
    // Create recurring task series
    // Handle weekends and holidays
    // Avoid scheduling conflicts
  }
}
```

#### ReminderEngine Service
```typescript
class ReminderEngine {
  static async scheduleNotifications(tasks: PlantTask[]): Promise<void> {
    // Batch notifications by time and plant
    // Respect user notification preferences
    // Handle timezone changes
    // Implement smart notification timing
  }

  static async processOverdueTasks(): Promise<void> {
    // Identify overdue tasks
    // Send escalated notifications
    // Suggest rescheduling options
    // Update task priorities
  }

  static async optimizeNotificationTiming(
    userId: string,
    tasks: PlantTask[]
  ): Promise<Date[]> {
    // Analyze user activity patterns
    // Group related tasks
    // Avoid notification spam
    // Respect quiet hours
  }
}
```

### 4. Enhanced Task Management

#### TaskCompletionModal Component
```typescript
interface TaskCompletionModalProps {
  task: PlantTask;
  visible: boolean;
  onComplete: (completion: TaskCompletion) => void;
  onCancel: () => void;
}

interface TaskCompletion {
  taskId: string;
  completedAt: Date;
  notes?: string;
  photos?: string[];
  nextScheduledDate?: Date;
  conditions?: {
    temperature?: number;
    humidity?: number;
    pH?: number;
  };
  supplies?: {
    used: string[];
    amounts: Record<string, number>;
  };
}
```

**Design Features:**
- Quick completion with single tap
- Detailed completion with notes and photos
- Condition recording for environmental tracking
- Supply usage tracking
- Automatic next task scheduling

#### BulkTaskActions Component
```typescript
interface BulkTaskActionsProps {
  selectedTasks: PlantTask[];
  onBulkComplete: (tasks: PlantTask[], completion: Partial<TaskCompletion>) => void;
  onBulkReschedule: (tasks: PlantTask[], newDate: Date) => void;
  onBulkDelete: (tasks: PlantTask[]) => void;
}
```

**Design Features:**
- Multi-select task interface
- Bulk completion with shared notes
- Batch rescheduling with date picker
- Confirmation dialogs for destructive actions
- Progress indicators for bulk operations

## Data Models

### Extended PlantTask Model
```typescript
// Additional fields to add to existing PlantTask model
@text('template_id') templateId?: string;
@field('week_number') weekNumber?: number;
@field('estimated_duration') estimatedDuration?: number;
@json('completion_data') completionData?: TaskCompletion;
@field('auto_generated') autoGenerated!: boolean;
@text('parent_task_id') parentTaskId?: string; // For recurring tasks
@field('sequence_number') sequenceNumber?: number;
@json('environmental_conditions') environmentalConditions?: EnvironmentalConditions;
```

### New Models

#### CalendarEvent Model
```typescript
export class CalendarEvent extends Model {
  static table = 'calendar_events';
  
  @text('title') title!: string;
  @text('description') description?: string;
  @date('start_date') startDate!: Date;
  @date('end_date') endDate?: Date;
  @text('event_type') eventType!: string; // 'task', 'milestone', 'reminder'
  @text('plant_id') plantId?: string;
  @text('task_id') taskId?: string;
  @field('is_all_day') isAllDay!: boolean;
  @text('recurrence_rule') recurrenceRule?: string; // RRULE format
  @json('metadata') metadata?: Record<string, any>;
  
  @relation('plants', 'plant_id') plant?: Plant;
  @relation('plant_tasks', 'task_id') task?: PlantTask;
}
```

#### NotificationSchedule Model
```typescript
export class NotificationSchedule extends Model {
  static table = 'notification_schedules';
  
  @text('plant_id') plantId!: string;
  @text('task_type') taskType!: string;
  @date('next_notification') nextNotification!: Date;
  @field('interval_hours') intervalHours!: number;
  @field('max_notifications') maxNotifications?: number;
  @field('sent_count') sentCount!: number;
  @field('is_active') isActive!: boolean;
  @json('notification_settings') notificationSettings?: NotificationSettings;
  
  @relation('plants', 'plant_id') plant!: Plant;
}
```

## Error Handling

### Calendar Performance
- **Large Dataset Handling**: Virtualized calendar views for users with many plants
- **Date Range Optimization**: Load tasks in monthly chunks with pagination
- **Memory Management**: Cleanup old calendar data and completed tasks
- **Sync Conflicts**: Handle offline task creation and online sync conflicts

### Template System
- **Template Validation**: Ensure templates have valid task sequences and timing
- **Version Control**: Handle template updates and backward compatibility
- **Import/Export**: Robust template sharing with error recovery
- **Dependency Management**: Handle missing task types or invalid references

### Automation Reliability
- **Notification Delivery**: Retry failed notifications with exponential backoff
- **Schedule Conflicts**: Detect and resolve overlapping task schedules
- **Growth Stage Detection**: Fallback to manual stage progression if automation fails
- **Environmental Integration**: Handle missing or invalid sensor data gracefully

## Testing Strategy

### Unit Testing
- **Calendar Logic**: Date calculations, task filtering, view transitions
- **Template System**: Template creation, validation, application logic
- **Automation Engine**: Growth stage detection, task scheduling algorithms
- **Notification System**: Scheduling, batching, and delivery logic

### Integration Testing
- **End-to-End Workflows**: Complete calendar usage from plant creation to harvest
- **Template Application**: Create template, apply to plant, verify task creation
- **Automation Scenarios**: Growth stage changes trigger correct task updates
- **Cross-Platform**: Calendar functionality on iOS and Android

### Performance Testing
- **Large Plant Collections**: Calendar performance with 100+ plants
- **Complex Templates**: Templates with 50+ tasks across 20+ weeks
- **Notification Load**: System performance with 1000+ scheduled notifications
- **Real-time Updates**: Calendar responsiveness during live task updates

## Security Considerations

### Data Privacy
- **Template Sharing**: User consent for public template sharing
- **Calendar Export**: Secure data export without sensitive information
- **Notification Content**: Avoid exposing sensitive grow information in notifications
- **User Activity**: Privacy-conscious activity tracking and analytics

### Access Control
- **Template Permissions**: Control who can edit shared templates
- **Calendar Sharing**: Optional calendar sharing with other users
- **Automation Controls**: User override for all automated scheduling
- **Data Ownership**: Clear ownership of templates and calendar data

## Performance Optimizations

### Calendar Rendering
- **Virtual Scrolling**: Efficient rendering of large calendar views
- **Lazy Loading**: Load task details only when needed
- **Caching Strategy**: Cache frequently accessed calendar data
- **Animation Performance**: Smooth transitions using Reanimated v3 worklets

### Background Processing
- **Task Scheduling**: Efficient background task creation and updates
- **Notification Processing**: Batch notification scheduling and delivery
- **Data Sync**: Incremental sync for calendar and task data
- **Cleanup Operations**: Automatic cleanup of old tasks and notifications