/**
 * Data Migration Utility for Date Unification
 * 
 * Converts existing string-based dates to numeric timestamps in WatermelonDB
 * This runs separately from schema migrations due to WatermelonDB limitations
 */

import { Database } from '@nozbe/watermelondb';
import { Plant } from '../models/Plant';
import { log } from './logger';

// Extended raw record type to include our date fields
interface PlantRawRecord {
  planted_date?: string;
  expected_harvest_date?: string;
  planted_date_ts?: number;
  expected_harvest_date_ts?: number;
  [key: string]: unknown;
}

/**
 * Convert ISO date string to timestamp, handling various formats
 */
function parseStringDateToTimestamp(dateString: string): number | null {
  if (!dateString || dateString.trim() === '') {
    return null;
  }

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      log.warn(`Invalid date string: ${dateString}`);
      return null;
    }
    return date.getTime();
  } catch (error) {
    log.error(`Failed to parse date string: ${dateString}`, error);
    return null;
  }
}

/**
 * Migrate plant dates from strings to numeric timestamps
 */
export async function migratePlantDates(database: Database): Promise<void> {
  log.info('Starting plant date migration from strings to timestamps');
  
  try {
    const plants = await database.get<Plant>('plants').query().fetch();
    log.info(`Found ${plants.length} plants to migrate`);

    let migratedCount = 0;

    await database.write(async () => {
      for (const plant of plants) {
        // Get current raw data to access string date fields
        const rawRecord = plant._raw as PlantRawRecord;
        
        let needsUpdate = false;
        const updates: Partial<PlantRawRecord> = {};

        // Migrate planted_date -> planted_date_ts
        if (rawRecord.planted_date && !rawRecord.planted_date_ts) {
          const timestamp = parseStringDateToTimestamp(rawRecord.planted_date);
          if (timestamp !== null) {
            updates.planted_date_ts = timestamp;
            needsUpdate = true;
          }
        }

        // Migrate expected_harvest_date -> expected_harvest_date_ts
        if (rawRecord.expected_harvest_date && !rawRecord.expected_harvest_date_ts) {
          const timestamp = parseStringDateToTimestamp(rawRecord.expected_harvest_date);
          if (timestamp !== null) {
            updates.expected_harvest_date_ts = timestamp;
            needsUpdate = true;
          }
        }

        if (needsUpdate) {
          await plant.update((p: Plant) => {
            // Map database column names to model property names and assign directly
            // to ensure WatermelonDB change tracking works properly
            if (updates.planted_date_ts !== undefined) {
              p.plantedDateTs = updates.planted_date_ts;
            }
            if (updates.expected_harvest_date_ts !== undefined) {
              p.expectedHarvestDateTs = updates.expected_harvest_date_ts;
            }
          });
          migratedCount++;
        }
      }
    });

    log.info(`Plant date migration completed: ${migratedCount} plants migrated successfully`);
  } catch (error) {
    log.error('Plant date migration failed:', error);
    throw error;
  }
}

/**
 * Check if date migration is needed
 */
export async function needsDateMigration(database: Database): Promise<boolean> {
  try {
    const plants = await database.get<Plant>('plants').query().fetch();
    
    // Check if any plants have string dates but missing timestamp equivalents
    for (const plant of plants) {
      const raw = plant._raw as PlantRawRecord;
      if (
        (raw.planted_date && !raw.planted_date_ts) ||
        (raw.expected_harvest_date && !raw.expected_harvest_date_ts)
      ) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    log.error('Failed to check date migration status:', error);
    return false;
  }
}

/**
 * Get migration progress statistics
 */
export async function getDateMigrationStats(database: Database): Promise<{
  total: number;
  migrated: number;
  pending: number;
}> {
  try {
    const plants = await database.get<Plant>('plants').query().fetch();
    
    let migrated = 0;
    let pending = 0;
    
    for (const plant of plants) {
      const raw = plant._raw as PlantRawRecord;
      const hasStringDates = raw.planted_date || raw.expected_harvest_date;
      const hasTimestamps = raw.planted_date_ts || raw.expected_harvest_date_ts;
      
      if (hasStringDates && hasTimestamps) {
        migrated++;
      } else if (hasStringDates && !hasTimestamps) {
        pending++;
      }
    }
    
    return {
      total: plants.length,
      migrated,
      pending,
    };
  } catch (error) {
    log.error('Failed to get migration stats:', error);
    return { total: 0, migrated: 0, pending: 0 };
  }
}
