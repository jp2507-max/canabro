import { Model } from '@nozbe/watermelondb';
import { date, readonly, text } from '@nozbe/watermelondb/decorators';

/**
 * FavoriteStrain model representing user-strain favorites in the database
 */
export class FavoriteStrain extends Model {
  static table = 'favorite_strains';

  @text('strain_id') strainId!: string;
  @text('user_id') userId!: string;
  @text('strain_object_id') strainObjectId?: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}

export default FavoriteStrain;
