import supabase from '../../supabase';
import { Strain } from '../../types/strain';
import { parseStringArray } from '../../utils/string-utils';

/**
 * Ensures a strain exists in Supabase before syncing a plant.
 * If the strain does not exist, it will be created.
 * Returns the strain id if successful, or null if failed.
 */
export async function ensureStrainExistsForSync(strain: Strain): Promise<string | null> {
  // Safely stringify minimal strain info. JSON.stringify can return undefined, coerce to string.
  const headerStr =
    strain ? (JSON.stringify({ id: strain.id, name: strain.name }) as string | undefined) ?? '' : 'undefined strain';
  console.warn('[Sync] ensureStrainExistsForSync called with strain:', headerStr);

  if (!strain?.id || !strain.name) {
    console.error('[Sync] Strain missing id or name:', strain);
    return null;
  }

  // Check if strain exists by id
  try {
    const {
      data: existing,
      error: checkError,
      status: checkStatus,
    } = await supabase.from('strains').select('id').eq('id', strain.id).maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('[Sync] Error checking strain existence:', checkError, 'Status:', checkStatus);
      return null;
    }
    if (existing?.id) {
      console.warn('[Sync] Strain already exists in Supabase:', existing.id);
      return existing.id;
    }
    console.warn('[Sync] Strain does not exist in Supabase yet, will create:', strain.id);
  } catch (queryError) {
    console.error('[Sync] Exception during strain existence check:', queryError);
    return null;
  }
  // Define a list of known safe fields to reduce chances of schema errors
  // Update this list if the database schema changes
  const KNOWN_STRAIN_FIELDS = [
    'id',
    'name',
    'type',
    'description',
    'thc_percentage',
    'cbd_percentage',
    'grow_difficulty',
    'effects',
    'flavors',
    'parents',
    'created_at',
    'updated_at',
    'created_by',
    'average_yield',
    'flowering_time',
    'api_id',
    'genetics',
    'height_indoor',
    'height_outdoor',
    'harvest_time_outdoor',
    'flowering_type',
    'link',
  ];

  /**
   * Creates a safe payload for Supabase upsert operations
   * by filtering out fields that aren't known to exist in the schema
   */
  // Narrow payload type so percent fields accept string | null | undefined
  type MaybeString = string | null | undefined;

  interface SafeStrainPayload {
    [key: string]: unknown;
    thc_percentage?: MaybeString;
    cbd_percentage?: MaybeString;
  }

  // Type guard for Record to safely access dynamic keys
  function isRecord(val: unknown): val is Record<string, unknown> {
    return typeof val === 'object' && val !== null;
  }

  // Helper to coerce unknown into MaybeString with explicit typing
  const toMaybeString = (v: unknown): MaybeString => {
    // Explicitly narrow unknown to string | null | undefined for strict call sites
    if (v === null || v === undefined) return undefined;
    if (typeof v === 'string') return v;
    if (typeof v === 'number') return String(v);
    try {
      const s = String(v);
      return s;
    } catch {
      return undefined;
    }
  };

  function normalizeToOptionalString(v: unknown): MaybeString {
    if (v === null || v === undefined) return undefined;
    if (typeof v === 'string') return v;
    if (typeof v === 'number') return String(v);
    // If already a string-like wrapper (e.g., String object), coerce safely
    try {
      const s = String(v);
      return s;
    } catch {
      return undefined;
    }
  }

  function createSafeStrainPayload(strain: Strain): SafeStrainPayload {
    // Start with a base payload with required fields
    const safePayload: SafeStrainPayload = {
      id: strain.id,
      name: strain.name,
    };

    // Map of common field name variations to their standardized DB column names
    const fieldMappings: Record<string, string[]> = {
      type: ['type', 'species', 'strainType'],
      thc_percentage: ['thc_content', 'thc', 'thcContent', 'thcPercentage', 'THC'],
      cbd_percentage: ['cbd_content', 'cbd', 'cbdContent', 'cbdPercentage', 'CBD'],
      grow_difficulty: ['grow_difficulty', 'growDifficulty', 'difficulty'],
      created_at: ['created_at', 'createdAt'],
      updated_at: ['updated_at', 'updatedAt'],
      flowering_time: ['flowering_time', 'floweringTime'],
      average_yield: ['average_yield', 'yield', 'averageYield'],
      api_id: ['api_id', 'apiId', '_id', 'originalId'],
      genetics: ['genetics'],
      height_indoor: ['height_indoor', 'heightIndoor'],
      height_outdoor: ['height_outdoor', 'heightOutdoor'],
      harvest_time_outdoor: ['harvest_time_outdoor', 'harvestTimeOutdoor'],
      flowering_type: ['flowering_type', 'floweringType'],
    };

    // Array fields that need special JSON parsing
    const arrayFields = ['effects', 'flavors', 'parents'];

    // Strictly only add fields that are in our known list
    for (const dbField of KNOWN_STRAIN_FIELDS) {
      // Skip id and name as they're already handled
      if (dbField === 'id' || dbField === 'name') continue;

      // Special handling for array fields
      if (arrayFields.includes(dbField)) {
        const rawValue = (strain as unknown as Record<string, unknown>)[dbField as keyof Strain];
        // Narrow unknown to the accepted union for parseStringArray
        const parsedArray = parseStringArray(
          rawValue === null || rawValue === undefined
            ? undefined
            : typeof rawValue === 'string'
            ? rawValue
            : Array.isArray(rawValue)
            ? JSON.stringify(rawValue)
            : String(rawValue)
        );
        if (parsedArray !== undefined) {
          safePayload[dbField] = parsedArray;
        }
        continue;
      }

      // For fields with known variations, check all possible source properties
      if (fieldMappings[dbField]) {
        for (const sourceField of fieldMappings[dbField]) {
          const value = (strain as unknown as Record<string, unknown>)[sourceField as keyof Strain];
          if (value !== undefined) {
            safePayload[dbField] = value;
            break;
          }
        }
      } else {
        // For direct matches
        const value = (strain as unknown as Record<string, unknown>)[dbField as keyof Strain];
        if (value !== undefined) {
          safePayload[dbField] = value;
        }
      }
    }

    // Normalize known percentage-like fields if present
    safePayload.thc_percentage = normalizeToOptionalString(safePayload.thc_percentage);
    safePayload.cbd_percentage = normalizeToOptionalString(safePayload.cbd_percentage);

    return safePayload;
  }
  // Map incoming fields to Supabase schema (only using fields confirmed to exist in the DB)
  const insertPayload = createSafeStrainPayload(strain);

  // Convert thcContent to thc_percentage if needed
  if (
    isRecord(strain) &&
    Object.prototype.hasOwnProperty.call(strain as Record<string, unknown>, 'thcContent') &&
    insertPayload.thc_percentage === undefined
  ) {
    // Narrow the dynamic access to the expected union before passing onward
    const thcVal = (strain as Record<string, unknown>)['thcContent'] as unknown;
    const thcMaybe =
      thcVal === null || thcVal === undefined
        ? undefined
        : typeof thcVal === 'string'
        ? thcVal
        : typeof thcVal === 'number'
        ? String(thcVal)
        : undefined;
    insertPayload.thc_percentage = thcMaybe as string | null | undefined;
  }

  // Convert cbdContent to cbd_percentage if needed
  if (
    isRecord(strain) &&
    Object.prototype.hasOwnProperty.call(strain as Record<string, unknown>, 'cbdContent') &&
    insertPayload.cbd_percentage === undefined
  ) {
    const cbdVal = (strain as Record<string, unknown>)['cbdContent'] as unknown;
    const cbdMaybe =
      cbdVal === null || cbdVal === undefined
        ? undefined
        : typeof cbdVal === 'string'
        ? cbdVal
        : typeof cbdVal === 'number'
        ? String(cbdVal)
        : undefined;
    insertPayload.cbd_percentage = cbdMaybe as string | null | undefined;
  }

  // Log only known fields in payload for debugging
  // Prepare a plain object for logging to avoid structural typing issues
  const insertPayloadForLog: Record<string, unknown> = { ...insertPayload as Record<string, unknown> };
  // Safely stringify values for logging; always return string (no unknown)
  const safeStringify = (value: unknown): string => {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    const t = typeof value;
    if (t === 'string') return value as string;
    if (t === 'number' || t === 'boolean' || t === 'bigint') return String(value);
    try {
      const s = JSON.stringify(value);
      if (typeof s === 'string') return s;
    } catch {
      // ignore
    }
    try {
      return String(value);
    } catch {
      return '';
    }
  };
  {
    const payloadStr = safeStringify(insertPayloadForLog);
    console.warn('[Sync] Upserting strain with safe payload:', payloadStr);
  }
  console.warn(
    '[Sync] Safe payload has',
    Object.keys(insertPayload as Record<string, unknown>).length,
    'fields:',
    Object.keys(insertPayload as Record<string, unknown>).join(', ')
  );
  // Object.keys accepts object but Strain can include index signature unknowns in strict mode.
  console.warn(
    '[Sync] Original strain object keys:',
    Object.keys(strain as unknown as Record<string, unknown>).join(', ')
  );

  // Use upsert to avoid race conditions and handle existing records
  const {
    error: upsertError,
    data: upsertData,
    status: upsertStatus,
  } = await supabase
    .from('strains')
    // Provide a properly typed payload array to satisfy the upsert overload
    .upsert(
      [
        {
          id: insertPayload['id'] as string,
          name: insertPayload['name'] as string,
          type: (insertPayload['type'] as string | null | undefined) ?? null,
          description: (insertPayload['description'] as string | null | undefined) ?? null,
          thc_percentage: (insertPayload['thc_percentage'] as string | null | undefined) ?? null,
          cbd_percentage: (insertPayload['cbd_percentage'] as string | null | undefined) ?? null,
          grow_difficulty: (insertPayload['grow_difficulty'] as string | null | undefined) ?? null,
          effects: (insertPayload['effects'] as string[] | null | undefined) ?? null,
          flavors: (insertPayload['flavors'] as string[] | null | undefined) ?? null,
          parents: (insertPayload['parents'] as string[] | null | undefined) ?? null,
          created_at: (insertPayload['created_at'] as string | null | undefined) ?? null,
          updated_at: (insertPayload['updated_at'] as string | null | undefined) ?? null,
          created_by: (insertPayload['created_by'] as string | null | undefined) ?? null,
          average_yield: (insertPayload['average_yield'] as string | null | undefined) ?? null,
          flowering_time: (insertPayload['flowering_time'] as string | null | undefined) ?? null,
          api_id: (insertPayload['api_id'] as string | null | undefined) ?? null,
          genetics: (insertPayload['genetics'] as string | null | undefined) ?? null,
          height_indoor: (insertPayload['height_indoor'] as string | null | undefined) ?? null,
          height_outdoor: (insertPayload['height_outdoor'] as string | null | undefined) ?? null,
          harvest_time_outdoor: (insertPayload['harvest_time_outdoor'] as string | null | undefined) ?? null,
          flowering_type: (insertPayload['flowering_type'] as string | null | undefined) ?? null,
          link: (insertPayload['link'] as string | null | undefined) ?? null,
        },
      ],
      { onConflict: 'id' }
    )
    .select();

  if (upsertError) {
    console.error(
      '[Sync] Error upserting strain:',
      upsertError,
      'Status:',
      upsertStatus,
      'Payload:',
      insertPayload
    );
    return null;
  }
  if (upsertData && upsertData.length > 0) {
    console.warn('[Sync] Strain upserted successfully:', upsertData);
  } else {
    console.warn('[Sync] Strain upsert returned no data:', upsertData);
  }
  return strain.id;
}
