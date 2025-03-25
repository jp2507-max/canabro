# CanaBro Theme System

This directory contains the theming system for the CanaBro app, providing a consistent visual language across the entire application.

## Structure

- `index.ts` - Default light theme with color tokens, typography, spacing, and component styles
- `dark.ts` - Dark theme variant, extends and modifies the light theme tokens for dark mode

## Usage

### Accessing the Theme

The theme can be accessed in any component using the `useTheme` hook:

```tsx
import { useTheme } from '../lib/contexts/ThemeContext';

function MyComponent() {
  const { theme, isDarkMode, toggleTheme } = useTheme();
  
  // Use theme values
  return (
    <View style={{ backgroundColor: theme.colors.neutral[50] }}>
      <Text style={{ color: theme.colors.primary[500] }}>
        Theme-aware component
      </Text>
    </View>
  );
}
```

### Themed Components

We provide themed components that automatically handle light/dark mode:

1. `ThemedView` - A View component that adapts to the current theme:

```tsx
<ThemedView 
  className="p-4 rounded-md" 
  lightClassName="bg-white" 
  darkClassName="bg-neutral-800"
>
  {/* Content here */}
</ThemedView>
```

2. `ThemedText` - A Text component that adapts to the current theme:

```tsx
<ThemedText 
  className="text-lg font-bold" 
  lightClassName="text-neutral-900" 
  darkClassName="text-white"
>
  Hello World
</ThemedText>
```

3. `ThemeToggle` - A button component to toggle between light and dark mode:

```tsx
<ThemeToggle showLabel={true} compact={false} />
```

## Theme Structure

Each theme contains the following sections:

1. **Colors**
   - `primary` - Green color palette (50-900)
   - `neutral` - Grayscale palette (50-900)
   - `status` - Success, warning, danger, info colors
   - `special` - App-specific functional colors

2. **Typography**
   - Font families, sizes, weights, and line heights

3. **Spacing**
   - Standardized spacing values for consistent layout

4. **Border Radius**
   - Consistent corner radius values

5. **Shadows**
   - Shadow styles for different elevation levels

6. **Component Styles**
   - Pre-defined styles for common components like buttons, inputs, and cards

## Best Practices

1. **Always use the theme system** instead of hardcoded color values
2. **Use ThemedView and ThemedText** components for most UI elements
3. **Leverage NativeWind classes** when possible, with theme-specific variants
4. **Test in both light and dark modes** to ensure good contrast and readability
5. **For custom components**, provide both light and dark variants
