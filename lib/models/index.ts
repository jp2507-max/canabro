/**
 * Models Index
 *
 * Exports all WatermelonDB models for consistent imports across the app
 */

// Database configuration
import database from '../database/database';

// Core models
export { DiaryEntry } from './DiaryEntry';
export { GrowJournal } from './GrowJournal';
export { GrowLocation } from './GrowLocation';
export { JournalEntry } from './JournalEntry';
export { Plant } from './Plant';
export { PlantTask } from './PlantTask';
export { Profile } from './Profile';

// Strain-related models
export { Strain } from './Strain';
export { FavoriteStrain } from './FavoriteStrain';

// Export database
export { database };

// Export default database for convenience
export default database;
