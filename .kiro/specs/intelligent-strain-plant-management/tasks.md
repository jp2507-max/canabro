# Implementation Plan (Revised)

## Existing Components to Reuse:
- ✅ **StrainAutocomplete** (`components/StrainAutocomplete.tsx`) - Already implemented with intelligent search
- ✅ **TaskItem** (`components/calendar/TaskItem.tsx`) - Task display with animations and completion
- ✅ **TaskActions** (`components/calendar/TaskActions.tsx`) - Task action modal with haptics
- ✅ **PlantTask** (`lib/models/PlantTask.ts`) - Task model with priority, completion, and recurrence
- ✅ **TaskReminderEngine** (`lib/services/TaskReminderEngine.ts`) - Notification scheduling system
- ✅ **StrainCalendarIntegration** (`components/calendar/StrainCalendarIntegration.tsx`) - Basic strain-calendar integration
- ✅ **Plant Model** (`lib/models/Plant.ts`) - Already has strain relationship fields
- ✅ **Strain Search Service** (`lib/services/strain-search.service.ts`) - Intelligent strain search with caching

 - [x] 0. Database & type normalization (do first)
   - Add normalized fields/enums to **Supabase** + **WatermelonDB** (kept in lockstep) and mirror in **TypeScript** types:
     - `plant_type ('photoperiod'|'autoflower'|'unknown')`
     - `baseline_kind ('flip'|'germination')`, `baseline_date`
     - `environment ('indoor'|'outdoor'|'greenhouse')`, `hemisphere ('N'|'S')`
     - `predicted_flower_min_days`, `predicted_flower_max_days`
     - `predicted_harvest_start`, `predicted_harvest_end`, `schedule_confidence`
     - `yield_unit ('g_per_plant'|'g_per_m2')`, `yield_min`, `yield_max`, `yield_category ('low'|'medium'|'high'|'unknown')`
   - Acceptance:
     - Migrations are idempotent and do not break existing CRUD.
     - Range constraints enforced (`min ≤ max`, non-negative); basic indexes exist on `plant_type`, `environment`.
     - Predictions are system-owned and stored on `plants` (not user-editable).
     - WatermelonDB schema version bumped with matching columns; TS types updated.
   - Write a safe backfill for existing plants (leave new fields null where unknown; no breaking defaults).
   - _Requirements: 1.1, 1.2, 2.1, 6.1_

- [ ] 1. StrainProcessingService (parser + normalization)
  - Implement regex parsers:
    - Weeks range → **days** (e.g., `"7-9 weeks"` → **49–63 days**)
    - Days range in descriptions (e.g., `"50–60 days"`)
    - Yield per plant (`g/plant`) and per area (`g/m²`)
    - Seasonal windows mapping (e.g., `"End of September/October"` → `09-21…10-31`)
  - Intersection policy when both weeks & days exist; mark conflicts and reduce confidence.
  - Compute per-field `confidence` (structured ≥0.9, desc ~0.7, seasonal ~0.6).
  - Cache normalized profiles (24h TTL) and memoize parser by API id + version.
  - _Requirements: 1.1, 1.2, 1.3_

 - [x] 2. Data models
 - [ ] 2.1 StrainProfile (WatermelonDB) — Phase 2 (optional)
   - Schema for normalized data (cultivation, genetics, ranges/enums, confidence).
   - Index by `api_id`, `name`.
   - Note: can be deferred; current phase relies on existing `strains` table plus per-plant predicted fields.
   - _Requirements: 1.1, 6.4_

- [x] 2.2 Plant model extensions
  - Store only **references** and predictions; do **not** hard-code intervals here.
  - Fields: `strain_id` (reference), `plant_type`, `environment`, `hemisphere`, `baseline_kind/date`,
    `predicted_flower_min/max_days`, `predicted_harvest_start/end`, `schedule_confidence`,
    `yield_unit/min/max/category`.
  - _Requirements: 1.2, 1.5, 6.1_

- [ ] 2.3 PlantStrainData (per-plant adaptations) — Phase 2 (optional)
   - Customizations (overrides), learning data, notes.
   - Relationships: Plant ↔ StrainProfile ↔ PlantStrainData.
   - _Requirements: 1.4, 6.2, 6.4_

- [x] 3. StrainIntegrationService
- [x] 3.1 Core integration
  - Plant creation: bind normalized strain; set environment, hemisphere, baseline.
  - Detect photoperiod vs autoflower (fallback to user confirm if unknown).
  - **REUSE**: Extend existing `AddPlantForm.tsx` and `EditPlantForm.tsx` with strain integration
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 3.2 Cultivation profile generator
  - Parse **to days**, normalize yields/height, difficulty enums, indoor/outdoor flags.
  - **REUSE**: Build on existing strain API parsing in `strain-search.service.ts`
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 3.3 Baseline & locale
  - Photoperiod: `flip + flower_min/max_days`; Autoflower: `germination + auto_min/max_days`.
  - Default TZ **Europe/Berlin**; hemisphere detection with override.
  - **REUSE**: Extend existing date utilities in `lib/utils/date.ts`
  - _Requirements: 1.2, 1.4, 5.3_

- [x] 4. Strain-based task scheduling
- [x] 4.1 StrainTaskGenerator
  - Generate tasks from predicted windows; anchor tasks:
    - Flush (optional): `harvest.start - 10d`
    - Pre-harvest checks: `harvest.start - 7d`
    - Dark period (optional): `harvest.start - 2d`
  - Recurring tasks apply difficulty multipliers: Easy `0.8x`, Medium `1.0x`, Hard `1.2x`.
  - **REUSE**: Extend existing `PlantTaskIntegration.ts` and `TaskAutomationService.ts`
  - _Requirements: 1.1, 1.2, 3.1_

