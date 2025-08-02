/**
 * Conflict resolution for sync service
 * Handles table-specific conflict resolution strategies
 */

import { Q } from '@nozbe/watermelondb';
import { logger } from '../../config/production';

type ChangeSet<T> = {
  created: T[];
  updated: T[];
  deleted: T[];
};

type TableChanges = Record<string, Partial<ChangeSet<Record<string, unknown>>>>;

type WatermelonCollection = {
  find: (id: string) => Promise<{ _raw: Record<string, unknown> } | undefined>;
  query: (...args: unknown[]) => { fetch: () => Promise<Array<{ _raw: Record<string, unknown> }>> };
};

type WatermelonDb = {
  get: (table: string) => WatermelonCollection;
};

function isWatermelonDb(db: unknown): db is WatermelonDb {
  return !!db && typeof (db as WatermelonDb).get === 'function';
}

function hasRaw(obj: unknown): obj is { _raw: Record<string, unknown> } {
  return (
    !!obj &&
    typeof (obj as Record<string, unknown>)._raw === 'object' &&
    (obj as Record<string, unknown>)._raw !== null
  );
}
function isIdOnly(v: unknown): v is IdOnly {
  return (
    !!v &&
    typeof (v as Record<string, unknown>).id === 'string'
  );
}
function asDateInput(v: unknown): string | number | Date {
  if (typeof v === 'string' || typeof v === 'number' || v instanceof Date) return v;
  return new Date(0);
}
function asString(v: unknown): string {
  return typeof v === 'string' ? v : '';
}
function asBool(v: unknown): boolean | undefined {
  return typeof v === 'boolean' ? v : undefined;
}

interface IdOnly { id: string }

interface RemotePlant extends IdOnly {
  name?: string;
  strain_name?: string;
  custom_name?: string;
  notes?: string;
  growth_stage?: string;
  updated_at: string | number | Date;
}

interface RemoteEntry extends IdOnly {
  content?: string;
  mood?: unknown;
  rating?: unknown;
  tags?: unknown;
  title?: unknown;
  updated_at: string | number | Date;
  [key: string]: unknown;
}

interface RemoteTask extends IdOnly {
  completed?: boolean;
  completed_at?: string | number | Date;
  notes?: string;
  updated_at: string | number | Date;
}

interface RemoteJournal extends IdOnly {
  name?: string;
  description?: string;
  updated_at: string | number | Date;
}

/**
 * Get the sync priority for a specific table
 * Higher priority tables will be processed first
 *
 * @param table Table name
 * @returns Priority value (higher = processed first)
 */
export function getPriorityForTable(table: string): number {
  switch (table) {
    case 'profiles':
      return 10; // Highest priority - user data should sync first
    case 'plants':
      return 9;
    case 'grow_journals':
      return 8;
    case 'grow_locations':
      return 7;
    case 'journal_entries':
      return 6;
    case 'diary_entries':
      return 5;
    case 'plant_tasks':
      return 4;
    case 'posts':
      return 3;
    default:
      return 1;
  }
}

/**
 * Enhanced conflict resolution for tables during sync
 * Handles moving records between created/updated and special merge strategies
 *
 * @param table Table name
 * @param receivedChanges Changes from server
 * @param database WatermelonDB database instance
 * @returns Modified changes with conflicts resolved
 */
