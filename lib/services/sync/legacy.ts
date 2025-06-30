/**
 * Legacy compatibility layer for sync service
 *
 * This file maintains backward compatibility with code that imports
 * from the original sync-service.ts location. New code should import
 * directly from the modular structure.
 *
 * @deprecated Use direct imports from sync/ modules instead
 */

// Re-export everything from our modular implementation
export * from './index';
