import { Model, Query, Q } from '@nozbe/watermelondb';
import { Associations } from '@nozbe/watermelondb/Model';
import {
  field,
  date,
  readonly,
  text,
  relation,
  children,
  lazy,
  writer,
} from '@nozbe/watermelondb/decorators';

import { DiaryEntry } from './DiaryEntry';
import { Strain } from './Strain'; // Import Strain model
import { PlantPhoto } from './PlantPhoto';
import { PlantMetrics } from './PlantMetrics';
import { CareReminder } from './CareReminder';

export class Plant extends Model {
  static table = 'plants';
  static associations: Associations = {
    // grow_journals: { type: 'belongs_to' as const, key: 'journal_id' }, // TEST: Comment out
    diary_entries: { type: 'has_many' as const, foreignKey: 'plant_id' }, // Keep children
    plant_photos: { type: 'has_many' as const, foreignKey: 'plant_id' },
    plant_metrics: { type: 'has_many' as const, foreignKey: 'plant_id' },
    care_reminders: { type: 'has_many' as const, foreignKey: 'plant_id' },
    // profiles: { type: 'belongs_to' as const, key: 'user_id' }, // TEST: Comment out
    strains: { type: 'belongs_to' as const, key: 'strain_id' }, // Fixed: Changed from 'strain' to 'strains'
  };

  // Ensure all required fields are initialized with default values to prevent undefined errors

  // @text('plant_id') plantId!: string; // Removed redundant plant_id field
  @text('journal_id') journalId!: string;
  @text('name') name!: string;
  @text('strain') strain!: string;
  @text('strain_id') strainId?: string | null; // Allow null for optional relation
  @text('planted_date') plantedDate!: string;
  @text('growth_stage') growthStage!: string;
  @field('height') height?: number;
  @text('notes') notes?: string;
  @text('image_url') imageUrl?: string;
  @text('user_id') userId!: string;
  @text('location_id') locationId?: string; // Keep for future use, but form uses location_description for now
  @text('cannabis_type') cannabisType?: string; // Added
  @text('grow_medium') growMedium?: string; // Added
  @text('light_condition') lightCondition?: string; // Added
  @text('location_description') locationDescription?: string; // Added
  @field('is_auto_flower') isAutoFlower?: boolean; // Added
  @field('is_feminized') isFeminized?: boolean; // Added
  @field('thc_content') thcContent?: number; // Added
  @field('cbd_content') cbdContent?: number; // Added
  @text('expected_harvest_date') expectedHarvestDate?: string; // Added (using text for date string)

  // NEW PLANT STATUS FIELDS
  @field('health_percentage') healthPercentage?: number;
  @field('next_watering_days') nextWateringDays?: number;
  @field('next_nutrient_days') nextNutrientDays?: number;

  // ADDITIONAL METRICS FIELDS
  @field('node_count') nodeCount?: number;
  @field('stem_diameter') stemDiameter?: number;
  @field('ph_level') phLevel?: number;
  @field('ec_ppm') ecPpm?: number;
  @field('temperature') temperature?: number;
  @field('humidity') humidity?: number;
  @field('vpd') vpd?: number;
  @text('trichome_status') trichomeStatus?: string;
  @field('pistil_brown_percentage') pistilBrownPercentage?: number;
  @field('bud_density') budDensity?: number;
  @field('wet_weight') wetWeight?: number;
  @field('dry_weight') dryWeight?: number;
  @field('trim_weight') trimWeight?: number;
  @date('harvest_date') harvestDate?: Date;

  // Normalized strain-based scheduling fields
  @text('plant_type') plantType?: string; // 'photoperiod' | 'autoflower' | 'unknown'
  @text('baseline_kind') baselineKind?: string; // 'flip' | 'germination'
  @date('baseline_date') baselineDate?: Date;
  @text('environment') environment?: string; // 'indoor' | 'outdoor' | 'greenhouse'
  @text('hemisphere') hemisphere?: string; // 'N' | 'S'
  @field('predicted_flower_min_days') predictedFlowerMinDays?: number;
  @field('predicted_flower_max_days') predictedFlowerMaxDays?: number;
  @date('predicted_harvest_start') predictedHarvestStart?: Date;
  @date('predicted_harvest_end') predictedHarvestEnd?: Date;
  @field('schedule_confidence') scheduleConfidence?: number;
  @text('yield_unit') yieldUnit?: string; // 'g_per_plant' | 'g_per_m2'
  @field('yield_min') yieldMin?: number;
  @field('yield_max') yieldMax?: number;
  @text('yield_category') yieldCategory?: string; // 'low' | 'medium' | 'high' | 'unknown'

  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
  @date('last_synced_at') lastSyncedAt?: Date;
  @field('is_deleted') isDeleted?: boolean;

  // Relations
  // @relation('grow_journals', 'journal_id') journal!: GrowJournal; // TEST: Comment out
  // @relation('profiles', 'user_id') profile!: Profile; // TEST: Comment out
  @relation('strains', 'strain_id') strainObj?: Strain; // Fixed: Changed from 'strain' to 'strains'

  // Children collections
  @children('diary_entries') diaryEntries!: Query<DiaryEntry>;
  @children('plant_photos') plantPhotos!: Query<PlantPhoto>;
  @children('plant_metrics') plantMetrics!: Query<PlantMetrics>;
  @children('care_reminders') careReminders!: Query<CareReminder>;

  // Custom queries
  @lazy activeEntries = this.diaryEntries.extend(Q.where('is_deleted', false));

  @lazy recentEntries = this.diaryEntries.extend(Q.sortBy('entry_date', 'desc'), Q.take(5));

