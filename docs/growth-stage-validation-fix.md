# Growth Stage Validation Fix

## Problem
The Zod schemas for growth_stage validation in multiple forms (AddPlantForm.tsx, EditPlantForm.tsx, PhotoUploadModal.tsx) were hardcoding growth stage values instead of using the centralized `GROWTH_STAGES_ARRAY`. This created a synchronization risk where UI components could display different options than the validation schema would accept.

## Solution
Created a centralized validation utility that dynamically generates Zod enum validators from the `GROWTH_STAGES_ARRAY`, ensuring UI and validation stay synchronized.

### Files Created
- `lib/validation/growth-stage.ts` - Growth stage validation utilities
- `lib/validation/index.ts` - Centralized validation exports

### Files Modified
- `components/AddPlantForm.tsx` - Updated to use `createGrowthStageValidator()`
- `components/my-plants/EditPlantForm.tsx` - Updated to use `createGrowthStageValidator()`
- `components/plant-gallery/PhotoUploadModal.tsx` - Updated to use `createGrowthStageValidator()`

### Benefits
1. **Synchronization**: UI and validation automatically stay in sync
2. **DRY Principle**: Single source of truth for growth stage validation
3. **Maintainability**: Changes to growth stages only need to be made in `GROWTH_STAGES_ARRAY`
4. **Type Safety**: Full TypeScript support with proper type inference
5. **Flexibility**: Utility function allows custom error messages

### Usage
```typescript
// Basic usage
growth_stage: createGrowthStageValidator()

// With custom error message
growth_stage: createGrowthStageValidator(t('validation.growthStageRequired'))

// Helper function for runtime validation
if (isValidGrowthStage(userInput)) {
  // userInput is now typed as GrowthStage
}
```

### Future Considerations
The validation utilities are designed to be extended. Similar patterns can be applied to other enums like `CannabisType`, `LightCondition`, and `GrowMedium` for complete consistency across the application.
