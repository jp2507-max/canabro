# Canabro Project Structure

## Directory Organization

### Root Directories
- `/app`: Expo Router app directory with route files
- `/assets`: Static assets including images and icons
- `/components`: Reusable UI components
- `/docs`: Documentation and reports
- `/lib`: Core application logic and utilities
- `/screens`: Screen components
- `/supabase`: Supabase configuration and migrations
- `/tasks`: Task management files

### App Directory
- `/app/(app)`: Main application routes
- `/app/(auth)`: Authentication routes
- `/app/_layout.tsx`: Root layout component
- `/app/index.tsx`: Entry point

### Components Directory
- `/components/ui`: Reusable UI components (buttons, inputs, etc.)
- `/components/my-plants`: Plant-specific components
- `/components/calendar`: Calendar-related components
- `/components/community`: Community feature components
- `/components/diagnosis`: Plant diagnosis components
- `/components/diary`: Plant diary components
- `/components/keyboard`: Keyboard handling components
- `/components/plant-detail`: Plant detail view components
- `/components/profile`: User profile components
- `/components/strains`: Strain-related components
- `/components/tasks`: Task management components

### Library Directory
- `/lib/animations`: Animation utilities
- `/lib/config`: Configuration files
- `/lib/constants`: Application constants
- `/lib/contexts`: React context providers
- `/lib/data`: Data management
- `/lib/database`: Database models and queries
- `/lib/hooks`: Custom React hooks
- `/lib/locales`: Internationalization files
- `/lib/models`: WatermelonDB models
- `/lib/services`: Service layer for API interactions
- `/lib/storage`: Storage utilities
- `/lib/tasks`: Task management logic
- `/lib/types`: TypeScript type definitions
- `/lib/utils`: Utility functions

## Code Organization Patterns

### Component Structure
- Use functional components with hooks
- Implement React.memo for performance optimization
- Follow component composition pattern
- Use TypeScript interfaces for props

### File Naming Conventions
- React components: PascalCase (e.g., `PlantCard.tsx`)
- Utilities and hooks: camelCase (e.g., `useAuth.ts`)
- Constants: UPPER_SNAKE_CASE for values, PascalCase for files

### Import Conventions
- Use absolute imports with path aliases where possible
- Group imports by: React/libraries, components, utilities/hooks

### State Management
- Use React Query for server state
- Use React Context for global app state
- Use local state for component-specific state
- Use WatermelonDB for offline-first data

### Styling Approach
- Use NativeWind (Tailwind CSS) for styling
- Follow mobile-first responsive design
- Use theme-aware components with dark/light mode support
- Implement ThemedView and ThemedText components

### Form Handling
- Use React Hook Form for form state management
- Implement Zod schemas for validation
- Create reusable form components