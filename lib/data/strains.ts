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

interface Effect {
  id: string;
  name: string;
  type: 'positive' | 'negative' | 'medical';
}

interface Flavor {
  id: string;
  name: string;
}

// Mock database for strain search
const mockStrains: Strain[] = [
  {
    id: '1',
    name: 'OG Kush',
    type: 'hybrid',
    thcContent: 20,
    effects: ['relaxed', 'happy', 'euphoric'],
    flavors: ['earthy', 'pine', 'woody'],
    description: 'OG Kush is a legendary strain with a strong, complex aroma and taste.',
    growDifficulty: 'moderate',
  },
  {
    id: '2',
    name: 'Blue Dream',
    type: 'sativa',
    thcContent: 18,
    effects: ['happy', 'creative', 'uplifted'],
    flavors: ['berry', 'sweet', 'vanilla'],
    description: 'Blue Dream delivers swift symptom relief without heavy sedative effects.',
    growDifficulty: 'easy',
  },
  {
    id: '3',
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
