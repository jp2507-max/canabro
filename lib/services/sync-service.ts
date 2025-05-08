/**
 * Sync Service for WatermelonDB and Supabase
 *
 * Handles synchronization between local WatermelonDB and remote Supabase
 * This file re-exports functionality from the modular implementation
 * 
 * @deprecated Import directly from './sync' modules for better code organization
 */

// Re-export everything from our modular implementation via legacy layer
export * from './sync/legacy';
