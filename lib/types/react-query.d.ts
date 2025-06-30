/**
 * TypeScript declarations for React Query
 */
import { WeedDbQueryKeys } from '../services/weed-db.service';

// Create a custom type for your app's query keys
declare module '@tanstack/react-query' {
  interface Register {
    queryKey: WeedDbQueryKeys;
  }
}

export {};