export async function handleTableConflicts(
  table: string,
  receivedChanges: TableChanges,
  database: unknown
): Promise<ChangeSet<Record<string, unknown>>> {
  const tableChanges = (receivedChanges?.[table] ??
    { created: [], updated: [], deleted: [] }) as Partial<
    ChangeSet<Record<string, unknown>>
  >;

  const result: ChangeSet<Record<string, unknown>> = {
    created: [...(tableChanges.created || [])],
    updated: [...(tableChanges.updated || [])],
    deleted: [...(tableChanges.deleted || [])],
  };

  // Skip if no records to process
  if (result.created.length === 0 && result.updated.length === 0) {
    return result;
  }

  try {
    logger.log(`[Conflict Resolution] Processing conflicts for table ${table}`);

    // Get collection for this table
    const collection = isWatermelonDb(database) ? database.get(table) : (undefined as unknown as WatermelonCollection);

    // 1. Check if any "created" records already exist locally
    // If they do, move them to updated instead (cross-table general strategy)
    const createdIds = result.created
      .filter(isIdOnly)
      .map((record) => record.id)
      .filter((id): id is string => typeof id === 'string');
    if (createdIds.length > 0) {
      try {
        // Check which IDs already exist locally
        const existingRecords = await collection.query(Q.where('id', Q.oneOf(createdIds))).fetch();
        const existingIds = new Set(
          existingRecords
            .map((record) => (hasRaw(record) ? (record._raw.id as string | undefined) : undefined))
            .filter((id): id is string => typeof id === 'string')
        );

        // Move existing records from created to updated
        if (existingIds.size > 0) {
          logger.log(
            `[Conflict Resolution] ${existingIds.size} ${table} records moved from created to updated`
          );

          const stillCreated = result.created.filter(
            (record): record is Record<string, unknown> =>
              !(isIdOnly(record) && existingIds.has(record.id))
          );
          const movedToUpdated = result.created.filter(
            (record): record is Record<string, unknown> =>
              isIdOnly(record) && existingIds.has(record.id)
          );

          result.created = stillCreated;
          result.updated = [...result.updated, ...movedToUpdated];
        }
      } catch (error) {
        logger.warn(`[Conflict Resolution] Error checking existing records for ${table}:`, error);
      }
    }

    // 2. Table-specific conflict resolution strategies
    switch (table) {
      case 'plants':
        // For plants, preserve custom names and modifications
        await resolvePlantConflicts(result.updated as unknown as RemotePlant[], collection);
        break;

      case 'diary_entries':
      case 'journal_entries':
        // For diary/journal entries, merge content on conflict
        await resolveEntryConflicts(result.updated as unknown as RemoteEntry[], collection);
        break;

      case 'plant_tasks':
        // For tasks, prefer most recent completion status
        await resolveTaskConflicts(result.updated as unknown as RemoteTask[], collection);
        break;

      case 'grow_journals':
        // For journals, prefer local name/description changes
        await resolveJournalConflicts(result.updated as unknown as RemoteJournal[], collection);
        break;
    }

    return result;
  } catch (error) {
    logger.error(`[Conflict Resolution] Error resolving conflicts for ${table}:`, error);
    // Return original changes if conflict resolution fails
    return {
      created: [...(tableChanges.created || [])],
      updated: [...(tableChanges.updated || [])],
      deleted: [...(tableChanges.deleted || [])],
    };
  }
}

/**
 * Resolve conflicts for plant records
 * Preserves custom names and local modifications
 */
async function resolvePlantConflicts(updatedPlants: RemotePlant[], collection: WatermelonCollection): Promise<void> {
  for (const remotePlant of updatedPlants) {
    try {
      const localPlant = await collection.find(remotePlant.id);
      if (!localPlant || !hasRaw(localPlant)) continue; // Skip if plant doesn't exist locally

      // 1. Preserve custom names if set locally
      if (
        asString(localPlant._raw.custom_name) &&
        asString(localPlant._raw.custom_name) !== (remotePlant.name ?? '') &&
        asString(localPlant._raw.custom_name) !== (remotePlant.strain_name ?? '')
      ) {
        logger.log(
          `[Conflict Resolution] Preserved custom name "${localPlant._raw.custom_name}" for plant ${remotePlant.id}`
        );
        remotePlant.custom_name = asString(localPlant._raw.custom_name) || undefined;
      }

      // 2. Preserve user notes if they differ
      if (
        localPlant._raw.notes &&
        remotePlant.notes !== asString(localPlant._raw.notes) &&
        new Date(asDateInput(localPlant._raw.updated_at)).getTime() >
          new Date(asDateInput(remotePlant.updated_at)).getTime()
      ) {
        logger.log(`[Conflict Resolution] Preserved local notes for plant ${remotePlant.id}`);
        remotePlant.notes = asString(localPlant._raw.notes);
      }

      // 3. Use the most recent plant stage
      const localUpdatedAt = new Date(asDateInput(localPlant._raw.updated_at)).getTime();
      const remoteUpdatedAt = new Date(asDateInput(remotePlant.updated_at)).getTime();

      if (
        asString(localPlant._raw.growth_stage) &&
        asString(localPlant._raw.growth_stage) !== (remotePlant.growth_stage ?? '') &&
        localUpdatedAt > remoteUpdatedAt
      ) {
        logger.log(
          `[Conflict Resolution] Using local growth stage "${localPlant._raw.growth_stage}" for plant ${remotePlant.id}`
        );
        remotePlant.growth_stage = asString(localPlant._raw.growth_stage);
      }
    } catch (error) {
      logger.warn(
        `[Conflict Resolution] Error resolving plant conflict for ID ${remotePlant.id}:`,
        error
      );
    }
  }
}

/**
 * Resolve conflicts for diary/journal entries
 * Merges content when both versions have been modified
 */
