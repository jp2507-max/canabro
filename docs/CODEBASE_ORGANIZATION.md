# Codebase Organization Plan

## Current Issues

After reviewing the codebase, we've identified several organizational issues:

1. **Duplicate hooks directories**: There are hooks in both `/hooks` and `/lib/hooks`
2. **Scattered documentation**: Documentation is spread across multiple locations (root directory, `/docs`, `/supabase`)
3. **Inconsistent naming conventions**: Some files use PascalCase, others use snake_case
4. **Unclear separation of concerns**: Configuration files and utilities are mixed together

## Proposed Changes

### 1. Consolidate Hooks

Move all hooks to a single location:

```
/lib/hooks/
```

This includes moving:
- `/hooks/useDatabase.ts` → `/lib/hooks/useDatabase.ts`
- `/hooks/useWatermelon.ts` → `/lib/hooks/useWatermelon.ts`

### 2. Organize Documentation

Move all documentation to the `/docs` directory with clear naming conventions:

```
/docs/
  /authentication/
    authentication.md
    authentication-update.md
  /database/
    watermelon-setup.md
  /supabase/
    rls-policies.md
    migrations.md
    functions.md
  /development/
    code-style.md
    project-structure.md
```

### 3. Organize Supabase Files

Move all Supabase-related files to the `/supabase` directory:

```
/supabase/
  /migrations/
  /functions/
  /docs/
    rls-testing-guide.md
    dashboard-migration-guide.md
```

### 4. Configuration Structure

Reorganize configuration files for clarity:

```
/lib/config/
  index.ts       # Exports all configs
  auth.ts        # Authentication config
  api.ts         # API config
  features.ts    # Feature flags
  environment.ts # Environment detection
```

### 5. Consistent Naming Conventions

Adopt consistent naming conventions:
- React components: PascalCase (e.g., `AuthProvider.tsx`)
- Utility files: camelCase (e.g., `supabaseClient.ts`)
- Configuration files: camelCase (e.g., `authConfig.ts`)
- Documentation files: kebab-case (e.g., `authentication-guide.md`)

## Implementation Plan

1. **Phase 1**: Consolidate hooks and fix immediate issues
2. **Phase 2**: Reorganize documentation
3. **Phase 3**: Restructure configuration files
4. **Phase 4**: Apply consistent naming conventions

## Benefits

This reorganization will:
- Make the codebase more maintainable
- Improve developer experience
- Reduce confusion about where to find or add code
- Make onboarding new developers easier
- Facilitate future refactoring and feature development
