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

// New plant management models
export { PlantPhoto } from './PlantPhoto';
export { PlantMetrics } from './PlantMetrics';
export { CareReminder } from './CareReminder';
export { ScheduleTemplate } from './ScheduleTemplate';

// Strain-related models
export { Strain } from './Strain';
export { FavoriteStrain } from './FavoriteStrain';

// Advanced Community Features models
export { ConversationThread } from './ConversationThread';
export { Message } from './Message';
export { LiveNotification } from './LiveNotification';
export { UserPresence } from './UserPresence';
export { FollowRelationship } from './FollowRelationship';
export { SocialGroup } from './SocialGroup';
export { GroupMember } from './GroupMember';
export { LiveEvent } from './LiveEvent';
export { EventParticipant } from './EventParticipant';
export { CommunityPoll } from './CommunityPoll';

// Export database
export { database };

// Export default database for convenience
export default database;
