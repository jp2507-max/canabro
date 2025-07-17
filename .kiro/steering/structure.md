# Project Structure

## Root Directories
- **app/**: Expo Router file-based navigation structure
  - **(app)/**: Authenticated app routes
  - **(auth)/**: Authentication-related routes
  - **index.tsx**: Entry point with auth redirection
  - **_layout.tsx**: Root layout with providers
- **assets/**: Images, icons, and other static assets
- **components/**: Reusable UI components
- **docs/**: Project documentation and reports
- **lib/**: Core application logic and utilities
- **screens/**: Screen components for specific features
- **supabase/**: Supabase configuration, migrations, and functions
- **tasks/**: Task definitions and documentation

## Key Directories in Detail

### Components
- **buttons/**: Button components
- **calendar/**: Calendar-related components
- **community/**: Community feature components
- **diagnosis/**: Plant diagnosis components
- **diary/**: Plant diary components
- **keyboard/**: Keyboard handling components
- **my-plants/**: Plant management components
- **plant-detail/**: Plant detail view components
- **profile/**: User profile components
- **strains/**: Strain-related components
- **tasks/**: Task management components
- **ui/**: Core UI components

### Lib
- **animations/**: Animation utilities
- **config/**: App configuration
- **constants/**: Application constants
- **contexts/**: React context providers
  - **AuthProvider.tsx**: Authentication context
  - **DatabaseProvider.tsx**: Database access
  - **LanguageProvider.tsx**: Localization
  - **NotificationContext.tsx**: Push notifications
  - **QueryProvider.tsx**: React Query setup
- **data/**: Data models and fixtures
- **database/**: Database schemas and operations
- **hooks/**: Custom React hooks
- **locales/**: Translation files
- **models/**: Data models and types
- **services/**: API services
- **storage/**: Local storage utilities
- **tasks/**: Background task definitions
- **types/**: TypeScript type definitions
- **utils/**: Utility functions

## Code Organization Patterns

1. **File-based Routing**: Uses Expo Router's file-based routing system
   - Routes in `app/` directory structure
   - Named route groups with parentheses: `(app)`, `(auth)`

2. **Component Structure**:
   - Functional components with TypeScript
   - NativeWind for styling using className prop
   - Component files export a default component

3. **State Management**:
   - React Query for server state
   - React Context for global app state
   - Local component state with useState/useReducer

4. **Database Access**:
   - Supabase for cloud storage and authentication (accessed via MCP server)
   - WatermelonDB for local persistence and offline support
   - Sync mechanism between local and remote databases

5. **Styling Approach**:
   - NativeWind (Tailwind CSS) for styling
   - Dark/light mode support via CSS variables
   - Theme colors defined in tailwind.config.js

6. **Error Handling**:
   - Error boundaries for UI error containment
   - Try/catch patterns for async operations
   - Dedicated error components and handlers