/**
 * WatermelonDB Database Configuration
 * 
 * Initializes and configures the WatermelonDB database
 */

import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import logger from '@nozbe/watermelondb/utils/common/logger';
import { setGenerator } from '@nozbe/watermelondb/utils/common/randomId';
import { v4 as uuidv4 } from 'uuid';
import schema from './models/schema';
import migrations from './models/migrations';

// Models
import { Profile } from './models/Profile';
import { Plant } from './models/Plant';
import { GrowJournal } from './models/GrowJournal';
import { JournalEntry } from './models/JournalEntry';
import { GrowLocation } from './models/GrowLocation';
import { DiaryEntry } from './models/DiaryEntry';
import { PlantTask } from './models/PlantTask';

// Set ID generator to use UUIDs
setGenerator(() => uuidv4());

// Configure adapter
const adapter = new SQLiteAdapter({
  schema,
  // Use proper migrations
  migrations,
  // Optional logging
  dbName: 'canabro',
  // By default, logs all queries to console in development
  jsi: true, // Use JSI for better performance if available (works on iOS and Android)
  onSetUpError: error => {
    // Called when the database setup fails
    logger.error('[Database] Setup error:', error);
  },
});

// Initialize database with the adapter and models
const database = new Database({
  adapter,
  modelClasses: [
    Profile,
    Plant,
    GrowJournal,
    JournalEntry,
    GrowLocation,
    DiaryEntry,
    PlantTask,
  ],
});

export default database;
