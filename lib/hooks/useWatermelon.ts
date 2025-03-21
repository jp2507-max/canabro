import { useDatabase } from '../contexts/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import { Database, Model, Q } from '@nozbe/watermelondb';
import { ComponentType } from 'react';

// Hook to get the database instance
export function useWatermelon() {
  return useDatabase();
}

// Helper function to create a HOC that observes models
export function withWatermelonModels<T extends Record<string, any>>(
  Component: ComponentType<T>,
  getModels: (props: any, database: Database) => Record<string, any>
) {
  // Using type assertion to handle the complex typing of withObservables
  return withObservables(['id'], (props: any) => {
    const { database } = useWatermelon();
    return getModels(props, database);
  })(Component as ComponentType<any>);
}

// Helper function to create a query for a model
export function createQuery<T extends Model>(
  database: Database,
  tableName: string,
  conditions: any[] = []
) {
  return database.collections.get<T>(tableName).query(...conditions);
}

// Helper function to find a model by id
export async function findById<T extends Model>(
  database: Database,
  tableName: string,
  id: string
): Promise<T | null> {
  try {
    return await database.collections.get<T>(tableName).find(id);
  } catch (error) {
    console.error(`Error finding ${tableName} with id ${id}:`, error);
    return null;
  }
}

// Helper function to create a new model
export async function createModel<T extends Model>(
  database: Database,
  tableName: string,
  data: Record<string, any>
): Promise<T> {
  return await database.write(async () => {
    return await database.collections.get<T>(tableName).create((record) => {
      Object.keys(data).forEach((key) => {
        // @ts-ignore
        record[key] = data[key];
      });
    });
  });
}

// Helper function to update a model
export async function updateModel<T extends Model>(
  model: T,
  data: Record<string, any>
): Promise<T> {
  return await model.database.write(async () => {
    return await model.update((record) => {
      Object.keys(data).forEach((key) => {
        // @ts-ignore
        record[key] = data[key];
      });
    });
  });
}

// Helper function to delete a model
export async function deleteModel<T extends Model>(model: T): Promise<void> {
  return await model.database.write(async () => {
    await model.markAsDeleted();
  });
}

export { Q };
