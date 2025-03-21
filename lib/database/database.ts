import { Database } from '@nozbe/watermelondb';
import { synchronize } from '@nozbe/watermelondb/sync';
import supabase from '../supabase';
import { Model } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schemaMigrations } from '@nozbe/watermelondb/Schema/migrations';
import Constants from 'expo-constants';
import { authConfig, isExpoGo } from '../config'; 

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

try {
  // Try to import schema and models
  plantSchema = require('./schema').plantSchema;
  Plant = require('../models/Plant').Plant;
  DiaryEntry = require('../models/DiaryEntry').DiaryEntry;
  Profile = require('../models/Profile').Profile;
  GrowJournal = require('../models/GrowJournal').GrowJournal;
  JournalEntry = require('../models/JournalEntry').JournalEntry;
  GrowLocation = require('../models/GrowLocation').GrowLocation;
  Notification = require('../models/Notification').Notification;
  Strain = require('../models/Strain').Strain;
} catch (error) {
  console.error('Error importing schema or models:', error);
  // Use mock schema and models if imports fail
  plantSchema = mockSchema;
}

// Define migrations for future use in production builds
const migrations = schemaMigrations({
  migrations: []
});

// Create appropriate adapter based on configuration
let adapter: any;

// In Expo Go, we MUST use mock adapter because SQLite with JSI is not supported
if (isExpoGo) {
  if (!authConfig.useMockAdapter) {
    console.log('Note: Even though auth bypass is disabled, SQLite with JSI is not supported in Expo Go.');
    console.log('Using mock database adapter due to Expo Go technical limitations.');
  } else {
    console.log('Using mock database adapter as configured');
  }
  
  adapter = {
    schema: plantSchema,
    tableName: (name: string) => name,
    get: async () => ({}),
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
    schema: plantSchema,
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
    Strain
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
