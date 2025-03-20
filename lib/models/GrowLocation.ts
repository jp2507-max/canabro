import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, text } from '@nozbe/watermelondb/decorators';
import { Associations } from '@nozbe/watermelondb/Model';

export class GrowLocation extends Model {
  static table = 'grow_locations';
  static associations: Associations = {};

  @text('location_id') locationId!: string;
  @text('user_id') userId!: string;
  @text('name') name!: string;
  @text('type') type!: string;
  @text('description') description?: string;
  @field('latitude') latitude?: number;
  @field('longitude') longitude?: number;
  @field('is_indoor') isIndoor!: boolean;
  @field('area') area?: number;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}
