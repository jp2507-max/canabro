# 🎨 CanaBro NativeWind Theming System

## 📅 Last Updated: May 31, 2025

This document outlines our **NativeWind v4 compliant** theming system, optimized for performance and following React Native best practices.

---

## 🎯 **Architecture Overview**

### **Single Source of Truth**
- ✅ **CSS Variables**: Defined in `global.css` for light/dark modes
- ✅ **TailwindCSS Config**: Maps CSS variables to utility classes
- ✅ **Automatic Dark Mode**: Uses `prefers-color-scheme: dark` media query
- ✅ **Performance Optimized**: Core plugins disabled for better performance

### **No Duplicate Theme Objects**
- ❌ ~~JavaScript theme objects~~ (removed)
- ❌ ~~Manual theme switching~~ (simplified)
- ❌ ~~Dual color systems~~ (consolidated)

---

## 🚀 **Usage Patterns**

### **Basic NativeWind Classes**
```tsx
// Automatic dark mode support
<View className="bg-white dark:bg-neutral-800">
  <Text className="text-neutral-900 dark:text-white">
    Automatically themed text
  </Text>
</View>
```

### **Themed Components**
```tsx
// ThemedView with predefined variants
<ThemedView variant="card" className="p-4">
  <ThemedText variant="heading">
    Card Content
  </ThemedText>
</ThemedView>

// ThemedText with semantic variants
<ThemedText variant="muted">
  Secondary text that adapts to theme
</ThemedText>
```

### **Theme Toggle**
```tsx
// Simple theme toggle with NativeWind classes
<ThemeToggle showLabel={true} compact={false} />
```

---

## 🎨 **Color System**

### **Available Colors**
- **Primary**: `primary-50` through `primary-900` (greens)
- **Neutral**: `neutral-50` through `neutral-900` (warm beige/brown tones)
- **Status**: `status-success`, `status-warning`, `status-danger`, `status-info`
- **Special**: `special-watering`, `special-feeding`, `special-harvesting`

### **Usage Examples**
```tsx
// Primary colors
<View className="bg-primary-500 dark:bg-primary-600">
  <Text className="text-white">Primary button</Text>
</View>

// Neutral colors (automatically themed)
<View className="bg-neutral-100 dark:bg-neutral-800">
  <Text className="text-neutral-900 dark:text-neutral-100">
    Content text
  </Text>
</View>

// Status colors (same in both themes)
<Text className="text-status-success">Success message</Text>
```

---

## 📱 **Safe Area Support**

### **Built-in Safe Area Utilities**
- Use safe area utilities for device-specific layouts
- Automatic handling of notches, status bars, and home indicators
- Cross-platform compatibility for iOS and Android

### **Safe Area Examples**
```tsx
// Basic safe area padding
<View className="pt-safe px-4">
  <Text>Content respects safe areas</Text>
</View>

// Full screen height minus safe areas
<View className="h-screen-safe">
  <Text>Full height minus safe areas</Text>
</View>

// Combined utilities with fallbacks
<View className="pt-safe-or-4 pb-safe-offset-[8px]">
  <Text>Safe area with minimum padding and offset</Text>
</View>
```

### **Available Safe Area Classes**
- **Padding**: `p-safe`, `pt-safe`, `pb-safe`, `px-safe`, `py-safe`, `pl-safe`, `pr-safe`
- **Margin**: `m-safe`, `mt-safe`, `mb-safe`, `mx-safe`, `my-safe`, `ml-safe`, `mr-safe`
- **Screen Height**: `h-screen-safe`, `min-h-screen-safe`
- **With Fallbacks**: `*-safe-or-[n]` (uses max of safe area or specified value)
- **With Offsets**: `*-safe-offset-[n]` (adds offset to safe area value)

---

## 🎯 **Platform-Specific Theming**

### **Platform-Specific Colors**
```tsx
// In tailwind.config.js
const { platformSelect, platformColor } = require("nativewind/theme");

module.exports = {
  theme: {
    extend: {
      colors: {
        // Platform-specific brand colors
        brand: platformSelect({
          ios: platformColor('label'),
          android: platformColor('?android:attr/textColor'),
          default: "var(--brand-color, #10b981)"
        }),
        // Error colors that match platform conventions
        error: platformSelect({
          ios: platformColor('systemRed'),
          android: platformColor('?android:attr/colorError'),
          default: "#ef4444"
        })
      }
    }
  }
}
```

### **Pixel Ratio Responsive Design**
```tsx
// Responsive sizing based on device pixel ratio
const { pixelRatioSelect, hairlineWidth } = require("nativewind/theme");

module.exports = {
  theme: {
    extend: {
      borderWidth: {
        thin: pixelRatioSelect({
          2: 1,
          3: 1.5,
          default: hairlineWidth(),
        }),
      }
    }
  }
}
```

---

## ⚡ **Performance Features**