async function resolveEntryConflicts(updatedEntries: RemoteEntry[], collection: WatermelonCollection): Promise<void> {
  for (const remoteEntry of updatedEntries) {
    try {
      const localEntry = await collection.find(remoteEntry.id);
      if (!localEntry || !hasRaw(localEntry)) continue; // Skip if entry doesn't exist locally

      // Check if both remote and local were updated recently
      const remoteUpdatedAt = new Date(asDateInput(remoteEntry.updated_at)).getTime();
      const localUpdatedAt = new Date(asDateInput(localEntry._raw.updated_at)).getTime();

      // If both were updated within close timeframe (10 minutes) or local is newer
      const closeTimeframe = Math.abs(remoteUpdatedAt - localUpdatedAt) < 10 * 60 * 1000;
      const localIsNewer = localUpdatedAt > remoteUpdatedAt;

      if (
        (closeTimeframe || localIsNewer) &&
        !!remoteEntry.content &&
        !!localEntry._raw.content &&
        remoteEntry.content !== asString(localEntry._raw.content)
      ) {
        // Merge the content
        logger.log(`[Conflict Resolution] Merging content for entry ${remoteEntry.id}`);

        remoteEntry.content = `${remoteEntry.content}\n\n--- Merged with local changes (${new Date(localUpdatedAt).toLocaleString()}) ---\n\n${asString(localEntry._raw.content)}`;

        // Make sure we preserve any modified fields from local
        if (localIsNewer) {
          // Fields that should be preferred from local if locally modified
          const fieldsToPreserve = ['mood', 'rating', 'tags', 'title'];

          for (const field of fieldsToPreserve) {
            if (localEntry._raw[field] && localEntry._raw[field] !== remoteEntry[field]) {
              logger.log(`[Conflict Resolution] Using local ${field} for entry ${remoteEntry.id}`);
              remoteEntry[field] = localEntry._raw[field];
            }
          }
        }
      }
    } catch (error) {
      logger.warn(
        `[Conflict Resolution] Error resolving entry conflict for ID ${remoteEntry.id}:`,
        error
      );
    }
  }
}

/**
 * Resolve conflicts for plant tasks
 * Preserves completion status based on most recent update
 */
async function resolveTaskConflicts(updatedTasks: RemoteTask[], collection: WatermelonCollection): Promise<void> {
  for (const remoteTask of updatedTasks) {
    try {
      const localTask = await collection.find(remoteTask.id);
      if (!localTask || !hasRaw(localTask)) continue; // Skip if task doesn't exist locally

      const remoteUpdatedAt = new Date(asDateInput(remoteTask.updated_at)).getTime();
      const localUpdatedAt = new Date(asDateInput(localTask._raw.updated_at)).getTime();

      // If completed status differs, use the most recent one
      {
        const localCompleted = asBool(localTask._raw.completed);
        if (remoteTask.completed !== localCompleted) {
        if (localUpdatedAt > remoteUpdatedAt) {
          logger.log(
            `[Conflict Resolution] Using local completion status (${localTask._raw.completed}) for task ${remoteTask.id}`
          );
          remoteTask.completed = localCompleted;

          // Also preserve completion date if task was completed locally
          if (localCompleted && localTask._raw.completed_at) {
            remoteTask.completed_at = asDateInput(localTask._raw.completed_at);
          }
        } else {
          logger.log(
            `[Conflict Resolution] Using remote completion status (${remoteTask.completed}) for task ${remoteTask.id}`
          );
        }
      }
      }

      // Always preserve local notes if they differ
      if (asString(localTask._raw.notes) && remoteTask.notes !== asString(localTask._raw.notes)) {
        logger.log(`[Conflict Resolution] Preserved local notes for task ${remoteTask.id}`);

        // If remote also has notes, merge them
        if (remoteTask.notes && String(remoteTask.notes).trim()) {
          remoteTask.notes = `${remoteTask.notes}\n\n--- Local notes ---\n${asString(localTask._raw.notes)}`;
        } else {
          remoteTask.notes = asString(localTask._raw.notes);
        }
      }
    } catch (error) {
      logger.warn(
        `[Conflict Resolution] Error resolving task conflict for ID ${remoteTask.id}:`,
        error
      );
    }
  }
}

/**
 * Resolve conflicts for grow journals
 * Preserves local name/description changes
 */
async function resolveJournalConflicts(updatedJournals: RemoteJournal[], collection: WatermelonCollection): Promise<void> {
  for (const remoteJournal of updatedJournals) {
    try {
      const localJournal = await collection.find(remoteJournal.id);
      if (!localJournal || !hasRaw(localJournal)) continue; // Skip if journal doesn't exist locally

      const remoteUpdatedAt = new Date(asDateInput(remoteJournal.updated_at)).getTime();
      const localUpdatedAt = new Date(asDateInput(localJournal._raw.updated_at)).getTime();

      // If local was updated more recently, preserve name and description
      if (localUpdatedAt > remoteUpdatedAt) {
        // Preserve journal name if modified locally
        if (asString(localJournal._raw.name) && asString(localJournal._raw.name) !== (remoteJournal.name ?? '')) {
          logger.log(`[Conflict Resolution] Using local name for journal ${remoteJournal.id}`);
          remoteJournal.name = asString(localJournal._raw.name);
        }

        // Preserve journal description if modified locally
        if (
          asString(localJournal._raw.description) &&
          asString(localJournal._raw.description) !== (remoteJournal.description ?? '')
        ) {
          logger.log(
            `[Conflict Resolution] Using local description for journal ${remoteJournal.id}`
          );
          remoteJournal.description = asString(localJournal._raw.description);
        }
      }
    } catch (error) {
      logger.warn(
        `[Conflict Resolution] Error resolving journal conflict for ID ${remoteJournal.id}:`,
        error
      );
    }
  }
}
