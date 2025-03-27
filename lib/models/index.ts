/**
 * Models Index
 * 
 * Exports all WatermelonDB models for consistent imports across the app
 */

// Database configuration
import database from '../database/database';

// Export model classes
export { Profile } from './Profile';
export { Plant } from './Plant';
export { DiaryEntry } from './DiaryEntry';
export { GrowJournal } from './GrowJournal';
export { GrowLocation } from './GrowLocation';
export { JournalEntry } from './JournalEntry';
export { Post } from './Post';
export { PlantTask } from './PlantTask';

// Export database
export { database };

// Export default database for convenience
export default database;