- [x] 4.2 Idempotency & user edits
  - Extend PlantTask with `source ('auto'|'manual')`, `locked (bool)`, `template_version`.
  - Regeneration updates only `source='auto' && locked=false`.
  - Triggers: baseline/env/strain change or template version bump.
  - **REUSE**: Build on existing PlantTask model and completion system
  - _Requirements: 1.5, 5.3_

- [x] 4.3 Integrate with TaskReminderEngine
  - Strain metadata on tasks; prioritization aware of windows & difficulty.
  - **REUSE**: Extend existing `TaskReminderEngine.ts` with strain-specific logic
  - _Requirements: 1.3, 1.4, 1.5_

- [x] 5. Predictions & comparison
- [x] 5.1 Harvest windows
  - Compute window (not single date) from baseline + days or seasonal mapping.
  - Confidence shown; outdoor seasonal uses hemisphere/year mapping.
  - **REUSE**: Extend existing `FloweringPredictionCard.tsx` with enhanced predictions
  - _Requirements: 1.4, 2.1, 2.2_

- [x] 5.2 Yield expectations
  - Normalize per-unit; aggregate only when units & environments match.
  - Track actual vs predicted at harvest.
  - **REUSE**: Build on existing plant metrics tracking system
  - _Requirements: 2.1, 2.2, 6.1_

- [x] 5.3 Compare strains
  - Comparative timelines, conflict flags (env incompatibilities).
  - Simple optimization suggestions (staggered planting).
  - **REUSE**: Extend existing `StrainScheduleComparison.tsx` component
  - _Requirements: 5.1, 5.2, 5.3_

- [ ] 6. StrainAutocomplete + preview
- [ ] 6.1 Preview chips
  - Show flowering (days), difficulty, yield, harvest window; cached.
  - **REUSE**: Enhance existing `StrainAutocomplete.tsx` with cultivation preview
  - _Requirements: 1.1, 2.1, 4.1_

- [ ] 6.2 Confirmation dialog
  - Preview schedule; set/confirm baseline & environment; show confidence badges.
  - **REUSE**: Create modal similar to existing `TaskActions.tsx` pattern
  - _Requirements: 1.2, 2.3, 4.2_

- [ ] 7. Plant creation form
- [ ] 7.1 Integrate strain data
  - Auto-populate fields; validate; ask for missing baseline/conflicts.
  - **REUSE**: Enhance existing `AddPlantForm.tsx` with strain integration
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 7.2 Customization options
  - Environmental overrides, experience level; preview updates live.
  - **REUSE**: Build on existing form patterns in `EditPlantForm.tsx`
  - _Requirements: 1.5, 2.3, 3.1_

- [ ] 8. Guidance system
- [ ] 8.1 Difficulty-based guidance
  - Beginner copy for Easy; advanced monitoring & warnings for Hard.
  - **REUSE**: Extend existing task description system with strain-specific content
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 8.2 Genetics-based tips
  - Indica/sativa/hybrid growth patterns; lineage display; env prefs.
  - **REUSE**: Build on existing strain display components
  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 9. Learning & feedback
- [ ] 9.1 Actual vs predicted
  - Record `actual_flower_days`, `actual_yield`, quality; compute error metrics.
  - **REUSE**: Extend existing plant metrics and harvest tracking
  - _Requirements: 6.1, 6.2, 6.3_

- [ ] 9.2 Recommendations
  - Success patterns per strain; suggest similar strains; compatibility scoring.
  - **REUSE**: Build on existing strain search and filtering system
  - _Requirements: 6.4, 6.5_

- [ ] 10. Calendar & dashboards
- [ ] 10.1 Calendar enhancements
  - Show strain milestones/windows; compare view; task grouping by strain.
  - **REUSE**: Extend existing `StrainCalendarIntegration.tsx` and calendar views
  - _Requirements: 1.4, 5.1, 5.2_

- [ ] 10.2 Analytics dashboard
  - Prediction accuracy, completion by difficulty, per-strain performance.
  - **REUSE**: Build on existing task analytics and plant metrics system
  - _Requirements: 6.1, 6.2, 6.3_

- [ ] 11. Error handling & fallbacks
- [ ] 11.1 Validation + generic profiles
  - Strict validation; graceful fallback to generic templates; conflict banners.
  - **REUSE**: Build on existing error handling patterns in strain search service
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 11.2 Partial data mode
  - Manual inputs when parsing fails; allow manual scheduling as last resort.
  - **REUSE**: Extend existing form validation and error states
  - _Requirements: 1.4, 1.5_

- [ ] 12. Testing
- [ ] 12.1 Unit tests
  - Parser fixtures (weeks/days/seasonal/yield); intersection/conflict;
    photoperiod/auto baseline calculators; task generator.
  - **REUSE**: Build on existing test patterns in strain and task services
  - _Requirements: All_

- [ ] 12.2 Integration/E2E
  - Strain selection → plant creation → schedule; calendar integration;
    learning loop writeback; offline/online sync.
  - **REUSE**: Extend existing integration tests for plant and task workflows
  - _Requirements: All_

- [ ] 13. Performance & caching
  - Debounced indexed search; local index for ~2k strains; on-demand details.
  - ETag/version-aware refresh; background sync; offline-first.
  - **REUSE**: Build on existing caching in strain search service
  - _Requirements: non-functional_

- [ ] 14. Telemetry & feature flags
  - Log parser version, template version, confidence; Sentry for failures.
  - Feature flags for dark period/flush tasks, learning loop, advanced tips.
  - **REUSE**: Extend existing logging and error tracking systems
  - _Requirements: non-functional_