# ESLint Cleanup Plan (Errors First)

Goal: Resolve all ESLint errors before warnings, iterating until error count is 0. Keep changes scoped, typed, and aligned with existing i18n architecture.

First, run ESLint with autofix to resolve trivial issues:
npx eslint . --ext .ts,.tsx --fix

Then re-run the linter and manually fix all remaining errors first, followed by warnings.

## Current Findings

- ESLint errors are mainly:
  1) i18n: i18next/no-literal-string on many screens/components
  2) TypeScript: @typescript-eslint/no-explicit-any in lib/services/* and utils
- Additional notice: .eslintignore is deprecated; ignores are already migrated to eslint.config.mjs.

## Project i18n Stack (Confirmed)

- Runtime: i18next + react-i18next in `lib/config/i18n.ts`
  - `defaultNS: 'common'`, `nsSeparator: '.'`
  - Resources loaded from `lib/locales/en.json` and `lib/locales/de.json`
- Consumption: `useTranslation` and helpers in `lib/hooks/useI18n.ts`
- Language switching/persistence: `lib/contexts/LanguageProvider.tsx`
- Existing namespaces: `common`, `navigation`, `plants`, `tasks`, `strains`, `templates`, etc.

## Strategy

1) Replace hardcoded user-visible strings with `t('namespace.key')` using `useTranslation`.
2) Add missing translation keys to `lib/locales/en.json` and mirror into `de.json` (real German if available or temporary English placeholder).
3) Fix `no-explicit-any` by introducing precise types, or safe `unknown` + narrowing, or minimal domain interfaces where appropriate.
4) Re-run ESLint after each batch; proceed to next files until zero errors.

## Namespaces and Key Organization

To keep translations organized and discoverable:

- `common`: generic UI strings (buttons, labels, messages)
- `navigation`: tab labels, headers
- `diagnosis`: diagnosis screens
- `strains`: strain list/views
- `catalog`: catalog detail views
- `plant`: plant detail/journal/diary
- `auth`: login/register flows
- `profile`: user profile/edit

Rule: Prefer a per-feature namespace. Put truly shared strings in `common`.

## Execution Order (Errors First)

Based on lint output, address in this order:

1. i18n errors in screens and major views:
   - `app/(app)/(tabs)/diagnosis.tsx`
   - `app/(app)/(tabs)/strains.tsx`
   - `app/(app)/catalog/[strain_id].tsx`
   - `app/(app)/plant/[id]/diary/create.tsx`
   - `app/(app)/plant/[id]/edit.tsx`
   - `app/(app)/plant/[id]/journal.tsx`
   - `app/(app)/plant/diary/[id].tsx`
   - `app/(app)/profile/edit/[id].tsx`
   - `app/(auth)/login.tsx`
   - `app/(auth)/register.tsx`
   - `screens/diagnosis/DiagnosisView.tsx`
   - `screens/strains/FavoriteStrainsScreen.tsx`
   - `screens/strains/StrainsView.tsx`

   For each file:
   - `import { useTranslation } from 'react-i18next'`
   - `const { t } = useTranslation('<featureNamespace>')`
   - Replace literal JSX text nodes with `t('key')`
   - Add keys to `en.json` under the chosen namespace; mirror in `de.json`

   Patterns:
   - Static text:
     - `<ThemedText>Diagnosis Results</ThemedText>` ➜ `<ThemedText>{t('title')}</ThemedText>`
   - Variables/params:
     - `<ThemedText>Day {dayIndex + 1}</ThemedText>` ➜ `<ThemedText>{t('day', { day: dayIndex + 1 })}</ThemedText>`
   - Plurals:
     - `+{safeItem.effects.length - 2} more` ➜ `t('rT, { count: safeItem.effects.length - 2 })` (alrea (already present in `common.moreTags`)dy present in `common.moreTags`)

2. `@typescript-eslint/no-explicit-any` in services/utils:
   - `lib/services/sync/*` (e.g., `metrics.ts`, `ensure-strain-exists.ts`, `record-validator.ts`, `utils.ts`, `data-sanitizer.ts`, `types.ts`)
   - `lib/services/user-reporting.service.ts` (several anys in mapping/transform)
   - `lib/utils/logger.ts` (logger args)
   - `lib/utils/production-utils.ts` (several anys)
   - Actions:
     - Replace `any` parameters with precise domain types where usage dictates
     - Use `unknown` + refinement where shape is dynamic
     - Introduce local interfaces/types for payloads or generic helpers
     - Avoid over-engineering; minimum changes to satisfy lints without behavior change

3. Re-run ESLint and iterate:
   - After each set of edits, run linter, confirm reduced error count
   - Continue until all errors are resolved
   - Only then consider tackling warnings (as requested, errors first)

## Example Key Additions

- diagnosis (in `en.json` and mirrored to `de.json`):
  - `{"diagnosis": { "analyzingTitle": "Our AI is examining your plant for diseases, pests, and nutrient deficiencies", "resultsTitle": "Diagnosis Results", "confidence": "Confidence:", "recommendations": "Recommendations:" }}`

- strains (for auth notices):
  - `{"strains": { "authRequiredTitle": "User not authenticated", "authRequiredSubtitle": "Please log in to view strains." }}`

- catalog:
  - `{"catalog": { "visitOfficialWebsite": "Visit Official Website", "parentGenetics": "Parent Genetics" }}`

- plant journal/diary:
  - `{"plant": { "errorMissingId": "Error: Plant ID is missing.", "invalidPlantId": "Error: Invalid Plant ID.", "errorLoadingData": "Error loading plant data.", "errorLoadingEntries": "Error loading entries.", "noJournalEntriesYet": "No journal entries yet", "startTrackingJourney": "Start tracking your plant's journey and watch it grow!", "addFirstEntry": "Add First Entry", "addEntryCta": "+ Add Entry", "newDiaryEntry": "New Diary Entry", "addEntry": "Add Entry" }}`

- auth:
  - `{"auth": { "brand": "CanaBro", "passwordStrength": "Password Strength", "registrationIncomplete": "Registration Incomplete", "profileSetupFailed": "Your account was created but profile setup failed. We'll help you complete the process.", "attemptOfMax": "Attempt {{current}} of {{maxRetries}}" }}`

- profile:
  - `{"profile": { "edit": { "saveChanges": "Save Changes", "editProfile": "Edit Profile" }}}`

Adjust wording as desired; maintain consistency with existing namespaces.

## Type Safety: Replace any with unknown + type guards

Prefer unknown for untrusted or loosely-typed inputs, then narrow with a type guard before accessing properties. This satisfies @typescript-eslint/no-explicit-any and preserves runtime safety.

Example:

```ts
function isRecordWithName(value: unknown): value is { name: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    typeof (value as Record<string, unknown>).name === 'string'
  );
}

export function greet(data: unknown): string {
  if (!isRecordWithName(data)) {
    return 'Hello, friend';
  }
  return `Hello, ${data.name}`;
}
```

Why this approach:
- The parameter is unknown, preventing unsafe property access.
- The type guard performs runtime checks and informs TypeScript that after the guard, data is { name: string }.
- Avoids any while maintaining strict, ergonomic type safety.
