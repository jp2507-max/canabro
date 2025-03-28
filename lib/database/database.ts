import { Database } from '@nozbe/watermelondb';
import { synchronize } from '@nozbe/watermelondb/sync';
import supabase from '../supabase';
import { Model } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import Constants from 'expo-constants';
import { authConfig, isExpoGo } from '../config'; 
import migrations from '../models/migrations';
import * as FileSystem from 'expo-file-system';

// Database file paths for reset functionality
const DB_NAME = 'canabro.db';
const getDatabasePath = async () => {
  return `${FileSystem.documentDirectory}${DB_NAME}`;
};

// Function to reset the local database
export const resetDatabase = async () => {
  try {
    // Get the database file path
    const dbPath = await getDatabasePath();
    
    // Check if the database file exists
    const fileInfo = await FileSystem.getInfoAsync(dbPath);
    
    if (fileInfo.exists) {
      console.log('Database file found, deleting to reset...');
      // Delete the database file
      await FileSystem.deleteAsync(dbPath);
      console.log('Database file deleted successfully.');
      return true;
    } else {
      console.log('No database file found, nothing to delete.');
      return false;
    }
  } catch (error) {
    console.error('Error while trying to reset database:', error);
    return false;
  }
};

// Define the mock schema and model before the try block
const mockSchema = {
  tables: [
    {
      name: 'mock_plants',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' }
      ]
    },
    {
      name: 'mock_diary_entries',
      columns: [
        { name: 'plant_id', type: 'string' },
        { name: 'entry_date', type: 'string' },
        { name: 'content', type: 'string' },
        { name: 'image_url', type: 'string' },
        { name: 'user_id', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' }
      ]
    },
    {
      name: 'mock_profiles',
      columns: [
        { name: 'user_id', type: 'string' },
        { name: 'username', type: 'string' },
        { name: 'avatar_url', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' }
      ]
    },
    {
      name: 'plant_tasks',
      columns: [
        { name: 'task_id', type: 'string' },
        { name: 'plant_id', type: 'string' },
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'task_type', type: 'string' },
        { name: 'due_date', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'notification_id', type: 'string', isOptional: true },
        { name: 'user_id', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' }
      ]
    }
  ]
};

// Create mock model classes
class MockPlant extends Model {
  static table = 'mock_plants';
  static associations = {};
}

class MockDiaryEntry extends Model {
  static table = 'mock_diary_entries';
  static associations = {
    plants: { type: "belongs_to" as const, key: 'plant_id' }
  };
}

class MockProfile extends Model {
  static table = 'mock_profiles';
  static associations = {};
}

class MockPlantTask extends Model {
  static table = 'plant_tasks';
  static associations = {
    plants: { type: "belongs_to" as const, key: 'plant_id' }
  };
}

// Use dynamic imports to avoid TypeScript errors
let plantSchema: any;
let Plant: any = MockPlant;
let DiaryEntry: any = MockDiaryEntry;
let Profile: any = MockProfile;
let GrowJournal: any = MockPlant;
let JournalEntry: any = MockDiaryEntry;
let GrowLocation: any = MockProfile;
let Notification: any = MockProfile;
let Strain: any = MockPlant;
let PlantTask: any = MockPlantTask;
let Post: any = MockPlant;

let schemaImportFailed = false; // Flag to track import failure

try {
  // Try to import schema and models
  const schemaModule = require('./schema');
  plantSchema = schemaModule.default;

  // Explicitly check if schema loaded correctly
  if (!plantSchema || typeof plantSchema !== 'object' || !plantSchema.version) {
    console.error('Failed to load schema correctly from ./schema, schema is invalid or undefined.');
    schemaImportFailed = true;
    throw new Error('Schema import validation failed'); // Force fallback to catch block
  }

  console.log('Successfully imported real schema version:', plantSchema.version);

  Plant = require('../models/Plant').Plant;
  DiaryEntry = require('../models/DiaryEntry').DiaryEntry;
  Profile = require('../models/Profile').Profile;
  GrowJournal = require('../models/GrowJournal').GrowJournal;
  JournalEntry = require('../models/JournalEntry').JournalEntry;
  GrowLocation = require('../models/GrowLocation').GrowLocation;
  Notification = require('../models/Notification').Notification;
  Strain = require('../models/Strain').Strain;
  Post = require('../models/Post').Post;
  
  // Import PlantTask with better error handling since it's exported differently
  try {
    PlantTask = require('../models/PlantTask').PlantTask;
  } catch (e) {
    PlantTask = require('../models/PlantTask').default || require('../models/PlantTask');
  }
} catch (error) {
  console.error('Error importing schema or models:', error);
  schemaImportFailed = true; // Mark import as failed
  // Use mock schema and models if imports fail
  plantSchema = mockSchema;
  console.log('Falling back to mock schema.');
  // Assign mock models (ensure all used models have mocks)
  Plant = MockPlant;
  DiaryEntry = MockDiaryEntry;
  Profile = MockProfile;
  // Add mocks for others if they were potentially uninitialized due to import errors
  GrowJournal = MockPlant; 
  JournalEntry = MockDiaryEntry;
  GrowLocation = MockProfile;
  Notification = MockProfile;
  Strain = MockPlant;
  PlantTask = MockPlantTask;
  Post = MockPlant;
}

// Define migrations for future use in production builds
// Using imported migrations from the correct path

// Create appropriate adapter based on configuration
let adapter: any;

// Double-check plantSchema before creating the adapter
if (!plantSchema || schemaImportFailed) {
  console.error("CRITICAL: plantSchema is missing or invalid before creating SQLiteAdapter. Using mock schema as fallback.");
  plantSchema = mockSchema; // Ensure mock schema is used if real one failed
}

// In Expo Go, we MUST use mock adapter because SQLite with JSI is not supported
if (isExpoGo) {
  if (!authConfig.useMockAdapter) {
    console.log('Note: Even though auth bypass is disabled, SQLite with JSI is not supported in Expo Go.');
    console.log('Using mock database adapter due to Expo Go technical limitations.');
  } else {
    console.log('Using mock database adapter as configured');
  }
  
  // Create a more robust mock adapter that properly handles all tables
  const mockTables = mockSchema.tables.map(table => table.name);
  const allTables = [...mockTables, 'plant_tasks']; // Ensure plant_tasks is included
  
  adapter = {
    schema: plantSchema,
    tableName: (name: string) => name,
    get: async (tableName: string) => {
      console.log(`Mock adapter: get collection for table ${tableName}`);
      // Make sure all known tables are available
      if (!allTables.includes(tableName)) {
        console.warn(`Mock adapter: Unknown table requested: ${tableName}`);
      }
      return {};
    },
    find: async () => ({}),
    query: async () => [],
    count: async () => 0,
    batch: async () => ({}),
    getDeletedRecords: async () => [],
    destroyDeletedRecords: async () => {},
    unsafeResetDatabase: async () => {},
    // Add missing methods for sync
    getLocal: async () => ({}),
    create: async () => ({}),
    update: async () => ({}),
    markAsDeleted: async () => ({}),
    syncChanges: async () => ({})
  };
} else {
  // In production or development build, use the real SQLiteAdapter
  console.log('Using SQLite adapter with real database');
  adapter = new SQLiteAdapter({
    schema: plantSchema, // Now guaranteed to be either real or mock schema
    migrations,
    jsi: true, // This is recommended for performance
    dbName: 'canabro',
  });
}

// Initialize the database with the adapter
const database = new Database({
  adapter: adapter as any,
  modelClasses: [
    Plant,
    DiaryEntry,
    Profile,
    GrowJournal, 
    JournalEntry,
    GrowLocation,
    Notification,
    Strain,
    PlantTask,
    Post // Add Post to modelClasses
  ]
});

// Sync function for WatermelonDB
export async function synchronizeWithSupabase() {
  // Skip sync in Expo Go environment
  if (isExpoGo) {
    console.log('Sync skipped in Expo Go environment');
    return;
  }
  
  if (!supabase.auth.getSession()) {
    console.log('No active session, sync skipped');
    return;
  }

  try {
    await synchronize({
      database,
      pullChanges: async ({ lastPulledAt }) => {
        const timestamp = lastPulledAt ? new Date(lastPulledAt).toISOString() : null;
        
        // This is where you'd fetch changes from Supabase based on timestamp
        // For now, returning an empty changes set with proper structure
        return { 
          changes: {
            plants: { created: [], updated: [], deleted: [] },
            profiles: { created: [], updated: [], deleted: [] },
            diary_entries: { created: [], updated: [], deleted: [] },
            grow_journals: { created: [], updated: [], deleted: [] },
            journal_entries: { created: [], updated: [], deleted: [] },
            grow_locations: { created: [], updated: [], deleted: [] },
            notifications: { created: [], updated: [], deleted: [] },
            strains: { created: [], updated: [], deleted: [] },
            plant_tasks: { created: [], updated: [], deleted: [] },
          }, 
          timestamp: Date.now() 
        };
      },
      pushChanges: async ({ changes, lastPulledAt }) => {
        // This is where you'd push local changes to Supabase
        console.log('Changes to push to Supabase:', changes);
        
        // Here you would implement actual Supabase operations to sync changes
      },
    });
  } catch (error) {
    console.error('Sync failed:', error);
  }
}

export default database;
