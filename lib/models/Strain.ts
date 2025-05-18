import { Model, Q } from '@nozbe/watermelondb';
import { Associations } from '@nozbe/watermelondb/Model';
import { field, date, readonly, text } from '@nozbe/watermelondb/decorators';

export class Strain extends Model {
  static table = 'strains';
  static associations: Associations = {
    plants: { type: 'has_many' as const, foreignKey: 'strain_id' },
  };

  // Add a getter for plants to avoid direct relationship access
  get plants() {
    return this.collections.get('plants').query(Q.where('strain_id', this.id));
  }

  @text('api_id') apiId?: string; // New field to store the external API's UUID
  @text('name') name!: string;
  @text('type') type!: string;
  @text('description') description?: string;
  // @text('image_url') imageUrl?: string; // Removed as per user request
  @field('thc_percentage') thcPercentage?: number;
  @field('cbd_percentage') cbdPercentage?: number;
  @field('flowering_time') floweringTime?: number; // This seems to be a duration in days/weeks
  // @field('difficulty') difficulty?: number; // Changed to growDifficulty
  @text('grow_difficulty') growDifficulty?: string; // Changed from difficulty (number) to growDifficulty (string)
  @text('effects') effects?: string;
  @text('flavors') flavors?: string;

  // New fields from API
  @text('genetics') genetics?: string;
  @text('flowering_type') floweringType?: string; // e.g., "Autoflowering"
  @text('height_indoor') heightIndoor?: string;
  @text('height_outdoor') heightOutdoor?: string;
  @text('average_yield') averageYield?: string; // To store values like "Medium" or "250g/plant"
  @text('harvest_time_outdoor') harvestTimeOutdoor?: string; // e.g. "End of September"

  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  // Helper methods for serialized arrays
  getEffects(): string[] {
    return this.effects ? JSON.parse(this.effects) : [];
  }

  setEffects(effects: string[]): void {
    this.effects = JSON.stringify(effects);
  }

  getFlavors(): string[] {
    return this.flavors ? JSON.parse(this.flavors) : [];
  }

  setFlavors(flavors: string[]): void {
    this.flavors = JSON.stringify(flavors);
  }
}
