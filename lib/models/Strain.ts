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

  @text('api_id') apiId?: string;
  @text('name') name!: string;
  @text('type') type!: string;
  @text('description') description?: string;
  @field('thc_percentage') thcPercentage?: number;
  @field('cbd_percentage') cbdPercentage?: number;
  @field('flowering_time') floweringTime?: number; // Reverted to single numeric field
  @text('grow_difficulty') growDifficulty?: string;
  @text('effects') effects?: string; // JSON string
  @text('flavors') flavors?: string; // JSON string
  @text('terpenes') terpenes?: string; // JSON string
  @text('parents') parents?: string; // JSON string
  @text('origin') origin?: string; // JSON string

  // Fields from API, types adjusted
  @text('genetics') genetics?: string;
  @text('flowering_type') floweringType?: string;
  @text('height_indoor') heightIndoor?: string; // Changed to text
  @text('height_outdoor') heightOutdoor?: string; // Changed to text
  @text('average_yield') averageYield?: string; // Ensured present as text
  @text('yield_indoor') yieldIndoor?: string; // Changed to text
  @text('yield_outdoor') yieldOutdoor?: string; // Changed to text
  @text('harvest_time_outdoor') harvestTimeOutdoor?: string;
  @text('breeder') breeder?: string;
  @text('link') link?: string;

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

  getTerpenes(): string[] {
    return this.terpenes ? JSON.parse(this.terpenes) : [];
  }

  setTerpenes(terpenes: string[]): void {
    this.terpenes = JSON.stringify(terpenes);
  }

  getParents(): string[] {
    return this.parents ? JSON.parse(this.parents) : [];
  }

  setParents(parents: string[]): void {
    this.parents = JSON.stringify(parents);
  }

  getOrigin(): string[] { // Assuming origin might also be an array, if not, this can be simplified
    return this.origin ? JSON.parse(this.origin) : [];
  }

  setOrigin(origin: string[]): void { // Assuming origin might also be an array
    this.origin = JSON.stringify(origin);
  }
}
