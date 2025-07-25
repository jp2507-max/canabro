# RefreshControl CSS Variable Fix

## Problem
The `RefreshControl` component in React Native does not support CSS variable references like `"rgb(var(--color-primary-500))"`. This causes runtime errors or the colors to not display correctly.

## Solution
Created a color tokens file that maps CSS variables to actual hex color values that React Native components can use.

### Files Created/Modified

1. **Created: `lib/constants/colors.ts`**
   - Maps all CSS variables from `global.css` to actual hex color values
   - Provides helper functions for accessing colors
   - Exports `refreshControlColors` object with `tintColor` and `colors` properties

2. **Modified: `components/calendar/DateSelector.tsx`**
   - Added import for `refreshControlColors`
   - Replaced CSS variable references in RefreshControl with actual color values

3. **Modified: `screens/strains/StrainsView.tsx`**
   - Added import for `refreshControlColors`
   - Fixed RefreshControl `tintColor` prop

4. **Modified: `app/(app)/plant/diary/[id].tsx`**
   - Added import for `refreshControlColors`
   - Fixed RefreshControl `tintColor` and `colors` props

### Color Tokens Structure
```typescript
export const refreshControlColors = {
  tintColor: primaryColors[500], // "#16a34a" 
  colors: [primaryColors[500]],  // ["#16a34a"]
};
```

### Before vs After
```typescript
// Before (doesn't work in React Native)
<RefreshControl
  tintColor="rgb(var(--color-primary-500))"
  colors={['rgb(var(--color-primary-500))']}
/>

// After (works correctly)
<RefreshControl
  tintColor={refreshControlColors.tintColor}
  colors={refreshControlColors.colors}
/>
```

## Benefits
- ✅ React Native compatible color values
- ✅ Maintains consistency with design system 
- ✅ Type-safe color access
- ✅ Reusable across all components
- ✅ Easy to maintain and update

## Usage Guidelines
- Always import colors from `@/lib/constants/colors` for React Native components
- Continue using CSS variables for NativeWind classes  
- Use `refreshControlColors` for all RefreshControl components
- Use helper functions `getPrimaryColor()` and `getSemanticColor()` for other color needs
