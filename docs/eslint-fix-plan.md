# ESLint Cleanup Plan (Errors First)

Goal: Resolve all ESLint errors before warnings, iterating until error count is 0. Keep changes scoped, typed, and aligned with existing i18n architecture.
first run npx run lint and then fix all errors 
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

## TypeSeSiprpAnyy→ S→ff Typee Types

-b`l/b/uti/r/loggsr.ts`:: caageefunc ifnugrgn turosmfrom ` `y`ny` `unk`own`ooopproperly eypedx emerpcnvgsfudsci; herfarm dypegud#befoot trgfyg/ung
`libevceur-Lipoftg g.aa`vge`fla`: rollow oeDpi l-xcwi keys exist in `en.json` (and in `de.json` mirrored or translated).
  Uxlicimpp#(psoSubaswh r`nhc `(repry)`.-Wherehid-prty lbreueercdadefmlra.-`b/srvc/y/*`tulclpouduncnu/uspcutogy-Wh`zd`iiuslad(.g.d-dbric)preferprt voi `ay`##Ns-ESLcofladyh``(oi).`.nr` dpatin wargsinfoa;rving`.sltr`isopio.
-Kplasccsbf cradrs;srTmex usagrmais gdxcpforotourc-Fllwxitdnvn(TpSrpttitRaNtv/Ex,NvWid ylg,e.## Don Dfnion-`nxi-t.s--awg=0`ror0ror.Aprviuly fiscomlar.Newkeyx`.jo`n `jo` mrroror ae)Nw`y`nrodud;vou`y`occurrdsd.##Nex(cee=0)
-Optoy dresswags:-`n-csle`develomece allwed pecnf;cosdrmizgwhflaggd.-`-usd-vs`tesspcmaprconfgobeiiupfusefu.-Unnc/cchasy warnngcandldfsrd.