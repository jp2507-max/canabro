/**
 * Growth stage validation utilities
 * Ensures consistency between UI components and Zod schemas
 */

import { z } from 'zod';
import { GROWTH_STAGES_ARRAY, type GrowthStage } from '@/lib/types/plant';

/**
 * Creates a Zod enum validator that stays in sync with GROWTH_STAGES_ARRAY
 * This ensures the validation schema automatically updates when growth stages are modified
 */
export function createGrowthStageValidator(errorMessage?: string) {
  // Convert the array to a tuple that Zod can use
  // We know the array has at least one element, so this is safe
  const [first, ...rest] = GROWTH_STAGES_ARRAY as [GrowthStage, ...GrowthStage[]];
  
  return z.enum([first, ...rest], {
    ...(errorMessage && { required_error: errorMessage }),
  });
}

/**
 * Validates if a string is a valid growth stage
 */
export function isValidGrowthStage(value: string): value is GrowthStage {
  return GROWTH_STAGES_ARRAY.includes(value as GrowthStage);
}

/**
 * Pre-configured growth stage validator for common use cases
 */
export const growthStageSchema = createGrowthStageValidator();
