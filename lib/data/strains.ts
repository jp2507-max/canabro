/**
 * Strain data types and utility functions
 */

export interface Strain {
  id: string;
  name: string;
  type: 'indica' | 'sativa' | 'hybrid' | 'cbd' | 'unknown';
  thcContent?: number;
  cbdContent?: number;
  effects?: string[];
  flavors?: string[];
  description?: string;
  imageUrl?: string;
  growDifficulty?: 'easy' | 'moderate' | 'hard';
}

// Mock database for strain search
const mockStrains: Strain[] = [
  {
    id: '123e4567-e89b-12d3-a456-426614174000', // Fixed UUID for testing
    name: 'OG Kush',
    type: 'hybrid',
    thcContent: 20,
    effects: ['relaxed', 'happy', 'euphoric'],
    flavors: ['earthy', 'pine', 'woody'],
    description: 'OG Kush is a legendary strain with a strong, complex aroma and taste.',
    growDifficulty: 'moderate',
  },
  {
    id: '123e4567-e89b-12d3-a456-426614174001', // Fixed UUID for testing
    name: 'Blue Dream',
    type: 'sativa',
    thcContent: 18,
    effects: ['happy', 'creative', 'uplifted'],
    flavors: ['berry', 'sweet', 'vanilla'],
    description: 'Blue Dream delivers swift symptom relief without heavy sedative effects.',
    growDifficulty: 'easy',
  },
  {
    id: '123e4567-e89b-12d3-a456-426614174002', // Fixed UUID for testing
    name: 'Northern Lights',
    type: 'indica',
    thcContent: 16,
    effects: ['relaxed', 'sleepy', 'happy'],
    flavors: ['sweet', 'spicy', 'pine'],
    description: 'Northern Lights stands among the most famous strains of all time.',
    growDifficulty: 'easy',
  },
  // Add more mock strains as needed
];

// Log the strain UUIDs for testing purposes
console.log('[strains.ts] Fixed strain UUIDs:');
mockStrains.forEach((strain) => {
  console.log(`- ${strain.name}: ${strain.id}`);
});

/**
 * Search strains by name
 * @param query The search query
 * @returns Array of matching strains
 */
export function searchStrainsByName(query: string): Strain[] {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const normalizedQuery = query.toLowerCase().trim();
  return mockStrains.filter((strain) => strain.name.toLowerCase().includes(normalizedQuery));
}

/**
 * Get effects by strain ID
 * @param strainId The strain ID
 * @returns Array of effects
 */
export function getEffectsByStrainId(strainId: string): string[] {
  const strain = mockStrains.find((s) => s.id === strainId);
  return strain?.effects || [];
}

/**
 * Get flavors by strain ID
 * @param strainId The strain ID
 * @returns Array of flavors
 */
export function getFlavorsByStrainId(strainId: string): string[] {
  const strain = mockStrains.find((s) => s.id === strainId);
  return strain?.flavors || [];
}

/**
 * Get a strain by ID
 * @param strainId The strain ID
 * @returns The strain or undefined if not found
 */
export function getStrainById(strainId: string): Strain | undefined {
  return mockStrains.find((s) => s.id === strainId);
}
