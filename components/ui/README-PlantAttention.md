# Plant Attention System

This document describes the plant attention indicator system that provides visual feedback for plants that need care or attention.

## Overview

The plant attention system consists of several components that work together to:
- Monitor plant health and care reminders
- Display visual indicators on plant cards
- Provide priority-based highlighting
- Show notification badges for overdue tasks
- Sort plants by attention priority

## Components

### 1. `usePlantAttention` Hook

The main hook that monitors plant attention status across multiple plants.

```typescript
const {
  attentionMap,
  loading,
  totalPlantsNeedingAttention,
  urgentPlantsCount,
  highPriorityPlantsCount,
  getPlantAttentionStatus,
} = usePlantAttention(plantIds);
```

**Features:**
- Real-time monitoring of care reminders
- Health-based attention detection
- Priority level calculation
- Batch processing for multiple plants

**Priority Levels:**
- `urgent`: Overdue reminders or critical health issues
- `high`: Due today or low health (< 50%)
- `medium`: Due soon (within 2 days) or moderate issues
- `low`: No immediate attention needed

### 2. `useSinglePlantAttention` Hook

Simplified hook for monitoring a single plant's attention status.

```typescript
const { attentionStatus, loading } = useSinglePlantAttention(plantId);
```

### 3. `NotificationBadge` Component

Displays count-based notification badges with priority colors.

```typescript
<NotificationBadge
  count={5}
  priority="urgent"
  size="medium"
  animate={true}
/>
```

**Props:**
- `count`: Number to display (0 hides badge)
- `priority`: 'low' | 'medium' | 'high' | 'urgent'
- `size`: 'small' | 'medium' | 'large'
- `showIcon`: Show icon for count=1
- `animate`: Enable entrance animation

### 4. `AttentionIndicator` Component

Displays priority-based attention indicators without counts.

```typescript
<AttentionIndicator
  priority="high"
  size="medium"
  animate={true}
/>
```

### 5. `PlantAttentionSummary` Component

Shows overall attention statistics for multiple plants.

```typescript
<PlantAttentionSummary
  plantIds={plantIds}
  showDetails={true}
  compact={false}
/>
```

### 6. Enhanced `PlantCard` Component

The plant card now includes:
- Priority border highlighting
- Attention indicators overlay
- Notification badges for reminder counts
- Color-coded health/watering/nutrient stats
- Attention reason summaries

## Visual Indicators

### Priority Colors
- **Urgent**: Red (`status-danger`)
- **High**: Amber (`status-warning`)
- **Medium**: Green (`primary-500`)
- **Low**: Gray (`neutral-500`)

### Card Enhancements
- **Border**: Left border with priority color
- **Shadow**: Enhanced shadow with priority color
- **Badges**: Overlay badges on plant image
- **Stats**: Color-coded stat indicators
- **Text**: Priority-colored attention messages

### Sorting
Plants are automatically sorted by attention priority:
1. Urgent priority plants
2. High priority plants
3. Medium priority plants
4. Low priority plants
5. Plants with no attention needed

## Attention Triggers

### Reminder-Based
- **Overdue**: Reminders past due date → Urgent
- **Due Today**: Reminders due today → High
- **Due Soon**: Reminders due within 2 days → Medium

### Health-Based
- **Critical Health**: < 25% health → Urgent
- **Low Health**: < 50% health → High
- **Overdue Watering**: nextWateringDays ≤ 0 → High
- **Overdue Nutrients**: nextNutrientDays ≤ 0 → Medium

## Translation Keys

All text is internationalized using the `plantAttention` namespace:

```json
{
  "plantAttention": {
    "needsAttention": "Needs Attention",
    "overdueTask": "{{count}} overdue task",
    "overdueTask_plural": "{{count}} overdue tasks",
    "dueToday": "{{count}} task due today",
    "dueToday_plural": "{{count}} tasks due today",
    "lowHealth": "Health is low ({{percentage}}%)",
    "overdueWatering": "Watering is overdue",
    "overdueNutrients": "Nutrients are overdue",
    "priorityUrgent": "Urgent",
    "priorityHigh": "High Priority",
    "priorityMedium": "Medium Priority",
    "priorityLow": "Low Priority"
  }
}
```

## Performance Considerations

- **Memoization**: All computed values are memoized
- **Subscription Management**: Proper cleanup of database subscriptions
- **Batch Processing**: Efficient handling of multiple plants
- **Animation Optimization**: Worklet-based animations with proper cleanup

## Usage Examples

### Basic Plant List with Attention
```typescript
import { PlantList } from '@/components/PlantList';

// Plant list automatically includes attention indicators
<PlantList />
```

### Custom Attention Summary
```typescript
import { PlantAttentionSummary } from '@/components/ui/PlantAttentionSummary';

<PlantAttentionSummary
  plantIds={selectedPlantIds}
  showDetails={true}
  compact={false}
/>
```

### Navigation Badge
```typescript
import { PlantAttentionBadge } from '@/components/ui/PlantAttentionSummary';

<PlantAttentionBadge size="small" />
```

## Testing

The system includes comprehensive tests for:
- Hook functionality
- Component rendering
- Priority calculation
- Translation integration
- Animation behavior

Run tests with:
```bash
npm test -- --testPathPattern="PlantAttention|NotificationBadge"
```

## Future Enhancements

Potential improvements:
- Push notification integration
- Custom attention rules
- Attention history tracking
- Bulk attention actions
- Advanced filtering options