# Care Reminders Components

This directory contains components for managing plant care reminders and notifications in the Canabro app.

## Components

### CareReminders

The main component for displaying and managing care reminders.

**Features:**
- Display reminders grouped by priority (urgent, high, medium, low)
- Quick actions: Mark Done, Snooze, Reschedule
- Batch operations for multiple reminders
- Plant photos and details in reminder cards
- Pull-to-refresh functionality
- Empty states for no reminders

**Props:**
```typescript
interface CareRemindersProps {
  plantId?: string; // Optional filter for specific plant
  showCompleted?: boolean; // Show completed vs active reminders
  onReminderPress?: (reminder: CareReminder) => void; // Callback for reminder tap
}
```

**Usage:**
```tsx
import { CareReminders } from '@/components/notifications';

// Show all active reminders
<CareReminders />

// Show reminders for specific plant
<CareReminders plantId="plant-123" />

// Show completed reminders
<CareReminders showCompleted={true} />
```

### NotificationScheduler

Component for creating new care reminders with notification scheduling.

**Features:**
- Reminder type selection (watering, nutrients, inspection, custom)
- Title and description input
- Date/time scheduling
- Repeat interval configuration
- Notification permission handling
- Plant context display

**Props:**
```typescript
interface NotificationSchedulerProps {
  plant: Plant; // Plant to create reminder for
  onReminderCreated?: (reminder: CareReminder) => void; // Success callback
  onClose?: () => void; // Close callback
}
```

**Usage:**
```tsx
import { NotificationScheduler } from '@/components/notifications';

<NotificationScheduler
  plant={selectedPlant}
  onReminderCreated={(reminder) => console.log('Created:', reminder)}
  onClose={() => setShowModal(false)}
/>
```

### CareRemindersExample

Example component demonstrating complete care reminder workflow.

**Usage:**
```tsx
import { CareRemindersExample } from '@/components/notifications';

// Show all reminders with add button
<CareRemindersExample />

// Show reminders for specific plant
<CareRemindersExample plant={selectedPlant} />
```

## Services

### careReminderService

Service class for managing care reminder operations.

**Key Methods:**
- `createReminder(options)` - Create new reminder
- `getActiveRemindersForPlant(plantId)` - Get plant reminders
- `markReminderCompleted(id)` - Mark as done
- `snoozeReminder(id, days)` - Snooze reminder
- `batchMarkCompleted(ids)` - Batch mark done
- `createDefaultRemindersForPlant(plant)` - Create default reminders

## Hooks

### useNotifications

Hook for managing notification permissions and scheduling.

**Returns:**
- `permissionStatus` - Current permission status
- `requestPermissions()` - Request notification permissions
- `scheduleNotification(options)` - Schedule a notification
- `cancelNotification(id)` - Cancel scheduled notification

## Requirements Fulfilled

This implementation fulfills the following requirements from the spec:

### Requirement 5.1: Care Reminder Configuration
✅ Users can configure care reminder schedules for plants
✅ Reminder types: watering, nutrients, inspection, custom
✅ Repeat interval configuration

### Requirement 5.2: Local Notifications
✅ System sends local notifications when care tasks are due
✅ Notification permission handling
✅ Notification categories with action buttons

### Requirement 5.3: Visual Indicators
✅ Plants requiring attention are visually highlighted
✅ Priority-based color coding (urgent=red, high=orange, medium=blue, low=gray)
✅ Plant photos in reminder cards

### Requirement 5.4: Task Completion
✅ Users can mark care tasks as done
✅ Reschedule functionality
✅ Snooze options (1 day default, customizable)

### Requirement 5.5: Escalation
✅ Overdue reminders have escalated priority
✅ Visual distinction for overdue vs due today vs due soon
✅ Batch operations for managing multiple reminders

## Translation Keys

The components use the following translation namespaces:
- `careReminders.*` - Main reminder interface
- `notificationScheduler.*` - Reminder creation interface
- `common.*` - Shared UI elements

## Testing

Basic tests are included in `__tests__/CareReminders.test.tsx`. Run with:

```bash
npm test components/notifications
```

## Integration

To integrate into your app:

1. Ensure notification permissions are requested
2. Add translation keys to your locale files
3. Import and use components as needed
4. Set up notification handlers for background processing

## Dependencies

- `expo-notifications` - Local notifications
- `expo-device` - Device capability detection
- `@nozbe/watermelondb` - Database operations
- `react-hook-form` - Form handling
- `zod` - Form validation
- Custom UI components and animations