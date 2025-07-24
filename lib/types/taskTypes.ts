export function isTaskType(x: string): x is TaskType {
  return [
    'watering',
    'feeding',
    'inspection',
    'pruning',
    'harvest',
    'transplant',
    'training',
    'defoliation',
    'flushing',
  ].includes(x);
}
export type TaskType =
  | 'watering'
  | 'feeding'
  | 'inspection'
  | 'pruning'
  | 'harvest'
  | 'transplant'
  | 'training'
  | 'defoliation'
  | 'flushing';
