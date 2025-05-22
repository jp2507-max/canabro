export interface SupabaseStrain {
  id: string; // uuid
  name: string;
  type: string | null;
  thc_percentage: number | null;
  cbd_percentage: number | null;
  api_id: string | null;
  description: string | null;
  effects: string[] | null; // Assuming jsonb will be parsed as string[] in the app
  flavors: string[] | null; // Assuming jsonb will be parsed as string[] in the app
  terpenes: string[] | null; // Assuming jsonb will be parsed as string[] in the app
  parents: string[] | null; // Assuming jsonb will be parsed as string[] in the app
  origin: string[] | null; // Assuming jsonb will be parsed as string[] in the app
  flowering_time: number | null;
  grow_difficulty: string | null;
  genetics: string | null;
  flowering_type: string | null;
  height_indoor: string | null;
  height_outdoor: string | null;
  average_yield: string | null;
  yield_indoor: string | null;
  yield_outdoor: string | null;
  harvest_time_outdoor: string | null;
  breeder: string | null;
  link: string | null;
  created_at?: string; // timestamptz
  updated_at?: string; // timestamptz
}
