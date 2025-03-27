import { Platform } from 'react-native';
import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';

import schema from './schema';
import migrations from './migrations';

// Import models
import { Profile } from './Profile';
import { Plant } from './Plant';
import { DiaryEntry } from './DiaryEntry';
import { GrowLocation } from './GrowLocation';
import { GrowJournal } from './GrowJournal';
import { Post } from './Post';
import { PlantTask } from './PlantTask';
import { JournalEntry } from './JournalEntry';

// Choose adapter based on platform
const adapter = Platform.OS === 'web' 
  ? new LokiJSAdapter({
      schema,
      migrations,
      useWebWorker: true,
      useIncrementalIndexedDB: true,
      dbName: 'canabroDB',
      onQuotaExceededError: error => {
        console.error('WatermelonDB quota exceeded:', error);
      },
      onSetUpError: error => {
        console.error('WatermelonDB setup error:', error);
      },
    })
  : new SQLiteAdapter({
      schema,
      migrations,
      jsi: Platform.OS === 'ios', // Enable JSI on iOS for better performance
      onSetUpError: error => {
        console.error('WatermelonDB setup error:', error);
      },
    });

// Initialize the database with our schema and models
export const database = new Database({
  adapter,
  modelClasses: [
    Profile,
    Plant,
    DiaryEntry,
    GrowLocation,
    GrowJournal,
    Post,
    PlantTask,
    JournalEntry,
  ],
});

export default database;