### **NativeWind v4 Optimizations**
- 🎯 **Disabled Core Plugins**: `borderOpacity`, `textOpacity`, `backgroundOpacity`
- 🎯 **CSS Variables**: Better performance than JavaScript theme objects
- 🎯 **Automatic Theme Detection**: No JavaScript state management overhead
- 🎯 **Tree Shaking**: Unused styles are eliminated

### **Animation Support**
```tsx
// Built-in animations
<View className="animate-fade-in">
  <Text>Fading in content</Text>
</View>

// Transition classes
<View className="transition-colors bg-white dark:bg-neutral-800">
  <Text>Smooth color transitions</Text>
</View>
```

---

## 🎨 **Advanced CSS Variable Patterns**

### **Dynamic Theming with vars()**
```tsx
// Advanced theming with HSL color variables
import { vars } from 'nativewind'

const userTheme = vars({
  '--primary-hue': '210',
  '--primary-saturation': '100%',
  '--primary-lightness': '50%',
});

<View style={userTheme}>
  <Text className="text-[hsl(var(--primary-hue),var(--primary-saturation),var(--primary-lightness))]">
    Dynamic HSL-based theming
  </Text>
</View>
```

### **Component-Specific Theme Overrides**
```tsx
// Override theme variables for specific components
const cardTheme = vars({
  '--card-bg': '#f8fafc',
  '--card-border': '#e2e8f0',
  '--card-text': '#1e293b',
});

<View style={cardTheme} className="bg-[var(--card-bg)] border-[var(--card-border)]">
  <Text className="text-[var(--card-text)]">Card with custom theme</Text>
</View>
```

### **Global CSS Variable Definitions**
```css
/* In global.css */
@layer base {
  @media (prefers-color-scheme: light) {
    :root {
      --background: 0 0% 100%;
      --foreground: 0 0% 0%;
      --primary: 142 76% 36%;
      --primary-foreground: 0 0% 100%;
    }
  }
  
  @media (prefers-color-scheme: dark) {
    :root {
      --background: 0 0% 0%;
      --foreground: 0 0% 100%;
      --primary: 142 69% 58%;
      --primary-foreground: 0 0% 0%;
    }
  }
}
```

### **Theme Strategy Choice**

#### **Hybrid Theme System (Current Implementation)**
- Uses `darkMode: 'class'` in `tailwind.config.js` for manual toggle support
- CSS variables respond to both `.dark` class AND `@media (prefers-color-scheme: dark)`
- Supports both manual theme toggling AND automatic system preference detection
- Best of both worlds: user control + automatic fallback

#### **Manual Theme Toggle**
```tsx
// Manual theme toggle with hybrid support
import { useColorScheme } from 'nativewind';

function ThemeToggle() {
  const { colorScheme, setColorScheme } = useColorScheme();
  
  return (
    <Pressable onPress={() => setColorScheme(colorScheme === 'dark' ? 'light' : 'dark')}>
      <Text>Toggle Theme</Text>
    </Pressable>
  );
}
```

#### **System Preference Only (Alternative)**
```tsx
// If you only want system preference detection:
// 1. Remove `darkMode: 'class'` from tailwind.config.js
// 2. Remove `.dark,` from global.css selectors
// 3. Keep only `@media (prefers-color-scheme: dark)` selectors
```

---

## 🔧 **Component Variants**

### **ThemedView Variants**
- `default`: Basic themed background
- `card`: Card-style with border and rounded corners
- `surface`: Surface-level background
- `elevated`: Elevated card with shadow

### **ThemedText Variants**
- `default`: Standard text color
- `muted`: Muted/secondary text color
- `heading`: Bold heading text
- `caption`: Small caption text

---

## 📱 **Migration from Old System**

### **Before (Anti-pattern)**
```tsx
// ❌ Manual theme switching
const { theme, isDarkMode } = useTheme();
<View style={{ backgroundColor: theme.colors.neutral[100] }}>
  <Text style={{ color: theme.colors.neutral[900] }}>
    Manual theming
  </Text>
</View>
```

### **After (NativeWind Best Practice)**
```tsx
// ✅ Automatic theme support
<View className="bg-neutral-100 dark:bg-neutral-800">
  <Text className="text-neutral-900 dark:text-neutral-100">
    Automatic theming
  </Text>
</View>
```

---

## 🎯 **Best Practices**

### **Do ✅**
- Use `dark:` prefixes for dark mode styles
- Leverage `ThemedView` and `ThemedText` components
- Use semantic color names (`neutral-900` instead of hardcoded colors)
- Test in both light and dark modes (manual toggle + system preference)
- Use `transition-colors` for smooth theme switching
- Ensure CSS selectors match Tailwind's `darkMode` configuration

### **Don't ❌**
- Create custom theme objects (use CSS variables)
- Use hardcoded color values
- Enable unnecessary TailwindCSS core plugins
- Mix percentage and pixel units in calc() (NativeWind limitation)
- Mismatch `darkMode` config with CSS selectors (causes broken manual toggle)

---

*This system follows NativeWind v4 best practices and is optimized for React Native performance.*