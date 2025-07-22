/**
 * Type-safe WatermelonDB helper utilities
 * 
 * Provides type-safe wrappers around WatermelonDB operations to eliminate
 * dangerous 'as unknown as' type casting and prevent runtime errors.
 */

import { Database, Collection, Model, Q } from '@nozbe/watermelondb';
import { Observable } from 'rxjs';

/**
 * Type-safe collection getter
 */
export function getCollection<T extends Model>(
  database: Database,
  tableName: string
): Collection<T> {
  return database.collections.get<T>(tableName);
}

/**
 * Type-safe query builder for collections
 */
export function createQuery<T extends Model>(
  collection: Collection<T>,
  ...conditions: Parameters<Collection<T>['query']>
) {
  return collection.query(...conditions);
}

/**
 * Type-safe fetch operation
 */
export async function fetchRecords<T extends Model>(
  collection: Collection<T>,
  ...conditions: Parameters<Collection<T>['query']>
): Promise<T[]> {
  return await collection.query(...conditions).fetch();
}

/**
 * Type-safe observe operation
 */
export function observeRecords<T extends Model>(
  collection: Collection<T>,
  ...conditions: Parameters<Collection<T>['query']>
): Observable<T[]> {
  return collection.query(...conditions).observe();
}

/**
 * Type-safe create operation
 */
export async function createRecord<T extends Model>(
  database: Database,
  collection: Collection<T>,
  callback: (record: T) => void
): Promise<T> {
  return await database.write(async () => {
    return await collection.create(callback);
  });
}

/**
 * Type-safe update operation
 */
export async function updateRecord<T extends Model>(
  database: Database,
  record: T,
  callback: (record: T) => void
): Promise<T> {
  return await database.write(async () => {
    return await record.update(callback);
  });
}

/**
 * Type-safe delete operation
 */
export async function deleteRecord<T extends Model>(
  database: Database,
  record: T
): Promise<void> {
  await database.write(async () => {
    await record.destroyPermanently();
  });
}

/**
 * Type-safe soft delete operation (mark as deleted)
 */
export async function softDeleteRecord<T extends Model>(
  database: Database,
  record: T
): Promise<T> {
  return await database.write(async () => {
    return await record.update((r: T) => {
      (r as T & { isDeleted?: boolean }).isDeleted = true;
    });
  });
}

/**
 * Type-safe find operation
 */
export async function findRecord<T extends Model>(
  collection: Collection<T>,
  id: string
): Promise<T> {
  return await collection.find(id);
}

/**
 * Common query conditions for plant photos
 */
export const PlantPhotoQueries = {
  byPlantId: (plantId: string) => Q.where('plant_id', plantId),
  notDeleted: () => Q.where('is_deleted', Q.notEq(true)),
  sortByTakenAt: (direction: 'asc' | 'desc' = 'desc') => Q.sortBy('taken_at', direction === 'desc' ? Q.desc : Q.asc),
  active: (plantId: string) => [
    Q.where('plant_id', plantId),
    Q.where('is_deleted', Q.notEq(true))
  ]
};

/**
 * Type-safe plant photo operations
 */
export const PlantPhotoOperations = {
  async fetchByPlantId<T extends Model>(
    collection: Collection<T>,
    plantId: string
  ): Promise<T[]> {
    return await collection.query(
      PlantPhotoQueries.byPlantId(plantId),
      PlantPhotoQueries.notDeleted(),
      PlantPhotoQueries.sortByTakenAt()
    ).fetch();
  },

  observeByPlantId<T extends Model>(
    collection: Collection<T>,
    plantId: string
  ): Observable<T[]> {
    return collection.query(
      PlantPhotoQueries.byPlantId(plantId),
      PlantPhotoQueries.notDeleted(),
      PlantPhotoQueries.sortByTakenAt()
    ).observe();
  }
};
