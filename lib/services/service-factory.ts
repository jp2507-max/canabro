import { PostgrestError } from '@supabase/supabase-js';

// Type for all API responses
export type ApiResponse<T> = {
  data: T | null;
  error: string | null;
  status: 'success' | 'error';
};

// Base service class with common functionality
export abstract class BaseService {
  // Standardized error handling
  protected handleError(error: unknown): string {
    if (error instanceof Error) {
      console.error(`Service error: ${error.message}`, error);
      return error.message;
    } else if (typeof error === 'object' && error !== null && 'message' in error) {
      const errObj = error as { message: string };
      console.error(`Service error: ${errObj.message}`, error);
      return errObj.message;
    } else if (typeof error === 'string') {
      console.error(`Service error: ${error}`);
      return error;
    }
    console.error('Unknown service error:', error);
    return 'An unknown error occurred';
  }

  // Standardized Supabase error handling
  protected handleSupabaseError(error: PostgrestError | null): string {
    if (!error) return 'An unknown error occurred';
    
    console.error(`Supabase error: ${error.message}`, error);
    // Handle specific error codes if needed
    if (error.code === '23505') {
      return 'This record already exists';
    }
    return error.message;
  }

  // Wrap API responses in a standardized format
  protected wrapResponse<T>(data: T | null, error: string | null): ApiResponse<T> {
    return {
      data,
      error,
      status: error ? 'error' : 'success',
    } as ApiResponse<T>; // Use a type assertion to handle null cases
  }
}

// Factory method for creating services
export function createService<T extends BaseService>(ServiceClass: new () => T): T {
  return new ServiceClass();
}
