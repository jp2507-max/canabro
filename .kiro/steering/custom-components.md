# CanaBro Utils - Usage Guidelines & Best Practices

Quick reference for using the custom utilities and components effectively.

## 📱 Usage Guidelines

### When to Use Each Component

**For Lists & Feeds:**
- Use `FlashListWrapper` for performance
- Use `NetworkResilientImage` for images
- Use `StrainSkeletonItem` for loading states

**For Forms:**
- Use `EnhancedKeyboardWrapper` for keyboard management
- Use `EnhancedTextInput` for complex inputs
- Use `useKeyboardPadding` for custom keyboard handling

**For Images:**
- Use `image-picker.ts` for selection
- Use `upload-image.ts` for uploads
- Use `NetworkResilientImage` for display

**For Animations:**
- Use `useButtonAnimation` for buttons
- Use `useCardAnimation` for cards
- Use `useAnimationCleanup` for cleanup

**For Haptics:**
- Use `haptics.ts` for all tactile feedback
- Use semantic functions (light/medium/heavy/success/error)

## 🎯 Best Practices

1. **Always check the main index** before creating new utilities
2. **Use existing hooks and components** to maintain consistency
3. **Follow the established patterns** in each utility
4. **Use TypeScript interfaces** from existing utilities
5. **Add proper error handling** using existing error utilities
6. **Use semantic tokens** for theming and colors
7. **Follow mobile-first principles** with safe area support

## ⚡ Performance Considerations

- Use `FlashListWrapper` for large lists (>50 items)
- Use `NetworkResilientImage` for network images
- Use `useAnimationCleanup` for all animations
- Use `useDebounce` for expensive operations
- Use `useDebouncedCallback` for rapid user interactions

## 📝 File Naming Convention

- **Utilities:** `kebab-case.ts` (e.g., `upload-image.ts`)
- **Hooks:** `camelCase.ts` (e.g., `useKeyboardPadding.ts`)
- **Components:** `PascalCase.tsx` (e.g., `EnhancedTextInput.tsx`)

## 🚀 Common Patterns

### Image Workflow
```typescript
// 1. Select image
const image = await selectFromGallery();

// 2. Upload image
const result = await uploadImage({
  bucket: 'plants',
  userId: user.id,
  imageUri: image.uri
});

// 3. Display image
<NetworkResilientImage 
  url={result.publicUrl} 
  width={300} 
  height={200} 
/>
```

### Form with Keyboard
```typescript
// Wrap form with keyboard management
<EnhancedKeyboardWrapper>
  <EnhancedTextInput
    placeholder="Enter plant name"
    value={name}
    onChangeText={setName}
  />
</EnhancedKeyboardWrapper>
```

### Animated Button
```typescript
// Use button animation hook
const { animatedStyle, handlers } = useButtonAnimation({
  enableHaptics: true,
  onPress: handlePress
});

<Animated.View style={animatedStyle}>
  <Pressable {...handlers}>
    <Text>Press me</Text>
  </Pressable>
</Animated.View>
```

### Performance List
```typescript
// Use FlashList for large datasets
<FlashListWrapper
  data={plants}
  renderItem={({ item }) => (
    <PlantCard plant={item} />
  )}
  estimatedItemSize={120}
/>
```

---

*Quick reference for efficient development. See `lib/utils/index.md` for complete utility listings.*<!------------------------------------------------------------------------------