/**
 * Types for The Cannabis API by Piyush-Bhor
 * API Docs: https://github.com/Piyush-Bhor/The_Cannabis_API
 * Base URL: https://the-cannabis-ayix5e7fr-piyush-bhors-projects.vercel.app/api/strains/
 */

// Assuming the structure based on API endpoint descriptions and common patterns.
// The actual API might return slightly different structures.

export interface TheCannabisApiStrain {
  _id: string; // Assuming MongoDB ObjectId as string
  id?: number; // The original dataset might have a numeric ID
  name: string;
  type: 'indica' | 'sativa' | 'hybrid';
  rating: number; // Assuming a numeric rating
  effects: string[]; // Endpoint suggests fetching effects separately, but listing might include them
  flavor: string[]; // Endpoint suggests fetching flavors separately, but listing might include them
  description: string;
  // Add any other fields returned by the API if discovered
}

// Response type for endpoints returning a list of strains
export type TheCannabisApiStrainsResponse = TheCannabisApiStrain[];

// Response type for endpoints returning effects (assuming array of strings)
export type TheCannabisApiEffectsResponse = string[];

// Response type for endpoints returning flavors (assuming array of strings)
export type TheCannabisApiFlavorsResponse = string[];

// Response type for endpoints returning all effects/flavors
export type TheCannabisApiAllTagsResponse = string[];