  // Derived properties
  get isActive(): boolean {
    return !this.isDeleted;
  }

  get daysSincePlanting(): number {
    const planted = new Date(this.plantedDate);
    const now = new Date();
    return Math.floor((now.getTime() - planted.getTime()) / (1000 * 60 * 60 * 24));
  }

  // Writer methods
  @writer async updateGrowthStage(stage: string) {
    await this.update((plant) => {
      plant.growthStage = stage;
    });
  }

  @writer async updateHeight(height: number) {
    await this.update((plant) => {
      plant.height = height;
    });
  }

  @writer async updateNotes(notes: string) {
    await this.update((plant) => {
      plant.notes = notes;
    });
  }

  @writer async setStrainRelation() {
    // If we have a strainId but no linked strain object, try to load and associate it
    if (this.strainId) {
      try {
        // Import dynamically to avoid circular dependencies
        const { getStrainById } = require('../data/strains');
        const strain = getStrainById(this.strainId);
        if (strain) {
          console.log(
            `[Plant.setStrainRelation] Found strain for ID ${this.strainId}:`,
            strain.name
          );

          // ENHANCEMENT: Store the strain object directly in a property that will be included in sync
          // This ensures the strain data is available during the sync process
          this.update((plant) => {
            // Store these fields explicitly to ensure they're available during sync
            plant.strain = strain.name; // Ensure strain name is always set
            plant.strainId = strain.id; // Reinforce the ID connection

            // Set additional strain properties that might be useful
            if (strain.type) plant.cannabisType = strain.type;

            // Log detailed info for debugging
            console.log(
              '[Plant.setStrainRelation] Updated plant with strain data. Plant will now have:'
            );
            console.log('- strain:', plant.strain);
            console.log('- strainId:', plant.strainId);
            console.log('- cannabisType:', plant.cannabisType);
          });

          // Log for debugging
          console.log(
            '[Plant.setStrainRelation] Strain data available for sync:',
            JSON.stringify(strain, null, 2)
          );
        } else {
          console.warn(`[Plant.setStrainRelation] No strain found for ID ${this.strainId}`);
        }
      } catch (error) {
        console.error('[Plant.setStrainRelation] Error setting strain relation:', error);
      }
    }
  }

  // Helper function for testing UUID connections
  async logPlantAndStrainDebugInfo() {
    console.log('========= PLANT DEBUG INFO =========');
    console.log(`Plant ID: ${this.id}`);
    console.log(`Plant Name: ${this.name}`);
    console.log(`Strain Name: ${this.strain}`);
    console.log(`Strain ID: ${this.strainId || 'null'}`);

    // Check if the strain ID matches any current strains in the mock data
    if (this.strainId) {
      try {
        // Import is done here to avoid circular dependencies
        const { getStrainById } = require('../data/strains');
        const matchingStrain = getStrainById(this.strainId);
        console.log(`Matching Strain Found: ${matchingStrain ? 'Yes' : 'No'}`);
        if (matchingStrain) {
          console.log(`Matching Strain Name: ${matchingStrain.name}`);
          console.log(`Matching Strain Type: ${matchingStrain.type}`);
        }
      } catch (error) {
        console.error('Error checking for matching strain:', error);
      }
    }

    console.log('==================================');

    return {
      plantId: this.id,
      plantName: this.name,
      strainName: this.strain,
      strainId: this.strainId,
    };
  }

  // Additional helper specifically for debugging strain relation issues
  async debugStrainRelationProperties() {
    console.log('========= PLANT-STRAIN RELATION DEBUG =========');
    console.log(`Plant ID: ${this.id}`);
    console.log(`Plant Name: ${this.name}`);

    // Check how the properties are stored/accessed in different ways
    console.log(`Direct properties:`);
    console.log(`- this.strain: ${this.strain}`);
    console.log(`- this.strainId: ${this.strainId}`);

    // Raw access
    console.log(`\nRaw property access:`);
    try {
      // @ts-ignore - Access raw properties for debugging purposes
      console.log(`- _raw.strain: ${this._raw?.strain}`);
      // @ts-ignore - Access raw properties for debugging purposes
      console.log(`- _raw.strain_id: ${this._raw?.strain_id}`);
      // @ts-ignore - Access raw properties for debugging purposes
      console.log(`- _raw.strainId: ${this._raw?.strainId}`);
    } catch (e) {
      console.log('Error accessing _raw properties:', e);
    }

    // Check relation
    console.log(`\nRelation access:`);
    try {
      if (this.strainObj) {
        console.log(`- strainObj exists: Yes`);
        console.log(`- strainObj.id: ${this.strainObj.id}`);
        console.log(`- strainObj.name: ${this.strainObj.name}`);
      } else {
        console.log(`- strainObj exists: No`);

        // Try fetching with the relation API
        const { getStrainById } = require('../data/strains');
        const strain = this.strainId ? getStrainById(this.strainId) : null;

        if (strain) {
          console.log(`- Strain found via getStrainById: Yes`);
          console.log(`- Found strain.id: ${strain.id}`);
          console.log(`- Found strain.name: ${strain.name}`);
        } else {
          console.log(`- No strain found via getStrainById`);
        }
      }
    } catch (e) {
      console.log('Error checking relation:', e);
    }

    console.log('===========================================');
  }

  @writer async markAsDeleted() {
    await this.update((plant) => {
      plant.isDeleted = true;
    });
  }

  @writer async updateImage(imageUrl: string) {
    await this.update((plant) => {
      plant.imageUrl = imageUrl;
    });
  }
}
