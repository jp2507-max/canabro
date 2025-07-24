# Protected Routes Implementation with Expo Router v5

## Overview

Your CanaBro app now has a comprehensive protected routes system implemented using Expo Router v5's `Stack.Protected` feature. This system provides robust authentication-based navigation control with proper loading states, splash screen management, and type safety.

## Key Features Implemented

### 1. **Stack.Protected Guards**
- ✅ Routes are automatically protected based on authentication state
- ✅ Authenticated users see `(app)` routes only
- ✅ Unauthenticated users see `(auth)` routes only
- ✅ Automatic redirection based on authentication changes

### 2. **Enhanced Loading States**
- ✅ Splash screen controller that hides splash when auth is resolved
- ✅ Loading indicators during authentication checks
- ✅ Smooth transitions between auth states

### 3. **Comprehensive Utilities**
- ✅ `useSession()` hook for simple authentication state
- ✅ `useAuthGuard()` hook for guard conditions
- ✅ `useAuthNavigation()` hook for protected navigation
- ✅ `ProtectedRoute` component for granular control
- ✅ 404/Not Found handling with proper redirects

## File Structure

```
app/
├── _layout.tsx                 # Root layout with Stack.Protected
├── +not-found.tsx             # 404 handler with auth-aware redirects
├── (auth)/                    # Unauthenticated routes
│   ├── login.tsx
│   ├── register.tsx
│   └── _layout.tsx
└── (app)/                     # Authenticated routes
    ├── (tabs)/
    └── _layout.tsx

lib/
├── hooks/
│   └── useSession.ts          # Session management hooks
├── utils/
│   ├── auth-navigation.ts     # Auth-aware navigation utilities
│   └── protected-routes.ts    # Central exports for auth utilities
└── contexts/
    └── AuthProvider.tsx       # Existing auth context

components/ui/
├── SplashScreenController.tsx # Splash screen management
└── ProtectedRoute.tsx         # Component-level protection
```

## How It Works

### 1. **Root Layout Structure**

```tsx
// app/_layout.tsx
function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Protected routes for authenticated users */}
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>

      {/* Protected routes for unauthenticated users */}
      <Stack.Protected guard={!user}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>

      <Stack.Screen name="+not-found" />
    </Stack>
  );
}
```

### 2. **Authentication Guard Logic**

The system uses boolean guards:
- `guard={!!user}` - Shows routes only when user is authenticated
- `guard={!user}` - Shows routes only when user is NOT authenticated

When guards fail, Expo Router automatically redirects to the first available route.

### 3. **Splash Screen Management**

```tsx
// components/ui/SplashScreenController.tsx
export function SplashScreenController() {
  const { loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync().catch(console.warn);
    }
  }, [loading]);

  return null;
}
```

## Usage Examples

### 1. **Basic Navigation with Auth Check**

```tsx
import { useAuthNavigation } from '@/lib/utils/protected-routes';

function MyComponent() {
  const { navigateProtected, navigateToHome } = useAuthNavigation();

  const handleNavigate = () => {
    // Automatically redirects to login if not authenticated
    navigateProtected('/profile');
  };

  const handleGoHome = () => {
    // Goes to tabs if authenticated, login if not
    navigateToHome();
  };
}
```

### 2. **Component-Level Protection**

```tsx
import { ProtectedRoute } from '@/lib/utils/protected-routes';

function AdminPanel() {
  return (
    <ProtectedRoute
      customGuard={(user) => user?.role === 'admin'}
      fallbackPath="/unauthorized"
    >
      <AdminContent />
    </ProtectedRoute>
  );
}
```

### 3. **Session State Management**

```tsx
import { useSession } from '@/lib/utils/protected-routes';

function UserProfile() {
  const { isAuthenticated, user, isLoading } = useSession();

  if (isLoading) return <Spinner />;
  if (!isAuthenticated) return <LoginPrompt />;

  return <ProfileContent user={user} />;
}
```

### 4. **Higher-Order Component Protection**

```tsx
import { withProtectedRoute } from '@/lib/utils/protected-routes';

const ProtectedProfile = withProtectedRoute(ProfileScreen, {
  requireAuth: true,
  fallbackPath: '/(auth)/login'
});
```

## Key Benefits

1. **Automatic Navigation**: Routes automatically redirect based on auth state
2. **Type Safety**: Full TypeScript support with proper Href types
3. **Loading States**: Proper handling of authentication loading states
4. **Flexibility**: Both layout-level and component-level protection
5. **Performance**: Efficient re-rendering with proper React optimization
6. **User Experience**: Smooth transitions and splash screen handling

## Authentication Flow

1. **App Startup**: 
   - Splash screen shows
   - `AuthProvider` initializes and checks stored session
   - `SplashScreenController` waits for auth resolution

2. **Authentication Check**:
   - If authenticated: User sees `(app)` routes
   - If not authenticated: User sees `(auth)` routes
   - Loading state shows during transition

3. **Navigation**:
   - All navigation respects authentication state
   - Automatic redirects when auth state changes
   - 404 handling with auth-aware fallbacks

## Best Practices

1. **Always use the provided hooks** for navigation and auth checks
2. **Leverage the centralized utilities** from `protected-routes.ts`
3. **Handle loading states** properly in your components
4. **Use component-level protection** for fine-grained control
5. **Test auth flows** on both authenticated and unauthenticated states

## Migration Notes

Your existing implementation was already quite good! The main improvements added:

- ✅ Better organization with dedicated utilities
- ✅ Enhanced splash screen management
- ✅ 404/Not Found handling
- ✅ Type-safe navigation helpers
- ✅ Component-level protection options
- ✅ Comprehensive documentation

The protected routes system is now production-ready and follows all current Expo Router v5 best practices!
