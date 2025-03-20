import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, text } from '@nozbe/watermelondb/decorators';
import { Associations } from '@nozbe/watermelondb/Model';

export class Strain extends Model {
  static table = 'strains';
  static associations: Associations = {};

  @text('strain_id') strainId!: string;
  @text('name') name!: string;
  @text('type') type!: string;
  @text('description') description?: string;
  @text('image_url') imageUrl?: string;
  @field('thc_content') thcContent?: number;
  @field('cbd_content') cbdContent?: number;
  @field('flowering_time') floweringTime?: number;
  @field('difficulty') difficulty?: number;
  @text('effects') effects?: string;
  @text('flavors') flavors?: string;
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
