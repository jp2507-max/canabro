# Plant Management System Completion - Requirements Document

## Introduction

The core plant management system is already 95% implemented in the Canabro app. This spec focuses on completing the remaining 5% of functionality and ensuring all components work together seamlessly. The existing system includes comprehensive CRUD operations, photo capture, growth tracking, and plant details - we just need to add a few missing UI components and perform integration testing.

## Requirements

### Requirement 1: Photo Gallery Enhancement

**User Story:** As a plant grower, I want to view multiple photos of my plant in a gallery format, so that I can track visual progress over time.

#### Acceptance Criteria

1. WHEN a user views a plant detail screen THEN they SHALL see a photo gallery component if multiple photos exist
2. WHEN a user taps on a photo in the gallery THEN the system SHALL display a full-screen photo viewer
3. WHEN viewing photos in full-screen THEN the user SHALL be able to swipe between photos
4. WHEN no photos exist THEN the system SHALL display a placeholder with option to add first photo

### Requirement 2: Comprehensive Plant Metrics Tracking

**User Story:** As a cannabis grower, I want to track comprehensive plant metrics including health, environmental conditions, and growth measurements, so that I can optimize my growing conditions and track progress accurately.

#### Acceptance Criteria

1. WHEN a user accesses plant actions THEN they SHALL see an option to "Update Plant Metrics"
2. WHEN updating basic health metrics THEN the system SHALL provide input fields for:
   - Health percentage (0-100%)
   - Next watering days (positive integer)
   - Next nutrient days (positive integer)
3. WHEN updating growth measurements THEN the system SHALL provide input fields for:
   - Plant height (in cm/inches with unit toggle)
   - Node count (number of nodes)
   - Stem diameter (in mm)
4. WHEN updating environmental metrics THEN the system SHALL provide input fields for:
   - pH level (0-14 with decimal precision)
   - EC/PPM (electrical conductivity/parts per million)
   - Temperature (°C/°F with unit toggle)
   - Humidity percentage (0-100%)
   - VPD (Vapor Pressure Deficit) - auto-calculated from temp/humidity
5. WHEN updating flowering metrics THEN the system SHALL provide input fields for:
   - Trichome status (clear/cloudy/amber with visual indicators)
   - Pistil color (white/brown percentage)
   - Bud density (1-10 scale)
6. WHEN metrics are updated THEN the system SHALL validate all inputs according to their acceptable ranges
7. WHEN metrics are saved THEN the system SHALL update the plant record and refresh displays
8. WHEN viewing metrics history THEN the user SHALL see charts showing trends over time
9. WHEN metrics update fails THEN the system SHALL display specific error messages for each field

### Requirement 3: Plant List Search and Filtering

**User Story:** As a plant grower, I want to search and filter my plant list, so that I can quickly find specific plants.

#### Acceptance Criteria

1. WHEN viewing the plant list THEN the user SHALL see a search bar at the top
2. WHEN typing in the search bar THEN the system SHALL filter plants by name and strain in real-time
3. WHEN the search query is cleared THEN the system SHALL show all plants again
4. WHEN no plants match the search THEN the system SHALL display "No plants found" message
5. WHEN search is active THEN the system SHALL highlight matching text in results

### Requirement 4: Harvest Tracking and Yield Management

**User Story:** As a cannabis grower, I want to track harvest information and yields, so that I can measure the success of my grows and plan future cultivation.

#### Acceptance Criteria

1. WHEN a plant reaches harvest stage THEN the user SHALL be able to record harvest date
2. WHEN recording harvest THEN the system SHALL provide input fields for:
   - Wet weight (grams/ounces with unit toggle)
   - Dry weight (grams/ounces with unit toggle)
   - Trim weight (grams/ounces with unit toggle)
   - Harvest notes (text field)
3. WHEN harvest is recorded THEN the system SHALL calculate yield per day and display efficiency metrics
4. WHEN viewing plant history THEN the user SHALL see complete grow cycle from seed to harvest
5. WHEN comparing plants THEN the system SHALL show yield comparisons and growth statistics

### Requirement 5: Care Reminders and Notifications

**User Story:** As a cannabis grower, I want to receive reminders for plant care tasks, so that I don't miss critical watering, feeding, or monitoring schedules.

#### Acceptance Criteria

1. WHEN setting up a plant THEN the user SHALL be able to configure care reminder schedules
2. WHEN a care task is due THEN the system SHALL send a local notification
3. WHEN viewing plant list THEN plants requiring attention SHALL be visually highlighted
4. WHEN a care task is completed THEN the user SHALL be able to mark it as done and reschedule
5. WHEN reminders are overdue THEN the system SHALL escalate notification priority

### Requirement 6: Integration Testing and Validation

**User Story:** As a developer, I want to ensure all plant management features work together seamlessly, so that users have a reliable experience.

#### Acceptance Criteria

1. WHEN a new plant is created THEN it SHALL appear in the plant list immediately
2. WHEN a plant is edited THEN changes SHALL be reflected in both list and detail views
3. WHEN a plant is deleted THEN it SHALL be removed from the list and detail view SHALL navigate back
4. WHEN photos are added/removed THEN the gallery SHALL update accordingly
5. WHEN health metrics are updated THEN the plant card SHALL show new values immediately
6. WHEN search/filter is used THEN performance SHALL remain smooth with large plant lists
7. WHEN harvest data is recorded THEN it SHALL be preserved and accessible in plant history
8. WHEN notifications are triggered THEN they SHALL appear reliably and be actionable