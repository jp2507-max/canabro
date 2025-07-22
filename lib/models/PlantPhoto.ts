import { Model } from '@nozbe/watermelondb';
import { Associations } from '@nozbe/watermelondb/Model';
import {
  field,
  date,
  readonly,
  text,
  relation,
} from '@nozbe/watermelondb/decorators';

import { Plant } from './Plant';

export class PlantPhoto extends Model {
  static table = 'plant_photos';
  static associations: Associations = {
    plants: { type: 'belongs_to' as const, key: 'plant_id' },
  };

  @text('plant_id') plantId!: string;
  @text('image_url') imageUrl!: string;
  @text('thumbnail_url') thumbnailUrl?: string;
  @text('caption') caption?: string;
  @text('growth_stage') growthStage!: string;
  @field('is_primary') isPrimary?: boolean;
  @field('is_deleted') isDeleted?: boolean;
  @field('file_size') fileSize?: number;
  @field('width') width?: number;
  @field('height') height?: number;
  @readonly @date('taken_at') takenAt!: Date;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
  @date('last_synced_at') lastSyncedAt?: Date;

  // Relations
  @relation('plants', 'plant_id') plant!: Plant;

  // Derived properties
  get isActive(): boolean {
    return !(this.isDeleted ?? false);
  }

  get isPrimaryPhoto(): boolean {
    return this.isPrimary ?? false;
  }

  get formattedFileSize(): string {
    if (!this.fileSize) return 'Unknown';
    
    const bytes = this.fileSize;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    
    if (bytes === 0) return '0 Bytes';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  get aspectRatio(): number | null {
    if (!this.width || !this.height) return null;
    return this.width / this.height;
  }
}