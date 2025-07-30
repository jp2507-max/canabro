/**
 * Plant Tasks related types for the Canabro app
 */

/**
 * Task types enum
 */
export enum TaskType {
  WATER = 'water',
  FEED = 'feed',
  PRUNE = 'prune',
  TRANSPLANT = 'transplant',
  HARVEST = 'harvest',
  OTHER = 'other',
}

/**
 * Task status enum
 */
export enum TaskStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  SKIPPED = 'skipped',
}

/**
 * Interface for plant tasks
 */
export interface PlantTask {
  id: string;
  user_id: string;
  plant_id: string;
  task_type: TaskType;
  title: string;
  description?: string | null;
  due_date: string; // ISO string
  status: TaskStatus;
  completed_at?: string | null; // ISO string
  created_at: string; // ISO string
  updated_at: string; // ISO string
  escalation_start_time?: string | null; // ISO string for escalation tracking
}

/**
 * Interface for task creation
 */
export interface CreatePlantTaskInput {
  plant_id: string;
  task_type: TaskType;
  title: string;
  description?: string;
  due_date: string | Date;
  status?: TaskStatus;
}

/**
 * Interface for task update
 */
export interface UpdatePlantTaskInput {
  id: string;
  title?: string;
  description?: string | null;
  task_type?: TaskType;
  due_date?: string | Date;
  status?: TaskStatus;
  completed_at?: string | Date | null;
}

/**
 * Interface for plant tasks query result with joined plant info
 */
export interface PlantTaskWithPlant extends PlantTask {
  plant_name: string;
  plant_image_url?: string | null;
}

/**
 * Interface for task filter options
 */
export interface TaskFilterOptions {
  status?: TaskStatus | TaskStatus[];
  taskType?: TaskType | TaskType[];
  plantId?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  completed?: boolean;
  limit?: number;
  offset?: number;
}
