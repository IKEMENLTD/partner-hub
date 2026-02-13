import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { UserProfile } from './entities/user-profile.entity';
import { Organization } from '../organization/entities/organization.entity';
import { OrganizationMember } from '../organization/entities/organization-member.entity';
import { SupabaseService } from '../supabase/supabase.service';
import { ResourceNotFoundException } from '../../common/exceptions/resource-not-found.exception';
import { BusinessException } from '../../common/exceptions/business.exception';

@Injectable()
export class SuperAdminService {
  private readonly logger = new Logger(SuperAdminService.name);

  constructor(
    @InjectRepository(UserProfile)
    private profileRepository: Repository<UserProfile>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(OrganizationMember)
    private orgMemberRepository: Repository<OrganizationMember>,
    private supabaseService: SupabaseService,
  ) {}

  async getStats() {
    const totalOrganizations = await this.organizationRepository.count();
    const totalUsers = await this.profileRepository.count();
    const activeUsers = await this.profileRepository.count({
      where: { isActive: true },
    });

    return {
      totalOrganizations,
      totalUsers,
      activeUsers,
    };
  }

  async findAllOrganizations() {
    const organizations = await this.organizationRepository.find({
      order: { createdAt: 'DESC' },
    });

    // Get member counts
    const result = await Promise.all(
      organizations.map(async (org) => {
        const memberCount = await this.orgMemberRepository.count({
          where: { organizationId: org.id },
        });
        return {
          id: org.id,
          name: org.name,
          slug: org.slug,
          plan: org.plan,
          isActive: org.isActive,
          memberCount,
          ownerId: org.ownerId,
          createdAt: org.createdAt,
        };
      }),
    );

    return result;
  }

  async findAllUsers() {
    const profiles = await this.profileRepository.find({
      order: { createdAt: 'DESC' },
    });

    // Get organization names for each user
    const orgIds = [...new Set(profiles.filter((p) => p.organizationId).map((p) => p.organizationId!))];
    const organizations = orgIds.length > 0
      ? await this.organizationRepository.find({ where: { id: In(orgIds) } })
      : [];
    const orgMap = new Map(organizations.map((o) => [o.id, o.name]));

    return profiles.map((profile) => ({
      id: profile.id,
      email: profile.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      role: profile.role,
      isActive: profile.isActive,
      isSuperAdmin: profile.isSuperAdmin,
      organizationId: profile.organizationId,
      organizationName: profile.organizationId ? orgMap.get(profile.organizationId) || null : null,
      createdAt: profile.createdAt,
    }));
  }

  async deleteUser(userId: string, currentUserId: string) {
    if (userId === currentUserId) {
      throw new BusinessException('AUTH_004', {
        message: 'Cannot delete own account',
        userMessage: '自分自身のアカウントは削除できません',
      });
    }

    const profile = await this.profileRepository.findOne({
      where: { id: userId },
    });

    if (!profile) {
      throw ResourceNotFoundException.forUser(userId);
    }

    // Remove from organization_members
    await this.orgMemberRepository.delete({ userId });

    // Delete profile
    await this.profileRepository.delete({ id: userId });

    // Delete from Supabase Auth
    const supabaseAdmin = this.supabaseService.admin;
    if (supabaseAdmin) {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (error) {
        this.logger.warn(`Failed to delete user from Supabase Auth: ${error.message}`);
      }
    }

    this.logger.log(`User deleted by super admin: ${profile.email} (${userId})`);
    return { message: `ユーザー ${profile.email} を削除しました` };
  }

  async deleteOrganization(orgId: string) {
    const organization = await this.organizationRepository.findOne({
      where: { id: orgId },
    });

    if (!organization) {
      throw new ResourceNotFoundException('ORG_001', {
        message: 'Organization not found',
        userMessage: '組織が見つかりません',
      });
    }

    // Remove all organization members
    await this.orgMemberRepository.delete({ organizationId: orgId });

    // Clear organizationId for all users in this org
    await this.profileRepository
      .createQueryBuilder()
      .update(UserProfile)
      .set({ organizationId: () => 'NULL' })
      .where('organization_id = :orgId', { orgId })
      .execute();

    // Delete the organization
    await this.organizationRepository.delete({ id: orgId });

    this.logger.log(`Organization deleted by super admin: ${organization.name} (${orgId})`);
    return { message: `組織「${organization.name}」を削除しました` };
  }

  async setSuperAdmin(userId: string) {
    const profile = await this.profileRepository.findOne({
      where: { id: userId },
    });

    if (!profile) {
      throw ResourceNotFoundException.forUser(userId);
    }

    profile.isSuperAdmin = true;
    await this.profileRepository.save(profile);

    this.logger.log(`Super admin granted to: ${profile.email}`);
    return { message: `${profile.email} にシステム管理者権限を付与しました` };
  }

  async revokeSuperAdmin(userId: string, currentUserId: string) {
    if (userId === currentUserId) {
      throw new BusinessException('AUTH_004', {
        message: 'Cannot revoke own super admin',
        userMessage: '自分自身のシステム管理者権限は剥奪できません',
      });
    }

    const profile = await this.profileRepository.findOne({
      where: { id: userId },
    });

    if (!profile) {
      throw ResourceNotFoundException.forUser(userId);
    }

    profile.isSuperAdmin = false;
    await this.profileRepository.save(profile);

    this.logger.log(`Super admin revoked from: ${profile.email}`);
    return { message: `${profile.email} のシステム管理者権限を剥奪しました` };
  }
}
