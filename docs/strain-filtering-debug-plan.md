# Strain Filtering Debug Plan for Next Chat

## IMPORTANT: Skip Navigation Context Errors
**DO NOT WASTE TIME** on navigation context warnings. These are development-only visual noise that have been suppressed via LogBox. The app functions normally.

## Current Situation
- ✅ Navigation errors are suppressed and handled
- ❌ **REAL ISSUE**: Users cannot filter strains by type (sativa/hybrid)
- ❌ Only shows indica strains regardless of selection

## Context to Provide Next Chat

### What to Say:
```
"We spent 7+ hours on navigation context errors but that was the wrong problem. 
The REAL issue is strain filtering doesn't work - users can't filter for sativa 
or hybrid strains. I've added debug logs to useInfiniteStrains and strains.tsx. 
Please focus ONLY on fixing the strain filtering logic and ignore any navigation 
context warnings."
```

### Key Files to Reference:
1. `app/(app)/(tabs)/strains.tsx` - Main strain screen
2. `lib/hooks/strains/useInfiniteStrains.ts` - Filtering logic
3. `screens/strains/StrainsView.tsx` - UI components
4. `docs/navigation-context-debugging-report.md` - What we already fixed

## Debug Investigation Plan

### Step 1: Test Current Behavior (5 min)
1. Open app → Strains tab
2. Note default shows "indica" strains
3. Click "sativa" chip → Observe if strains change
4. Click "hybrid" chip → Observe if strains change
5. Check console logs for debug output

### Step 2: Trace Data Flow (10 min)
1. **State Updates**: Verify `selectedStrainType` changes when clicking chips
2. **Query Parameters**: Check if `species` param reaches `useInfiniteStrains`
3. **API Calls**: Confirm `WeedDbService.filterByTypePaginated()` is called
4. **Response Data**: Verify API returns different strains for different types

### Step 3: Debug Points to Check (15 min)
1. **Query Key Changes**: Does React Query invalidate when species changes?
2. **API Response**: Are sativa/hybrid strains in the API database?
3. **Data Mapping**: Is `mapWeedDbStrainToAppStrain()` preserving type info?
4. **Filter Logic**: Is `speciesFilter = activeFilters?.species ?? species` working?

### Step 4: Likely Issues & Solutions (10 min)

#### Issue A: Query Not Invalidating
**Problem**: Query key doesn't change when species changes
**Fix**: Add debug logs to verify query key updates

#### Issue B: API Has No Sativa/Hybrid Data  
**Problem**: WeedDB API only has indica strains
**Fix**: Check API directly or use fallback data

#### Issue C: Type Mapping Issue
**Problem**: Strain types are mismatched between API and app
**Fix**: Check strain type field mapping in `mapWeedDbStrainToAppStrain`

#### Issue D: Cache Staleness
**Problem**: React Query cache not invalidating
**Fix**: Force refetch or reduce staleTime

## Debug Code Already Added

### In `useInfiniteStrains.ts`:
```js
console.log('[useInfiniteStrains] Filtering parameters:', {
  species,
  'activeFilters.species': activeFilters?.species,
  speciesFilter,
  debouncedSearch,
  queryKey: [...]
});

console.log(`[useInfiniteStrains] Using type filter: "${speciesFilter}"`);
console.log(`[useInfiniteStrains] Type filter response:`, {...});
```

### In `strains.tsx`:
```js
console.log(`[StrainsScreen] Changing strain type to: ${type}`);
console.log(`[StrainsScreen] Before change - selectedStrainType: ${selectedStrainType}`);
console.log(`[StrainsScreen] After setSelectedStrainType(${type}) called`);
```

## Quick Win: Manual Test
If filtering is broken, test the API directly:
```js
// Test in browser console or React DevTools
WeedDbService.filterByTypePaginated('sativa', 1, 20).then(console.log);
WeedDbService.filterByTypePaginated('hybrid', 1, 20).then(console.log);
```

### Quick Shell Script: Automated API Verification
To quickly check if the API returns data for all strain types, use this bash script (requires `curl` and `jq`):

```bash
#!/bin/bash
# Replace with your actual API endpoint URL
API_URL="https://your-api-url.com/strains/filterByTypePaginated"

for type in sativa indica hybrid; do
  echo "Testing strain type: $type"
  count=$(curl -s -G "$API_URL" \
    --data-urlencode "type=$type" \
    --data-urlencode "page=1" \
    --data-urlencode "limit=20" \
    | jq '.data | length')
  echo "Returned items: $count"
done
```

This script loops through each strain type, sends a request, and prints the number of returned items. Update `API_URL` as needed. This complements the manual JS test above.

## Expected Timeline
- **5 min**: Identify exact failure point using debug logs
- **10 min**: Fix the root cause 
- **5 min**: Test all strain types work
- **Total**: 20 minutes max (vs 7+ hours on wrong problem)

## Success Criteria
- [ ] Clicking "sativa" shows sativa strains
- [ ] Clicking "hybrid" shows hybrid strains  
- [ ] Clicking "indica" shows indica strains
- [ ] Strain counts differ between types
- [ ] No console errors in filtering logic

## If Debugging Gets Stuck
1. **Simplify**: Test `WeedDbService.filterByType()` directly
2. **Hardcode**: Temporarily hardcode strain type in query
3. **Mock Data**: Use local test data to isolate API vs UI issues

---

**Remember**: Focus 100% on strain filtering functionality. Ignore navigation warnings. 