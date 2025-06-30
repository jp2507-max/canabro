# React Native Keyboard Controller Implementation Guide

This guide is based on the comprehensive keyboard handling examples from [betomoedano/keyboard-guide](https://github.com/betomoedano/keyboard-guide) repository. It provides advanced keyboard management solutions for React Native using the `react-native-keyboard-controller` library.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Installation & Setup](#installation--setup)
3. [Basic Keyboard Handling](#basic-keyboard-handling)
4. [Advanced Keyboard Animations](#advanced-keyboard-animations)
5. [Keyboard Toolbar Implementation](#keyboard-toolbar-implementation)
6. [View Avoiding Patterns](#view-avoiding-patterns)
7. [Custom Hooks](#custom-hooks)
8. [Best Practices](#best-practices)
9. [Integration Steps for CanaBro](#integration-steps-for-canabro)

## 🎯 Overview

The `react-native-keyboard-controller` library provides advanced keyboard handling capabilities that go beyond React Native's built-in keyboard management. Key features include:

- **Smooth Animations**: Synchronized with keyboard transitions
- **Advanced Toolbar**: Customizable keyboard toolbar with navigation
- **View Avoiding**: Intelligent content repositioning
- **Performance**: Worklet-based animations for 60fps performance
- **Cross-Platform**: Consistent behavior on iOS and Android

## 🚀 Installation & Setup

### Dependencies Required

```json
{
  "react-native-keyboard-controller": "^1.17.1",
  "react-native-reanimated": "~3.17.4",
  "react-native-gesture-handler": "~2.24.0"
}
```

### Installation Commands

```bash
# Install the keyboard controller
npm install react-native-keyboard-controller

# For Expo managed workflow
npx expo install react-native-keyboard-controller

# iOS specific (if using bare React Native)
cd ios && pod install
```

### Root Layout Setup

```tsx
// app/_layout.tsx
import { KeyboardProvider } from "react-native-keyboard-controller";

export default function RootLayout() {
  return (
    <KeyboardProvider>
      {/* Your app content */}
    </KeyboardProvider>
  );
}
```

## 📱 Basic Keyboard Handling

### Traditional React Native Approach

```tsx
// Basic implementation with standard RN components
import {
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TextInput,
  FlatList,
} from "react-native";

export default function BasicKeyboardScreen() {
  const textInputRef = useRef<TextInput>(null);

  // Listen to keyboard events
  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      "keyboardDidShow",
      handleKeyboardShow
    );
    const hideSubscription = Keyboard.addListener(
      "keyboardDidHide", 
      handleKeyboardHide
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const handleKeyboardShow = (event) => {
    console.log("keyboard show", event.duration);
  };

  const handleKeyboardHide = (event) => {
    console.log("keyboard hide", event.duration);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <FlatList
          data={messages}
          renderItem={({ item }) => <MessageItem message={item} />}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="always"
        />
        
        {/* Manual keyboard controls */}
        <View style={styles.controls}>
          <Pressable onPress={() => Keyboard.dismiss()}>
            <Ionicons name="chevron-down" size={24} />
          </Pressable>
          <Pressable onPress={() => textInputRef.current?.focus()}>
            <Ionicons name="chevron-up" size={24} />
          </Pressable>
        </View>
        
        <TextInput
          ref={textInputRef}
          placeholder="Type a message..."
          style={styles.textInput}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
```

## ⚡ Advanced Keyboard Animations

### Smooth Keyboard-Synchronized Animations

```tsx
// Advanced implementation with react-native-keyboard-controller
import { useKeyboardHandler } from "react-native-keyboard-controller";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

const PADDING_BOTTOM = 20;

const useGradualAnimation = () => {
  const height = useSharedValue(PADDING_BOTTOM);

  useKeyboardHandler(
    {
      onMove: (e) => {
        "worklet";
        // Animate in sync with keyboard movement
        height.value = Math.max(e.height, PADDING_BOTTOM);
      },
      onEnd: (e) => {
        "worklet";
        // Final position when keyboard animation ends
        height.value = e.height;
      },
    },
    []
  );
  
  return { height };
};

export default function AdvancedKeyboardScreen() {
  const { height } = useGradualAnimation();

  const fakeView = useAnimatedStyle(() => {
    return {
      height: Math.abs(height.value),
      marginBottom: height.value > 0 ? 0 : PADDING_BOTTOM,
    };
  }, []);

  return (
    <View style={styles.container}>
      <FlatList
        data={messages}
        renderItem={({ item }) => <MessageItem message={item} />}
        keyboardDismissMode="on-drag"
        inverted // For chat-like behavior
      />
      
      <TextInput 
        placeholder="Type a message..." 
        style={styles.textInput} 
      />
      
      {/* Animated spacer that follows keyboard */}
      <Animated.View style={fakeView} />
    </View>
  );
}
```

## 🛠️ Keyboard Toolbar Implementation

### Advanced Toolbar with Navigation

```tsx
import {
  KeyboardAwareScrollView,
  KeyboardToolbar,
} from "react-native-keyboard-controller";

export default function AdvancedToolbarScreen() {
  return (
    <>
      <KeyboardAwareScrollView
        bottomOffset={62} // Height of toolbar
        contentContainerStyle={styles.container}
        style={{ flex: 1, marginBottom: 62 }}
      >
        {/* Multiple input fields */}
        <View style={{ flexDirection: "row", gap: 16 }}>
          <TextInput placeholder="Field 1" style={styles.textInput} />
          <TextInput placeholder="Field 2" style={styles.textInput} />
        </View>
        
        <TextInput placeholder="Field 3" style={styles.textInput} />
        
        {/* More input fields... */}
        {Array.from({ length: 10 }, (_, i) => (
          <TextInput 
            key={i}
            placeholder={`Field ${i + 4}`} 
            style={styles.textInput} 
          />
        ))}
      </KeyboardAwareScrollView>
      
      {/* Floating keyboard toolbar */}
      <KeyboardToolbar />
    </>
  );
}
```

### Custom Toolbar with Content

```tsx
export default function CustomToolbarScreen() {
  const inputRef = useRef<TextInput>(null);
  
  const toggleKeyboard = () => {
    if (Keyboard.isVisible()) {
      Keyboard.dismiss();
    } else {
      inputRef.current?.focus();
    }
  };

  return (
    <>
      <View style={{ flex: 1, padding: 16 }}>
        <TextInput
          ref={inputRef}
          placeholder="Multi-line input"
          multiline
          numberOfLines={8}
          maxLength={280}
          style={styles.multilineInput}
          textAlignVertical="top"
        />

        {/* Footer content */}
        <View style={styles.footer}>
          <FooterItem name="Item 1" />
          <FooterItem name="Item 2" />
          <FooterItem name="Item 3" />
        </View>

        {/* Animated keyboard spacer */}
        <Animated.View style={keyboardPadding} />
      </View>

      {/* Custom toolbar with content */}
      <KeyboardToolbar
        content={<Text>Custom toolbar content</Text>}
        showArrows={false}
        insets={{ left: 16, right: 0 }}
        doneText="Close keyboard"
      />
    </>
  );
}
```

## 🎯 View Avoiding Patterns

### Intelligent Content Repositioning

```tsx
// Custom hook for gradual keyboard animation
export const useGradualAnimation = () => {
  const OFFSET = 42;
  const totalOffset = OFFSET;
  const height = useSharedValue(totalOffset);

  useKeyboardHandler(
    {
      onMove: (e) => {
        "worklet";
        height.value = e.height > 0 
          ? Math.max(e.height + OFFSET, totalOffset) 
          : totalOffset;
      },
    },
    []
  );
  
  return { height };
};

// Usage in component
export default function ViewAvoidingScreen() {
  const { height } = useGradualAnimation();
  
  const keyboardPadding = useAnimatedStyle(() => {
    return {
      height: height.value,
    };
  }, []);

  return (
    <View style={{ flex: 1 }}>
      {/* Your content */}
      <TextInput style={styles.input} />
      
      {/* Animated spacer */}
      <Animated.View style={keyboardPadding} />
    </View>
  );
}
```

## 🔧 Custom Hooks

### Enhanced Keyboard Hook

```tsx
// lib/hooks/useEnhancedKeyboard.ts
import { useKeyboardHandler } from "react-native-keyboard-controller";
import { useSharedValue } from "react-native-reanimated";
import { Keyboard } from "react-native";

interface UseEnhancedKeyboardOptions {
  offset?: number;
  animateOnMove?: boolean;
}

export const useEnhancedKeyboard = (options: UseEnhancedKeyboardOptions = {}) => {
  const { offset = 20, animateOnMove = true } = options;
  
  const height = useSharedValue(offset);
  const isVisible = useSharedValue(false);

  useKeyboardHandler(
    {
      onStart: (e) => {
        "worklet";
        isVisible.value = e.height > 0;
      },
      onMove: (e) => {
        "worklet";
        if (animateOnMove) {
          height.value = e.height > 0 
            ? Math.max(e.height + offset, offset) 
            : offset;
        }
      },
      onEnd: (e) => {
        "worklet";
        height.value = e.height > 0 
          ? Math.max(e.height + offset, offset) 
          : offset;
        isVisible.value = e.height > 0;
      },
    },
    [offset, animateOnMove]
  );

  const dismiss = () => {
    Keyboard.dismiss();
  };

  const isKeyboardVisible = () => {
    return Keyboard.isVisible();
  };

  return {
    height,
    isVisible,
    dismiss,
    isKeyboardVisible,
  };
};
```

### Keyboard State Hook

```tsx
// lib/hooks/useKeyboardState.ts
import { useState, useEffect } from 'react';
import { Keyboard, KeyboardEvent } from 'react-native';

export const useKeyboardState = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [keyboardDuration, setKeyboardDuration] = useState(0);

  useEffect(() => {
    const showListener = Keyboard.addListener('keyboardDidShow', (e: KeyboardEvent) => {
      setIsVisible(true);
      setKeyboardHeight(e.endCoordinates.height);
      setKeyboardDuration(e.duration || 0);
    });

    const hideListener = Keyboard.addListener('keyboardDidHide', (e: KeyboardEvent) => {
      setIsVisible(false);
      setKeyboardHeight(0);
      setKeyboardDuration(e.duration || 0);
    });

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

  return {
    isVisible,
    keyboardHeight,
    keyboardDuration,
  };
};
```

## 🎨 Component Examples

### Enhanced Text Input Component

```tsx
// components/ui/KeyboardAwareTextInput.tsx
import React, { forwardRef } from 'react';
import {
  TextInput,
  TextInputProps,
  View,
  Text,
  StyleSheet,
} from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useEnhancedKeyboard } from '@/lib/hooks/useEnhancedKeyboard';

interface KeyboardAwareTextInputProps extends TextInputProps {
  label?: string;
  error?: string;
  showCharacterCount?: boolean;
  maxLength?: number;
}

export const KeyboardAwareTextInput = forwardRef<TextInput, KeyboardAwareTextInputProps>(
  ({ label, error, showCharacterCount, maxLength, style, ...props }, ref) => {
    const { height } = useEnhancedKeyboard({ offset: 10 });
    
    const animatedStyle = useAnimatedStyle(() => ({
      marginBottom: height.value,
    }));

    return (
      <Animated.View style={[styles.container, animatedStyle]}>
        {label && <Text style={styles.label}>{label}</Text>}
        
        <TextInput
          ref={ref}
          style={[styles.input, style, error && styles.inputError]}
          maxLength={maxLength}
          {...props}
        />
        
        <View style={styles.footer}>
          {error && <Text style={styles.error}>{error}</Text>}
          {showCharacterCount && maxLength && (
            <Text style={styles.characterCount}>
              {(props.value?.length || 0)}/{maxLength}
            </Text>
          )}
        </View>
      </Animated.View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#1f2937',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  error: {
    color: '#ef4444',
    fontSize: 14,
  },
  characterCount: {
    color: '#6b7280',
    fontSize: 14,
  },
});
```

### Chat Input Component

```tsx
// components/ui/ChatInput.tsx
import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useEnhancedKeyboard } from '@/lib/hooks/useEnhancedKeyboard';
import { Ionicons } from '@expo/vector-icons';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  placeholder?: string;
  maxLength?: number;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  placeholder = "Type a message...",
  maxLength = 1000,
}) => {
  const [message, setMessage] = useState('');
  const textInputRef = useRef<TextInput>(null);
  const { height, dismiss } = useEnhancedKeyboard({ offset: 20 });

  const animatedStyle = useAnimatedStyle(() => ({
    paddingBottom: height.value,
  }));

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
      textInputRef.current?.blur();
    }
  };

  const canSend = message.trim().length > 0;

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <View style={styles.inputContainer}>
        <TextInput
          ref={textInputRef}
          style={styles.textInput}
          value={message}
          onChangeText={setMessage}
          placeholder={placeholder}
          multiline
          maxLength={maxLength}
          textAlignVertical="top"
        />
        
        <View style={styles.actions}>
          <Pressable 
            style={styles.actionButton}
            onPress={dismiss}
          >
            <Ionicons name="chevron-down" size={20} color="#6b7280" />
          </Pressable>
          
          <Pressable
            style={[
              styles.sendButton,
              canSend ? styles.sendButtonActive : styles.sendButtonInactive,
            ]}
            onPress={handleSend}
            disabled={!canSend}
          >
            <Ionicons 
              name="send" 
              size={16} 
              color={canSend ? "#fff" : "#9ca3af"} 
            />
          </Pressable>
        </View>
      </View>
      
      {message.length > maxLength * 0.8 && (
        <Text style={styles.characterWarning}>
          {message.length}/{maxLength}
        </Text>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f9fafb',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    gap: 12,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 100,
    backgroundColor: '#fff',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonActive: {
    backgroundColor: '#3b82f6',
  },
  sendButtonInactive: {
    backgroundColor: '#f3f4f6',
  },
  characterWarning: {
    textAlign: 'right',
    paddingHorizontal: 16,
    paddingBottom: 8,
    color: '#f59e0b',
    fontSize: 12,
  },
});
```

## 📏 Best Practices

### 1. Performance Optimization

```tsx
// Use worklets for smooth animations
useKeyboardHandler(
  {
    onMove: (e) => {
      "worklet"; // Critical for performance
      height.value = e.height;
    },
  },
  []
);
```

### 2. Memory Management

```tsx
// Proper cleanup in useEffect
useEffect(() => {
  const subscription = Keyboard.addListener('keyboardDidShow', handler);
  return () => subscription.remove(); // Always cleanup
}, []);
```

### 3. Platform Considerations

```tsx
// Different behaviors for iOS/Android
const keyboardBehavior = Platform.select({
  ios: 'padding',
  android: undefined,
});
```

### 4. Accessibility

```tsx
// Ensure proper accessibility
<TextInput
  accessibilityLabel="Message input"
  accessibilityHint="Type your message here"
  accessibilityRole="text"
/>
```

### 5. Styling Strategy (NativeWind vs StyleSheet)

> **🚦 Rule of thumb:** keep your project‐wide static styles in **NativeWind** classNames so you stay aligned with the design-token system, automatic dark-mode, and dev ergonomics. Use plain JS `style` objects (optionally wrapped in `StyleSheet.create`) **only** for frame-by-frame or animated values that cannot be expressed with Tailwind utilities.
>
> * Static container/input appearance ➜ `className="p-4 bg-primary-50 dark:bg-neutral-900 rounded-xl"`
> * Dynamic padding/height synced with keyboard ➜ `{animatedStyle}` (Reanimated worklet)
> * Third-party components ➜ leave their internal `StyleSheet` untouched; override via `className` or `style` props when needed.
>
> **Component pattern example**
>
> ```tsx
> // combining NativeWind & Reanimated
> const spacer = useAnimatedStyle(() => ({ height: keyboardHeight.value }));
>
> return (
>   <Animated.View
>     className="w-full bg-transparent"
>     style={spacer}
>   />
> );
> ```
>
> This approach preserves consistency across the codebase without fighting the keyboard-animation libraries.

## 🚀 Integration Steps for CanaBro

### Step 1: Install Dependencies

```bash
cd CanaBro
npm install react-native-keyboard-controller
```

### Step 2: Update Root Layout

```tsx
// app/_layout.tsx
import { KeyboardProvider } from "react-native-keyboard-controller";

// Add KeyboardProvider around your existing providers
<SafeAreaProvider>
  <KeyboardProvider>
    {/* Existing providers */}
  </KeyboardProvider>
</SafeAreaProvider>
```

### Step 3: Create Enhanced Keyboard Hook

```bash
# Create the hook file
touch lib/hooks/useEnhancedKeyboard.ts
```

### Step 4: Update Existing Components

Priority components to update:
1. `components/ui/EnhancedTextInput.tsx` - Add keyboard awareness
2. Chat/messaging components - Implement smooth animations
3. Form components - Add keyboard toolbar support
4. Diary entry components - Improve input experience

### Step 5: Add Keyboard-Aware Components

Create new components:
1. `KeyboardAwareTextInput`
2. `ChatInput` with advanced features
3. `FormContainer` with keyboard handling

### Step 6: Update Styling

```css
/* global.css - Add keyboard-aware utilities */
.keyboard-aware {
  transition: margin-bottom 0.3s ease;
}

.keyboard-toolbar {
  background-color: var(--background);
  border-top: 1px solid var(--border);
}
```

### Step 7: Testing Checklist

- [ ] Keyboard animations are smooth (60fps)
- [ ] No layout jumps during keyboard transitions
- [ ] Proper content visibility when keyboard is open
- [ ] Toolbar navigation works between inputs
- [ ] Accessibility features are maintained
- [ ] Performance is optimal on lower-end devices

## 🔄 Migration Path

### Current State Analysis
1. Identify all TextInput usage in CanaBro
2. List components using KeyboardAvoidingView
3. Note performance issues with current keyboard handling

### Migration Phases

**Phase 1: Foundation**
- Install react-native-keyboard-controller
- Set up KeyboardProvider
- Create useEnhancedKeyboard hook

**Phase 2: Core Components**
- Update EnhancedTextInput component
- Migrate form components
- Add keyboard toolbar to complex forms

**Phase 3: Advanced Features**
- Implement chat-style inputs for community features
- Add view avoiding for plant detail screens
- Optimize diary entry components

**Phase 4: Polish**
- Fine-tune animations
- Add keyboard shortcuts
- Improve accessibility

## 🎯 Expected Benefits

1. **Improved UX**: Smoother keyboard transitions and better content visibility
2. **Performance**: 60fps animations with worklet-based implementation
3. **Accessibility**: Better keyboard navigation and screen reader support
4. **Developer Experience**: Simplified keyboard handling with reusable hooks
5. **Platform Consistency**: Unified behavior across iOS and Android

---

*This guide provides a comprehensive foundation for implementing advanced keyboard handling in the CanaBro app using proven patterns from the React Native community.*
