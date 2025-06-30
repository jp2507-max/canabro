/**
 * Export all types from a single entry point
 */

// User and profile related types
export * from './user';

// Plant related types
export * from './plant';

// Diary related types
export * from './diary';

// Community related types
export * from './community';

// Strain related types
export * from './strain';

// Diagnosis related types
export * from './diagnosis';

// Location related types
export * from './location';

/**
 * Common response interface for API calls
 */
export interface ApiResponse<T> {
  data: T | null;
  error: Error | null;
  status: number;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  startAfter?: string;
  orderBy?: string;
  order?: 'asc' | 'desc';
}

/**
 * Pagination response
 */
export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Search parameters
 */
export interface SearchParams {
  query: string;
  filters?: Record<string, any>;
  pagination?: PaginationParams;
}
