// Standard Imports for Schema and Models
import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { setGenerator } from '@nozbe/watermelondb/utils/common/randomId'; // Import setGenerator
import * as FileSystem from 'expo-file-system';
import { v4 as uuidv4 } from 'uuid'; // Import uuid

// import { Observable } from 'rxjs'; // Observable is unused
// import { Model } from '@nozbe/watermelondb'; // Model is unused
import { isExpoGo } from '../config';
// Import all model classes directly
import { DiaryEntry } from '../models/DiaryEntry';
import { FavoriteStrain } from '../models/FavoriteStrain';
import { GrowJournal } from '../models/GrowJournal';
import { GrowLocation } from '../models/GrowLocation';
import { JournalEntry } from '../models/JournalEntry';
import { Plant } from '../models/Plant';
import { PlantTask } from '../models/PlantTask';
import { Profile } from '../models/Profile';
import { Strain } from '../models/Strain';
// New plant management models
import { PlantPhoto } from '../models/PlantPhoto';
import { PlantMetrics } from '../models/PlantMetrics';
import { CareReminder } from '../models/CareReminder';
// Calendar system models
import { ScheduleTemplate } from '../models/ScheduleTemplate';
import { CalendarEvent } from '../models/CalendarEvent';
import { NotificationSchedule } from '../models/NotificationSchedule';
// Note: CommunityQuestion and CommunityPlantShare models removed in schema v27
// Note: Notification model commented out as it doesn't exist yet
import migrations from '../models/migrations';
import plantSchema from '../models/schema'; // Corrected import path

// Set ID generator BEFORE adapter creation
setGenerator(() => uuidv4());

// Database file paths for reset functionality
const DB_NAME = 'canabro.db'; // Keep DB Name consistent
const getDatabasePath = async () => {
  // Expo SQLite often stores DBs in a subdirectory named SQLite
  const dbDir = `${FileSystem.documentDirectory}SQLite/`;
  // Ensure the SQLite directory exists, as FileSystem.deleteAsync might require the parent dir to exist for files
  // although for deleting a file itself, it's not strictly necessary but good practice for consistency.
  // For deleting a file, we just need the correct path to the file.
  return `${dbDir}${DB_NAME}`;
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

// Define the list of all model classes used in the app
const modelClasses = [
  Plant,
  DiaryEntry,
  Profile,
  GrowJournal,
  JournalEntry,
  GrowLocation,
  // Notification, // Commented out as it doesn't exist yet
  Strain,
  PlantTask,
  // CommunityQuestion, // Removed in schema v27
  // CommunityPlantShare, // Removed in schema v27
  FavoriteStrain,
  // New plant management models
  PlantPhoto,
  PlantMetrics,
  CareReminder,
  // Calendar system models
  ScheduleTemplate,
  CalendarEvent,
  NotificationSchedule,
];

// Create appropriate adapter based on configuration
let adapter: SQLiteAdapter;

// In Expo Go, we MUST use a mock adapter because SQLite with JSI is not supported.
// For simplicity in this refactor, we'll throw an error if trying to use the real DB in Expo Go.
// A proper mock adapter implementation would be needed for testing/running in Expo Go.
if (isExpoGo) {
  console.error(
    'CRITICAL: Real SQLite database is not supported in Expo Go. App will likely fail.'
  );
  // If you need Expo Go support, implement a proper mock adapter here.
  // For now, we'll let it potentially fail later or use a very basic mock.
  adapter = {
    // Basic mock to avoid immediate crash, but functionality will be broken
    schema: plantSchema,
    migrations, // Include migrations in mock for consistency if needed elsewhere
    jsi: false, // JSI not applicable for mock
    dbName: 'mock_canabro',
    // Implement basic mock methods as needed for the app to load without crashing
    // This is NOT a functional database adapter.
    find: async () => null,
    query: async () => [],
    count: async () => 0,
    batch: async () => {},
    getDeletedRecords: async () => [],
    destroyDeletedRecords: async () => {},
    unsafeResetDatabase: async () => {
      console.log('Mock unsafeResetDatabase called');
    },
    getLocal: async (_key: string) => null,
    setLocal: async (_key: string, _value: string) => {},
    removeLocal: async (_key: string) => {},
  } as unknown as SQLiteAdapter; // Cast to unknown first, then to SQLiteAdapter
  console.warn(
    'Using a minimal mock adapter for Expo Go. Database functionality will be limited/broken.'
  );
} else {
  // In production or development build, use the real SQLiteAdapter
  console.log('[DB Init] Using SQLite adapter with real database');
  try {
    console.log('[DB Init] Creating SQLiteAdapter with schema version:', plantSchema.version);
    adapter = new SQLiteAdapter({
      schema: plantSchema, // Use the directly imported schema
      migrations,
      jsi: true, // Recommended for performance
      dbName: DB_NAME, // Use the constant DB name
      // Provide paths for Expo FileSystem compatibility if needed by the adapter version
      // dbPath: FileSystem.documentDirectory, // Example if needed
    });
    console.log('[DB Init] SQLiteAdapter created successfully.');
  } catch (error) {
    console.error('CRITICAL: Error creating SQLiteAdapter:', error);
    // If the adapter fails, throw the error to prevent the app from starting with a broken DB.
    throw new Error(
      `Failed to initialize SQLiteAdapter: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// Log the final model classes being used (now directly imported)
console.log(
  '[DB Init] Using Model Classes:',
  modelClasses.map((m) => m.name)
);

// Initialize the database with the adapter and models
const database = new Database({
  adapter, // Use the initialized adapter (real or mock)
  modelClasses, // Use the directly imported models
});
console.log('[DB Init] Database instance created.');

// Export the initialized database instance
export default database;

// Removed the redundant synchronizeWithSupabase function
