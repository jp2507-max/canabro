import { Model } from '@nozbe/watermelondb';
import { Associations } from '@nozbe/watermelondb/Model';
import {
  field,
  date,
  readonly,
  text,
  json,
  relation,
  writer,
} from '@nozbe/watermelondb/decorators';

import { SocialGroup } from './SocialGroup';

export interface GroupPermissions {
  canPost: boolean;
  canComment: boolean;
  canInvite: boolean;
  canModerate: boolean;
  canManageMembers: boolean;
  canEditGroup: boolean;
}

/**
 * GroupMember model for social group membership
 */
export class GroupMember extends Model {
  static table = 'group_members';
  static associations: Associations = {
    social_groups: { type: 'belongs_to' as const, key: 'group_id' },
  };

  @text('group_id') groupId!: string;
  @text('user_id') userId!: string;
  @text('role') role!: string; // 'member' | 'moderator' | 'admin'
  @json('permissions', (json) => json) permissions!: GroupPermissions;
  @field('is_active') isActive!: boolean;
  @field('is_deleted') isDeleted?: boolean;
  @date('last_synced_at') lastSyncedAt?: Date;
  @readonly @date('joined_at') joinedAt!: Date;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  // Relations
  @relation('social_groups', 'group_id') group!: SocialGroup;

  // Computed properties
  get isMember(): boolean {
    return this.role === 'member';
  }

  get isModerator(): boolean {
    return this.role === 'moderator';
  }

  get isAdmin(): boolean {
    return this.role === 'admin';
  }

  get canModerate(): boolean {
    return this.permissions?.canModerate || this.isModerator || this.isAdmin;
  }

  get canManageMembers(): boolean {
    return this.permissions?.canManageMembers || this.isAdmin;
  }

  get daysSinceJoined(): number {
    const now = new Date();
    const timeDiff = now.getTime() - this.joinedAt.getTime();
    return Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  }

  // Writer methods
  @writer async updateRole(role: string) {
    await this.update((member) => {
      member.role = role;
      // Update permissions based on role
      member.permissions = this.getDefaultPermissionsForRole(role);
    });
  }

  @writer async promoteToModerator() {
    await this.update((member) => {
      member.role = 'moderator';
      member.permissions = this.getDefaultPermissionsForRole('moderator');
    });
  }

  @writer async promoteToAdmin() {
    await this.update((member) => {
      member.role = 'admin';
      member.permissions = this.getDefaultPermissionsForRole('admin');
    });
  }

  @writer async demoteToMember() {
    await this.update((member) => {
      member.role = 'member';
      member.permissions = this.getDefaultPermissionsForRole('member');
    });
  }

  @writer async updatePermissions(newPermissions: Partial<GroupPermissions>) {
    await this.update((member) => {
      member.permissions = { ...member.permissions, ...newPermissions };
    });
  }

  @writer async grantPermission(permission: keyof GroupPermissions) {
    await this.update((member) => {
      member.permissions = {
        ...member.permissions,
        [permission]: true
      };
    });
  }

  @writer async revokePermission(permission: keyof GroupPermissions) {
    await this.update((member) => {
      member.permissions = {
        ...member.permissions,
        [permission]: false
      };
    });
  }

  @writer async deactivate() {
    await this.update((member) => {
      member.isActive = false;
    });
  }

  @writer async reactivate() {
    await this.update((member) => {
      member.isActive = true;
      member.isDeleted = false;
    });
  }

  @writer async markAsDeleted() {
    await this.update((member) => {
      member.isDeleted = true;
      member.isActive = false;
    });
  }

  // Helper method to get default permissions for a role
  private getDefaultPermissionsForRole(role: string): GroupPermissions {
    switch (role) {
      case 'admin':
        return {
          canPost: true,
          canComment: true,
          canInvite: true,
          canModerate: true,
          canManageMembers: true,
          canEditGroup: true,
        };
      case 'moderator':
        return {
          canPost: true,
          canComment: true,
          canInvite: true,
          canModerate: true,
          canManageMembers: false,
          canEditGroup: false,
        };
      case 'member':
      default:
        return {
          canPost: true,
          canComment: true,
          canInvite: false,
          canModerate: false,
          canManageMembers: false,
          canEditGroup: false,
        };
    }
  }
}