/**
 * Location-related interfaces for the Canabro app
 */

/**
 * Grow environment types
 */
export enum GrowEnvironment {
  INDOOR = 'indoor',
  OUTDOOR = 'outdoor',
  GREENHOUSE = 'greenhouse',
  HYBRID = 'hybrid'
}

/**
 * Light source types
 */
export enum LightSourceType {
  HPS = 'hps',
  MH = 'mh',
  LED = 'led',
  CFL = 'cfl',
  LEC = 'lec',
  CMH = 'cmh',
  FLUORESCENT = 'fluorescent',
  SUNLIGHT = 'sunlight',
  MIXED = 'mixed'
}

/**
 * Growing medium types
 */
export enum GrowingMedium {
  SOIL = 'soil',
  COCO = 'coco',
  ROCKWOOL = 'rockwool',
  HYDROTON = 'hydroton',
  PERLITE = 'perlite',
  VERMICULITE = 'vermiculite',
  WATER = 'water', // For DWC
  AEROPONICS = 'aeroponics',
  MIXED = 'mixed'
}

/**
 * Grow location interface
 */
export interface GrowLocation {
  id: string;
  user_id: string;
  name: string;
  environment: GrowEnvironment;
  size?: {
    width?: number; // in cm
    length?: number; // in cm
    height?: number; // in cm
  };
  light_source?: LightSourceType;
  light_schedule?: {
    hours_on: number;
    hours_off: number;
    auto_controlled: boolean;
  };
  growing_medium?: GrowingMedium;
  temperature_range?: {
    min: number; // in Celsius
    max: number; // in Celsius
    average: number; // in Celsius
  };
  humidity_range?: {
    min: number; // percentage
    max: number; // percentage
    average: number; // percentage
  };
  ventilation?: boolean;
  co2_enrichment?: boolean;
  notes?: string;
  image_url?: string;
  created_at: string;
  updated_at?: string;
}

/**
 * Location sensor data interface
 */
export interface LocationSensorData {
  id: string;
  location_id: string;
  timestamp: string;
  temperature?: number; // in Celsius
  humidity?: number; // percentage
  light_intensity?: number; // in lux
  co2_level?: number; // in ppm
  air_circulation?: number; // in m/s
  water_temperature?: number; // in Celsius (for hydro)
  water_ph?: number; // for hydro
  water_ec?: number; // for hydro
  soil_moisture?: number; // percentage
  soil_ph?: number;
  soil_temperature?: number; // in Celsius
}

/**
 * Interface for creating a new grow location
 */
export interface CreateGrowLocationData {
  name: string;
  environment: GrowEnvironment;
  size?: {
    width?: number;
    length?: number;
    height?: number;
  };
  light_source?: LightSourceType;
  light_schedule?: {
    hours_on: number;
    hours_off: number;
    auto_controlled: boolean;
  };
  growing_medium?: GrowingMedium;
  notes?: string;
  image_url?: string;
}
