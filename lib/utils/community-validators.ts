import type { CommunityQuestion, CommunityPlantShare } from '../types/community';

/**
 * Type guard to validate if an object matches the CommunityQuestion interface
 */
export function isCommunityQuestion(obj: unknown): obj is CommunityQuestion {
  if (!obj || typeof obj !== 'object') return false;
  
  const item = obj as Record<string, unknown>;
  
  return (
    typeof item.id === 'string' &&
    typeof item.user_id === 'string' &&
    typeof item.title === 'string' &&
    typeof item.content === 'string' &&
    typeof item.category === 'string' &&
    Array.isArray(item.tags) &&
    item.tags.every((tag: unknown) => typeof tag === 'string') &&
    (item.image_url === undefined || typeof item.image_url === 'string') &&
    typeof item.is_solved === 'boolean' &&
    typeof item.priority_level === 'number' &&
    [1, 2, 3, 4, 5].includes(item.priority_level as number) &&
    typeof item.likes_count === 'number' &&
    typeof item.answers_count === 'number' &&
    typeof item.views_count === 'number' &&
    typeof item.created_at === 'string' &&
    typeof item.updated_at === 'string' &&
    (item.deleted_at === undefined || item.deleted_at === null || typeof item.deleted_at === 'string') &&
    (item.username === undefined || typeof item.username === 'string') &&
    (item.avatar_url === undefined || item.avatar_url === null || typeof item.avatar_url === 'string') &&
    (item.user_has_liked === undefined || typeof item.user_has_liked === 'boolean')
  );
}

/**
 * Type guard to validate if an object matches the CommunityPlantShare interface
 */
export function isCommunityPlantShare(obj: unknown): obj is CommunityPlantShare {
  if (!obj || typeof obj !== 'object') return false;
  
  const item = obj as Record<string, unknown>;
  
  return (
    typeof item.id === 'string' &&
    typeof item.user_id === 'string' &&
    (item.plant_id === undefined || typeof item.plant_id === 'string') &&
    typeof item.plant_name === 'string' &&
    (item.strain_name === undefined || typeof item.strain_name === 'string') &&
    typeof item.growth_stage === 'string' &&
    typeof item.content === 'string' &&
    (item.care_tips === undefined || typeof item.care_tips === 'string') &&
    (item.growing_medium === undefined || typeof item.growing_medium === 'string') &&
    (item.environment === undefined || typeof item.environment === 'string') &&
    Array.isArray(item.images_urls) &&
    item.images_urls.every((url: unknown) => typeof url === 'string') &&
    typeof item.is_featured === 'boolean' &&
    typeof item.likes_count === 'number' &&
    typeof item.comments_count === 'number' &&
    typeof item.shares_count === 'number' &&
    typeof item.created_at === 'string' &&
    typeof item.updated_at === 'string' &&
    (item.deleted_at === undefined || item.deleted_at === null || typeof item.deleted_at === 'string') &&
    (item.username === undefined || typeof item.username === 'string') &&
    (item.avatar_url === undefined || item.avatar_url === null || typeof item.avatar_url === 'string') &&
    (item.user_has_liked === undefined || typeof item.user_has_liked === 'boolean')
  );
}

/**
 * Safely validates and returns a CommunityQuestion from unknown payload data
 */
export function validateCommunityQuestion(payload: unknown): CommunityQuestion | null {
  try {
    if (!payload || typeof payload !== 'object') {
      console.warn('[validateCommunityQuestion] Invalid payload: not an object');
      return null;
    }

    const payloadObj = payload as Record<string, unknown>;
    
    if (!payloadObj.new || typeof payloadObj.new !== 'object') {
      console.warn('[validateCommunityQuestion] Invalid payload: missing or invalid "new" property');
      return null;
    }

    const newData = payloadObj.new;
    
    if (isCommunityQuestion(newData)) {
      return newData;
    }

    console.warn('[validateCommunityQuestion] Payload.new does not match CommunityQuestion interface:', newData);
    return null;
  } catch (error) {
    console.error('[validateCommunityQuestion] Error validating payload:', error);
    return null;
  }
}

/**
 * Safely validates and returns a CommunityPlantShare from unknown payload data
 */
export function validateCommunityPlantShare(payload: unknown): CommunityPlantShare | null {
  try {
    if (!payload || typeof payload !== 'object') {
      console.warn('[validateCommunityPlantShare] Invalid payload: not an object');
      return null;
    }

    const payloadObj = payload as Record<string, unknown>;
    
    if (!payloadObj.new || typeof payloadObj.new !== 'object') {
      console.warn('[validateCommunityPlantShare] Invalid payload: missing or invalid "new" property');
      return null;
    }

    const newData = payloadObj.new;
    
    if (isCommunityPlantShare(newData)) {
      return newData;
    }

    console.warn('[validateCommunityPlantShare] Payload.new does not match CommunityPlantShare interface:', newData);
    return null;
  } catch (error) {
    console.error('[validateCommunityPlantShare] Error validating payload:', error);
    return null;
  }
}

/**
 * Generic validator for UPDATE and DELETE operations that only need ID validation
 */
export function validatePayloadWithId(payload: unknown, operation: 'UPDATE' | 'DELETE'): { id: string } | null {
  try {
    if (!payload || typeof payload !== 'object') {
      console.warn(`[validatePayloadWithId] Invalid ${operation} payload: not an object`);
      return null;
    }

    const payloadObj = payload as Record<string, unknown>;
    const targetData = operation === 'DELETE' ? payloadObj.old : payloadObj.new;
    
    if (!targetData || typeof targetData !== 'object') {
      console.warn(`[validatePayloadWithId] Invalid ${operation} payload: missing or invalid "${operation === 'DELETE' ? 'old' : 'new'}" property`);
      return null;
    }

    const dataObj = targetData as Record<string, unknown>;
    
    if (typeof dataObj.id !== 'string') {
      console.warn(`[validatePayloadWithId] Invalid ${operation} payload: missing or invalid id`);
      return null;
    }

    return { id: dataObj.id };
  } catch (error) {
    console.error(`[validatePayloadWithId] Error validating ${operation} payload:`, error);
    return null;
  }
}
