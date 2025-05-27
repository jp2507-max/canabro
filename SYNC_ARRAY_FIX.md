# Sync Array Field Fix

## Issue
When adding plants, the strain synchronization was failing with a PostgreSQL error:
```
malformed array literal: "[]"
```

This was happening because array fields like `effects` and `flavors` were being stored as JSON strings in WatermelonDB (e.g., `"[]"` or `"[\"effect1\",\"effect2\"]"`) but were being sent directly to Supabase, which expects actual arrays for JSONB fields.

## Root Cause
In the sync process (`lib/services/sync/ensure-strain-exists.ts`), the strain data coming from WatermelonDB had array fields stored as JSON strings, but these were being passed directly to Supabase without parsing. Supabase expected actual arrays for fields like:
- `effects: string[]`
- `flavors: string[]`
- `terpenes: string[]`
- `parents: string[]`
- etc.

## Solution
Modified the `createSafeStrainPayload` function in `lib/services/sync/ensure-strain-exists.ts` to:

1. **Added JSON string parsing**: Created a helper function `parseJsonStringToArray` that safely converts JSON string arrays back to actual arrays.

2. **Identified array fields**: Created a list of fields that need special JSON parsing:
   ```typescript
   const arrayFields = ['effects', 'flavors', 'terpenes', 'parents', 'origin', 'medical_uses', 'negative_effects', 'medicalUses', 'negativeEffects'];
   ```

3. **Special handling**: Added special processing for these array fields to parse them before sending to Supabase:
   ```typescript
   if (arrayFields.includes(dbField)) {
     const rawValue = (strain as any)[dbField];
     const parsedArray = parseJsonStringToArray(rawValue);
     if (parsedArray !== null) {
       safePayload[dbField] = parsedArray;
     }
     continue;
   }
   ```

## Files Modified
- `lib/services/sync/ensure-strain-exists.ts`: Fixed array field handling in strain sync

## Testing
After this fix, plants should be able to sync properly to Supabase without the array literal errors. The strain data will have properly formatted arrays for JSONB fields in Supabase.

## Additional Notes
- The WatermelonDB storage format (JSON strings) remains unchanged as it's the correct approach for local SQLite storage
- Only the sync layer was modified to handle the conversion between storage formats
- The fix handles both empty arrays (`"[]"`) and populated arrays (`"[\"item1\",\"item2\"]"`) 