import { schemaMigrations } from '@nozbe/watermelondb/Schema/migrations';

export default schemaMigrations({
  migrations: [
    // Migration 1: Initial schema
    {
      toVersion: 1,
      steps: [],
    },
    // Migration 2-16: Placeholder for existing migrations
    // These should contain your actual past migrations
    // Adding placeholders here to maintain continuity
    {
      toVersion: 2,
      steps: [],
    },
    {
      toVersion: 3,
      steps: [],
    },
    {
      toVersion: 4,
      steps: [],
    },
    {
      toVersion: 5,
      steps: [],
    },
    {
      toVersion: 6,
      steps: [],
    },
    {
      toVersion: 7,
      steps: [],
    },
    {
      toVersion: 8,
      steps: [],
    },
    {
      toVersion: 9,
      steps: [],
    },
    {
      toVersion: 10,
      steps: [],
    },
    {
      toVersion: 11,
      steps: [],
    },
    {
      toVersion: 12,
      steps: [],
    },
    {
      toVersion: 13,
      steps: [],
    },
    {
      toVersion: 14,
      steps: [],
    },
    {
      toVersion: 15,
      steps: [],
    },
    {
      toVersion: 16,
      steps: [],
    },
    // Migration 17: Add favorite_strains table
    {
      toVersion: 17,
      steps: [
        // Create the favorite_strains table if it doesn't exist
        {
          type: 'create_table',
          name: 'favorite_strains',
          columns: [
            { name: 'user_id', type: 'string', isIndexed: true },
            { name: 'strain_id', type: 'string', isIndexed: true },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        },
      ],
    },
  ],
});