# TypeScript Optimization & Code Quality Checklist

## Project Architecture & Tooling

- **Navigation:** We use [Expo Router](https://docs.expo.dev/router/introduction/) for all navigation. All route entry points are in `app/`, with business logic and UI in `screens/` or `components/`.
- **Screen Structure:** Follow a modular pattern:
  - Route entry: `app/(tabs)/screen.tsx` (navigation only)
  - Container: `screens/screen/ScreenContainer.tsx` (state, data, handlers)
  - View: `screens/screen/ScreenView.tsx` (presentation only)
- **Tech Stack:** Expo (React Native), TypeScript, NativeWind, Supabase, WatermelonDB, TensorFlow.js.
- **Theming:** Use the Canabro theming system (`ThemedView`, `ThemedText`, etc.) and support dark mode.
- **State Management:** Use React Context and hooks for global state; avoid prop drilling.

## 1. Typing & Type Safety
- [ ] Replace all usages of `any` with precise interfaces or Zod-inferred types.
- [ ] Avoid the `Function` type; always specify argument and return types for functions.
- [ ] Use primitive types (`string`, `number`, `boolean`) instead of object wrappers (`String`, `Number`, `Boolean`).
- [ ] Prefer interfaces over types for object shapes.
- [ ] Use strict mode in your `tsconfig.json` (`strict: true`).
- [ ] Type errors as `unknown` and use Zod/custom guards for error parsing.
- [ ] Avoid unnecessary generics and type parameters.

## 2. Component & State Management
- [ ] Refactor large components into smaller, memoized subcomponents.
- [ ] Use `useReducer` or React Context for grouped or global state instead of excessive `useState`.
- [ ] Memoize expensive computations and components with `useMemo`, `useCallback`, and `React.memo`.
- [ ] Avoid prop drilling by leveraging context where appropriate.

## 3. Performance & Render Optimization
- [ ] Memoize list item renderers (e.g., in FlatList) and ensure stable keys.
- [ ] Profile screens for unnecessary re-renders; optimize with React DevTools.
- [ ] Split files/components that approach or exceed 300 lines.

## 4. Imports & Project Structure
- [ ] Use standalone imports (e.g., `import { X } from 'lib'`) for better tree shaking and IDE support.
- [ ] Avoid using namespaces or wrapper object types.
- [ ] Keep files organized per your documented folder structure and under 300 lines.

## 5. Error Handling
- [ ] Handle errors at the beginning of functions (early returns).
- [ ] Use global error boundaries for React components.
- [ ] Implement runtime validation with Zod for all API and user input.

## 6. Theming & Styling
- [ ] Use only the provided themed components (`ThemedView`, `ThemedText`) and context for styling.
- [ ] Do not hardcode colors, padding, or margins; use theme tokens and SafeAreaView.
- [ ] Ensure all new screens/components support dark mode and accessibility props.

## 7. Testing
- [ ] Write unit tests for all major hooks, services, and business logic with Jest.
- [ ] Use React Native Testing Library for component tests.
- [ ] Add integration tests for critical flows (e.g., authentication, plant management).

## 8. Data Fetching & Async
- [ ] Use react-query for data fetching and caching.
- [ ] Avoid excessive API calls; cache and invalidate queries as needed.
- [ ] Type all async results and errors.

## 9. Security & Best Practices
- [ ] Use react-native-encrypted-storage for sensitive data.
- [ ] Do not commit `.env` files or secrets.
- [ ] Sanitize all user inputs and outputs.

## 10. Documentation & Maintenance
- [ ] Document all complex functions and hooks with JSDoc.
- [ ] Keep README and type definitions up to date.
- [ ] Regularly review and refactor for code duplication and dead code.
