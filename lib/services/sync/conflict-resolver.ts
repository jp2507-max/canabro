/**
 * Conflict resolution for sync service
 * Handles table-specific conflict resolution strategies
 */

import { Q } from '@nozbe/watermelondb';

/**
 * Get the sync priority for a specific table
 * Higher priority tables will be processed first
 * 
 * @param table Table name
 * @returns Priority value (higher = processed first)
 */
export function getPriorityForTable(table: string): number {
  switch (table) {
    case 'profiles': return 10; // Highest priority - user data should sync first
    case 'plants': return 9;
    case 'grow_journals': return 8;
    case 'grow_locations': return 7;
    case 'journal_entries': return 6;
    case 'diary_entries': return 5;
    case 'plant_tasks': return 4;
    case 'posts': return 3;
    default: return 1;
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
  receivedChanges: any, 
  database: any
): Promise<{
  created: any[];
  updated: any[];
  deleted: any[];
}> {
  const tableChanges = receivedChanges[table] || { created: [], updated: [], deleted: [] };
  const result = {
    created: [...(tableChanges.created || [])],
    updated: [...(tableChanges.updated || [])],
    deleted: [...(tableChanges.deleted || [])]
  };
  
  // Skip if no records to process
  if (result.created.length === 0 && result.updated.length === 0) {
    return result;
  }
  
  try {
    console.log(`[Conflict Resolution] Processing conflicts for table ${table}`);
    
    // Get collection for this table
    const collection = database.get(table);
    
    // 1. Check if any "created" records already exist locally
    // If they do, move them to updated instead (cross-table general strategy)
    const createdIds = result.created.map((record: { id: string }) => record.id);
    if (createdIds.length > 0) {
      try {
        // Check which IDs already exist locally
        const existingRecords = await collection.query(Q.where('id', Q.oneOf(createdIds))).fetch();
        const existingIds = new Set(existingRecords.map((record: { id: string }) => record.id));
        
        // Move existing records from created to updated
        if (existingIds.size > 0) {
          console.log(`[Conflict Resolution] ${existingIds.size} ${table} records moved from created to updated`);
          
          const stillCreated = result.created.filter((record: { id: string }) => !existingIds.has(record.id));
          const movedToUpdated = result.created.filter((record: { id: string }) => existingIds.has(record.id));
          
          result.created = stillCreated;
          result.updated = [...result.updated, ...movedToUpdated];
        }
      } catch (error) {
        console.warn(`[Conflict Resolution] Error checking existing records for ${table}:`, error);
      }
    }
    
    // 2. Table-specific conflict resolution strategies
    switch (table) {
      case 'plants':
        // For plants, preserve custom names and modifications
        await resolvePlantConflicts(result.updated, collection);
        break;
        
      case 'diary_entries':
      case 'journal_entries':
        // For diary/journal entries, merge content on conflict
        await resolveEntryConflicts(result.updated, collection);
        break;
        
      case 'plant_tasks':
        // For tasks, prefer most recent completion status
        await resolveTaskConflicts(result.updated, collection);
        break;
        
      case 'grow_journals':
        // For journals, prefer local name/description changes
        await resolveJournalConflicts(result.updated, collection);
        break;
    }
    
    return result;
  } catch (error) {
    console.error(`[Conflict Resolution] Error resolving conflicts for ${table}:`, error);
    // Return original changes if conflict resolution fails
    return {
      created: [...(tableChanges.created || [])],
      updated: [...(tableChanges.updated || [])],
      deleted: [...(tableChanges.deleted || [])]
    };
  }
}

/**
 * Resolve conflicts for plant records
 * Preserves custom names and local modifications
 */
async function resolvePlantConflicts(
  updatedPlants: any[], 
  collection: any
): Promise<void> {
  for (const remotePlant of updatedPlants) {
    try {
      const localPlant = await collection.find(remotePlant.id);
      if (!localPlant) continue; // Skip if plant doesn't exist locally
      
      // 1. Preserve custom names if set locally
      if (localPlant._raw.custom_name && 
          localPlant._raw.custom_name !== remotePlant.name && 
          localPlant._raw.custom_name !== remotePlant.strain_name) {
        console.log(`[Conflict Resolution] Preserved custom name "${localPlant._raw.custom_name}" for plant ${remotePlant.id}`);
        remotePlant.custom_name = localPlant._raw.custom_name;
      }
      
      // 2. Preserve user notes if they differ
      if (localPlant._raw.notes && 
          remotePlant.notes !== localPlant._raw.notes && 
          localPlant._raw.updated_at > remotePlant.updated_at) {
        console.log(`[Conflict Resolution] Preserved local notes for plant ${remotePlant.id}`);
        remotePlant.notes = localPlant._raw.notes;
      }
      
      // 3. Use the most recent plant stage
      const localUpdatedAt = new Date(localPlant._raw.updated_at).getTime();
      const remoteUpdatedAt = new Date(remotePlant.updated_at).getTime();
      
      if (localPlant._raw.growth_stage && 
          localPlant._raw.growth_stage !== remotePlant.growth_stage &&
          localUpdatedAt > remoteUpdatedAt) {
        console.log(`[Conflict Resolution] Using local growth stage "${localPlant._raw.growth_stage}" for plant ${remotePlant.id}`);
        remotePlant.growth_stage = localPlant._raw.growth_stage;
      }
    } catch (error) {
      console.warn(`[Conflict Resolution] Error resolving plant conflict for ID ${remotePlant.id}:`, error);
    }
  }
}

/**
 * Resolve conflicts for diary/journal entries
 * Merges content when both versions have been modified
 */
async function resolveEntryConflicts(
  updatedEntries: any[], 
  collection: any
): Promise<void> {
  for (const remoteEntry of updatedEntries) {
    try {
      const localEntry = await collection.find(remoteEntry.id);
      if (!localEntry) continue; // Skip if entry doesn't exist locally
      
      // Check if both remote and local were updated recently
      const remoteUpdatedAt = new Date(remoteEntry.updated_at).getTime();
      const localUpdatedAt = new Date(localEntry._raw.updated_at).getTime();
      
      // If both were updated within close timeframe (10 minutes) or local is newer
      const closeTimeframe = Math.abs(remoteUpdatedAt - localUpdatedAt) < 10 * 60 * 1000;
      const localIsNewer = localUpdatedAt > remoteUpdatedAt;
      
      if ((closeTimeframe || localIsNewer) && 
          remoteEntry.content && 
          localEntry._raw.content && 
          remoteEntry.content !== localEntry._raw.content) {
        // Merge the content
        console.log(`[Conflict Resolution] Merging content for entry ${remoteEntry.id}`);
        
        remoteEntry.content = 
          `${remoteEntry.content}\n\n--- Merged with local changes (${new Date(localUpdatedAt).toLocaleString()}) ---\n\n${localEntry._raw.content}`;
          
        // Make sure we preserve any modified fields from local
        if (localIsNewer) {
          // Fields that should be preferred from local if locally modified
          const fieldsToPreserve = ['mood', 'rating', 'tags', 'title'];
          
          for (const field of fieldsToPreserve) {
            if (localEntry._raw[field] && localEntry._raw[field] !== remoteEntry[field]) {
              console.log(`[Conflict Resolution] Using local ${field} for entry ${remoteEntry.id}`);
              remoteEntry[field] = localEntry._raw[field];
            }
          }
        }
      }
    } catch (error) {
      console.warn(`[Conflict Resolution] Error resolving entry conflict for ID ${remoteEntry.id}:`, error);
    }
  }
}

/**
 * Resolve conflicts for plant tasks
 * Preserves completion status based on most recent update
 */
async function resolveTaskConflicts(
  updatedTasks: any[], 
  collection: any
): Promise<void> {
  for (const remoteTask of updatedTasks) {
    try {
      const localTask = await collection.find(remoteTask.id);
      if (!localTask) continue; // Skip if task doesn't exist locally
      
      const remoteUpdatedAt = new Date(remoteTask.updated_at).getTime();
      const localUpdatedAt = new Date(localTask._raw.updated_at).getTime();
      
      // If completed status differs, use the most recent one
      if (remoteTask.completed !== localTask._raw.completed) {
        if (localUpdatedAt > remoteUpdatedAt) {
          console.log(
            `[Conflict Resolution] Using local completion status (${localTask._raw.completed}) for task ${remoteTask.id}`
          );
          remoteTask.completed = localTask._raw.completed;
          
          // Also preserve completion date if task was completed locally
          if (localTask._raw.completed && localTask._raw.completed_at) {
            remoteTask.completed_at = localTask._raw.completed_at;
          }
        } else {
          console.log(
            `[Conflict Resolution] Using remote completion status (${remoteTask.completed}) for task ${remoteTask.id}`
          );
        }
      }
      
      // Always preserve local notes if they differ
      if (localTask._raw.notes && 
          remoteTask.notes !== localTask._raw.notes) {
        console.log(`[Conflict Resolution] Preserved local notes for task ${remoteTask.id}`);
        
        // If remote also has notes, merge them
        if (remoteTask.notes && remoteTask.notes.trim()) {
          remoteTask.notes = `${remoteTask.notes}\n\n--- Local notes ---\n${localTask._raw.notes}`;
        } else {
          remoteTask.notes = localTask._raw.notes;
        }
      }
    } catch (error) {
      console.warn(`[Conflict Resolution] Error resolving task conflict for ID ${remoteTask.id}:`, error);
    }
  }
}

/**
 * Resolve conflicts for grow journals
 * Preserves local name/description changes
 */
async function resolveJournalConflicts(
  updatedJournals: any[], 
  collection: any
): Promise<void> {
  for (const remoteJournal of updatedJournals) {
    try {
      const localJournal = await collection.find(remoteJournal.id);
      if (!localJournal) continue; // Skip if journal doesn't exist locally
      
      const remoteUpdatedAt = new Date(remoteJournal.updated_at).getTime();
      const localUpdatedAt = new Date(localJournal._raw.updated_at).getTime();
      
      // If local was updated more recently, preserve name and description
      if (localUpdatedAt > remoteUpdatedAt) {
        // Preserve journal name if modified locally
        if (localJournal._raw.name && localJournal._raw.name !== remoteJournal.name) {
          console.log(`[Conflict Resolution] Using local name for journal ${remoteJournal.id}`);
          remoteJournal.name = localJournal._raw.name;
        }
        
        // Preserve journal description if modified locally
        if (localJournal._raw.description && localJournal._raw.description !== remoteJournal.description) {
          console.log(`[Conflict Resolution] Using local description for journal ${remoteJournal.id}`);
          remoteJournal.description = localJournal._raw.description;
        }
      }
    } catch (error) {
      console.warn(`[Conflict Resolution] Error resolving journal conflict for ID ${remoteJournal.id}:`, error);
    }
  }
}