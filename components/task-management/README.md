# Task Management Components

This directory contains components for task management with bulk operations support, adapted from the plant management system's CareReminders component.

## Components

### BulkTaskActions
Main component that provides bulk operation functionality for tasks. Supports:
- Bulk complete tasks
- Bulk reschedule tasks
- Bulk snooze tasks
- Bulk delete tasks (optional)

**Features:**
- Confirmation dialogs for destructive actions
- Progress indicators during operations
- Haptic feedback for user interactions
- Error handling with user-friendly messages
- Internationalization support

### TaskCardWithSelection
Enhanced task card component that supports both normal and selection modes:
- **Normal mode**: Shows completion checkbox and supports swipe gestures
- **Selection mode**: Shows selection checkbox for bulk operations
- Maintains all original TaskCard functionality
- Smooth animations for state transitions

### WeeklyTaskViewWithBulkActions
Enhanced weekly task view that integrates bulk operations:
- Toggle between normal and selection modes
- Bulk actions bar that appears when tasks are selected
- Maintains all original WeeklyTaskView functionality
- Optimized for horizontal 5-day task layout

## Usage

### Basic Implementation
```typescript
import { WeeklyTaskViewWithBulkActions } from '@/components/task-management';

<WeeklyTaskViewWithBulkActions
  tasks={tasks}
  onTaskPress={handleTaskPress}
  onTaskComplete={handleTaskComplete}
  onBulkComplete={handleBulkComplete}
  onBulkReschedule={handleBulkReschedule}
  onBulkSnooze={handleBulkSnooze}
  getPlantName={(plantId) => plants.find(p => p.id === plantId)?.name || 'Unknown'}
  getPlantImage={(plantId) => plants.find(p => p.id === plantId)?.imageUrl}
/>
```

### Bulk Operation Handlers
```typescript
const handleBulkComplete = async (taskIds: string[]) => {
  try {
    await taskService.batchMarkCompleted(taskIds);
    // Update UI state
  } catch (error) {
    // Handle error
  }
};

const handleBulkReschedule = async (taskIds: string[], newDate: Date) => {
  try {
    await taskService.batchReschedule(taskIds, newDate);
    // Update UI state
  } catch (error) {
    // Handle error
  }
};

const handleBulkSnooze = async (taskIds: string[], minutes: number) => {
  try {
    await taskService.batchSnooze(taskIds, minutes);
    // Update UI state
  } catch (error) {
    // Handle error
  }
};
```

## Reuse Benefits

This implementation reuses 90% of the bulk operations logic from the CareReminders component:

- **Multi-select interface patterns**: ✅ Reused selection state management
- **Batch operations logic**: ✅ Reused confirmation dialogs and progress indicators  
- **UI patterns**: ✅ Adapted bulk action buttons and selection indicators
- **Error handling**: ✅ Reused Alert.alert patterns and haptic feedback
- **Animation patterns**: ✅ Reused button and card animations

## Adaptations for Task Management

### Horizontal 5-Day Layout
- Bulk actions bar positioned at bottom for easy thumb access
- Selection mode optimized for daily task workflows
- Clear visual indicators for selected tasks

### Task-Specific Actions
- **Complete**: Mark tasks as done with completion tracking
- **Reschedule**: Move tasks to different dates
- **Snooze**: Delay tasks by specified time periods
- **Delete**: Remove tasks (optional, with confirmation)

### Performance Optimizations
- FlashList virtualization for large task lists
- Stable component references with React.memo
- Efficient selection state management
- Optimized re-renders during bulk operations

## Translation Keys

The component uses the following translation keys:
- `taskManagement.bulkActions.*` - Bulk action labels and messages
- `taskManagement.bulkActions.confirmComplete.*` - Completion confirmation
- `taskManagement.bulkActions.confirmSnooze.*` - Snooze confirmation
- `taskManagement.bulkActions.confirmDelete.*` - Delete confirmation
- `taskManagement.bulkActions.error.*` - Error messages

## Requirements Satisfied

- **R5-AC5**: Bulk task operations with multi-select interface
- **R5-AC4**: Task completion tracking with bulk actions
- **90% reuse benefit**: Leveraged existing CareReminders bulk operations logic