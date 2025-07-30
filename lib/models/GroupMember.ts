import { Model } from '@nozbe/watermelondb';
// Allowed group member roles
export type GroupRole = 'member' | 'moderator' | 'admin';

export const GROUP_ROLE_MEMBER: GroupRole = 'member';
export const GROUP_ROLE_MODERATOR: GroupRole = 'moderator';
export const GROUP_ROLE_ADMIN: GroupRole = 'admin';

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
  @text('role') role!: GroupRole;
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
    return this.role === GROUP_ROLE_MEMBER;
  }

  get isModerator(): boolean {
    return this.role === GROUP_ROLE_MODERATOR;
  }

  get isAdmin(): boolean {
    return this.role === GROUP_ROLE_ADMIN;
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
  @writer async updateRole(role: GroupRole) {
    const allowedRoles: GroupRole[] = [
      GROUP_ROLE_MEMBER,
      GROUP_ROLE_MODERATOR,
      GROUP_ROLE_ADMIN
    ];
    if (!allowedRoles.includes(role)) {
      throw new Error(`Invalid group role: ${role}`);
    }
    await this.update((member) => {
      member.role = role;
      // Update permissions based on role
      member.permissions = this.getDefaultPermissionsForRole(role);
    });
  }

  @writer async promoteToModerator() {
    await this.update((member) => {
      member.role = GROUP_ROLE_MODERATOR;
      member.permissions = this.getDefaultPermissionsForRole(GROUP_ROLE_MODERATOR);
    });
  }

  @writer async promoteToAdmin() {
    await this.update((member) => {
      member.role = GROUP_ROLE_ADMIN;
      member.permissions = this.getDefaultPermissionsForRole(GROUP_ROLE_ADMIN);
    });
  }

  @writer async demoteToMember() {
    await this.update((member) => {
      member.role = GROUP_ROLE_MEMBER;
      member.permissions = this.getDefaultPermissionsForRole(GROUP_ROLE_MEMBER);
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
  private getDefaultPermissionsForRole(role: GroupRole): GroupPermissions {
    switch (role) {
      case GROUP_ROLE_ADMIN:
        return {
          canPost: true,
          canComment: true,
          canInvite: true,
          canModerate: true,
          canManageMembers: true,
          canEditGroup: true,
        };
      case GROUP_ROLE_MODERATOR:
        return {
          canPost: true,
          canComment: true,
          canInvite: true,
          canModerate: true,
          canManageMembers: false,
          canEditGroup: false,
        };
      case GROUP_ROLE_MEMBER:
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