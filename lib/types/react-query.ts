/**
 * Re-export type declarations for React Query
 * This file ensures that imports without the .d.ts extension work correctly
 */

// Simply re-export the declarations from the .d.ts file
export {};

// The actual declarations are in react-query.d.ts
// This file exists to fix import resolution for:
// import '../lib/types/react-query'