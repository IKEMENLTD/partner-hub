import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as crypto from 'crypto';
import { Organization } from './entities/organization.entity';
import { OrganizationMember } from './entities/organization-member.entity';
import {
  OrganizationInvitation,
  InvitationStatus,
} from './entities/organization-invitation.entity';
import { UserProfile } from '../auth/entities/user-profile.entity';
import { UserRole } from '../auth/enums/user-role.enum';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { QueryInvitationDto } from './dto/query-invitation.dto';
import { PaginatedResponseDto } from '../../common/dto/pagination.dto';
import { EmailService } from '../notification/services/email.service';
import { ResourceNotFoundException } from '../../common/exceptions/resource-not-found.exception';
import { BusinessException } from '../../common/exceptions/business.exception';

@Injectable()
export class OrganizationService {
  private readonly logger = new Logger(OrganizationService.name);

  constructor(
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(OrganizationMember)
    private memberRepository: Repository<OrganizationMember>,
    @InjectRepository(OrganizationInvitation)
    private invitationRepository: Repository<OrganizationInvitation>,
    @InjectRepository(UserProfile)
    private userProfileRepository: Repository<UserProfile>,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  /**
   * 新規組織を作成し、作成者をオーナー兼管理者として追加
   */
  async createOrganizationForNewUser(
    userId: string,
    email: string,
    firstName: string,
    lastName: string,
  ): Promise<Organization> {
    // 既に組織メンバーとして登録されていれば、その組織を返す（重複防止）
    const existingMember = await this.memberRepository.findOne({
      where: { userId },
    });
    if (existingMember) {
      const existingOrg = await this.organizationRepository.findOne({
        where: { id: existingMember.organizationId },
      });
      if (existingOrg) {
        // profiles の organizationId を確実に更新
        await this.userProfileRepository.update(userId, {
          organizationId: existingOrg.id,
        });
        this.logger.log(`User ${email} already has organization: "${existingOrg.name}" (${existingOrg.id})`);
        return existingOrg;
      }
    }

    const orgName = `${lastName}${firstName}の組織`;
    const slug = `org-${crypto.randomBytes(6).toString('hex')}`;

    const organization = this.organizationRepository.create({
      name: orgName,
      slug,
      ownerId: userId,
    });
    await this.organizationRepository.save(organization);

    // メンバーシップ作成
    const member = this.memberRepository.create({
      organizationId: organization.id,
      userId,
      role: 'admin',
      isPrimary: true,
    });
    await this.memberRepository.save(member);

    // profiles の organizationId を更新
    await this.userProfileRepository.update(userId, {
      organizationId: organization.id,
    });

    this.logger.log(`New organization created: "${orgName}" (${organization.id}) for user ${email}`);
    return organization;
  }

  /**
   * 招待を作成
   */
  async createInvitation(
    organizationId: string,
    dto: CreateInvitationDto,
    invitedById: string,
  ): Promise<OrganizationInvitation> {
    // 組織の存在確認
    const org = await this.organizationRepository.findOne({ where: { id: organizationId } });
    if (!org) {
      throw new ResourceNotFoundException('ORG_001', {
        resourceType: 'Organization',
        resourceId: organizationId,
        userMessage: '組織が見つかりません',
      });
    }

    // 同一メール・同一組織への重複招待チェック
    const existing = await this.invitationRepository.findOne({
      where: {
        email: dto.email,
        organizationId,
        status: InvitationStatus.PENDING,
      },
    });
    if (existing) {
      throw new BusinessException('ORG_002', {
        message: 'Duplicate invitation',
        userMessage: 'このメールアドレスには既に招待が送信されています',
      });
    }

    // 既に組織メンバーかチェック
    const existingUser = await this.userProfileRepository.findOne({
      where: { email: dto.email },
    });
    if (existingUser) {
      const existingMember = await this.memberRepository.findOne({
        where: { userId: existingUser.id, organizationId },
      });
      if (existingMember) {
        throw new BusinessException('ORG_003', {
          message: 'User already member',
          userMessage: 'このユーザーは既に組織に所属しています',
        });
      }
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 72);

    const invitation = this.invitationRepository.create({
      organizationId,
      email: dto.email,
      role: dto.role || UserRole.MEMBER,
      token,
      expiresAt,
      invitedById,
      message: dto.message,
      status: InvitationStatus.PENDING,
    });
    await this.invitationRepository.save(invitation);

    // メール送信（非同期）
    this.sendInvitationEmail(invitation, org).catch((err) => {
      this.logger.error(`Failed to send invitation email: ${err.message}`);
    });

    this.logger.log(`Invitation created: ${dto.email} -> org ${org.name}`);
    return invitation;
  }

  /**
   * トークン検証
   */
  async validateInvitation(token: string): Promise<{
    valid: boolean;
    invitation?: OrganizationInvitation;
    organizationName?: string;
    email?: string;
  }> {
    const invitation = await this.invitationRepository.findOne({
      where: { token },
      relations: ['organization'],
    });

    if (!invitation) {
      return { valid: false };
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      return { valid: false };
    }

    if (new Date() > invitation.expiresAt) {
      invitation.status = InvitationStatus.EXPIRED;
      await this.invitationRepository.save(invitation);
      return { valid: false };
    }

    return {
      valid: true,
      invitation,
      organizationName: invitation.organization?.name,
      email: invitation.email,
    };
  }

  /**
   * 招待を受諾
   */
  async acceptInvitation(token: string, userId: string): Promise<void> {
    const result = await this.validateInvitation(token);
    if (!result.valid || !result.invitation) {
      throw new BusinessException('ORG_004', {
        message: 'Invalid or expired invitation',
        userMessage: '招待が無効または期限切れです',
      });
    }

    const invitation = result.invitation;

    // メンバーシップ作成
    const member = this.memberRepository.create({
      organizationId: invitation.organizationId,
      userId,
      role: invitation.role,
      isPrimary: true,
      invitedBy: invitation.invitedById,
    });
    await this.memberRepository.save(member);

    // profiles の organizationId を更新
    await this.userProfileRepository.update(userId, {
      organizationId: invitation.organizationId,
      role: invitation.role,
    });

    // 招待ステータスを更新
    invitation.status = InvitationStatus.ACCEPTED;
    invitation.acceptedAt = new Date();
    await this.invitationRepository.save(invitation);

    this.logger.log(`Invitation accepted: user ${userId} joined org ${invitation.organizationId}`);
  }

  /**
   * 招待をキャンセル
   */
  async cancelInvitation(id: string, organizationId: string): Promise<void> {
    const invitation = await this.invitationRepository.findOne({
      where: { id, organizationId },
    });
    if (!invitation) {
      throw new ResourceNotFoundException('ORG_005', {
        resourceType: 'Invitation',
        resourceId: id,
        userMessage: '招待が見つかりません',
      });
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BusinessException('ORG_006', {
        message: 'Cannot cancel non-pending invitation',
        userMessage: '保留中の招待のみキャンセルできます',
      });
    }

    invitation.status = InvitationStatus.CANCELLED;
    await this.invitationRepository.save(invitation);
    this.logger.log(`Invitation cancelled: ${invitation.email}`);
  }

  /**
   * 招待一覧
   */
  async listInvitations(
    organizationId: string,
    query: QueryInvitationDto,
  ): Promise<PaginatedResponseDto<OrganizationInvitation>> {
    const { page = 1, limit = 10, status } = query;

    const queryBuilder = this.invitationRepository
      .createQueryBuilder('invitation')
      .where('invitation.organizationId = :organizationId', { organizationId });

    if (status) {
      queryBuilder.andWhere('invitation.status = :status', { status });
    }

    queryBuilder.orderBy('invitation.createdAt', 'DESC');

    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();
    return new PaginatedResponseDto(data, total, page, limit);
  }

  /**
   * 招待を再送信
   */
  async resendInvitation(id: string, organizationId: string): Promise<void> {
    const invitation = await this.invitationRepository.findOne({
      where: { id, organizationId },
      relations: ['organization'],
    });
    if (!invitation) {
      throw new ResourceNotFoundException('ORG_005', {
        resourceType: 'Invitation',
        resourceId: id,
        userMessage: '招待が見つかりません',
      });
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BusinessException('ORG_007', {
        message: 'Cannot resend non-pending invitation',
        userMessage: '保留中の招待のみ再送信できます',
      });
    }

    // 期限を延長
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 72);
    invitation.expiresAt = expiresAt;
    await this.invitationRepository.save(invitation);

    // メール再送信
    await this.sendInvitationEmail(invitation, invitation.organization);
    this.logger.log(`Invitation resent: ${invitation.email}`);
  }

  /**
   * 期限切れ招待のクリーンアップ（日次）
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupExpiredInvitations(): Promise<void> {
    try {
      const result = await this.invitationRepository
        .createQueryBuilder()
        .update(OrganizationInvitation)
        .set({ status: InvitationStatus.EXPIRED })
        .where('status = :status', { status: InvitationStatus.PENDING })
        .andWhere('expires_at < :now', { now: new Date() })
        .execute();

      if (result.affected && result.affected > 0) {
        this.logger.log(`Cleaned up ${result.affected} expired invitations`);
      }
    } catch (error) {
      this.logger.error(`Failed to cleanup expired invitations: ${error.message}`, error.stack);
    }
  }

  /**
   * 組織名を取得
   */
  async getOrganizationName(organizationId: string): Promise<string | null> {
    const org = await this.organizationRepository.findOne({ where: { id: organizationId } });
    return org?.name || null;
  }

  private async sendInvitationEmail(
    invitation: OrganizationInvitation,
    organization: Organization,
  ): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
    const inviteUrl = `${frontendUrl}/register?invite=${invitation.token}`;

    const inviter = await this.userProfileRepository.findOne({
      where: { id: invitation.invitedById },
    });
    const inviterName = inviter?.fullName || '管理者';

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #4F46E5; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
    <h1 style="margin: 0;">Partner Hub</h1>
  </div>
  <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
    <h2 style="color: #1f2937;">組織への招待</h2>
    <p>${inviterName}さんから<strong>${organization.name}</strong>への招待が届いています。</p>
    ${invitation.message ? `<p style="background: #f3f4f6; padding: 12px; border-radius: 6px; font-style: italic;">${invitation.message}</p>` : ''}
    <p>以下のリンクからアカウントを作成して組織に参加してください。</p>
    <div style="text-align: center; margin: 24px 0;">
      <a href="${inviteUrl}" style="background: #4F46E5; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
        招待を受けてアカウントを作成
      </a>
    </div>
    <p style="color: #6b7280; font-size: 14px;">この招待は72時間有効です。期限が過ぎた場合は管理者に再送信を依頼してください。</p>
    <p style="color: #6b7280; font-size: 14px;">リンクが機能しない場合は、以下のURLをブラウザに貼り付けてください：</p>
    <p style="color: #6b7280; font-size: 12px; word-break: break-all;">${inviteUrl}</p>
  </div>
</body>
</html>`;

    const text = `${inviterName}さんから${organization.name}への招待が届いています。\n\n以下のリンクからアカウントを作成して組織に参加してください：\n${inviteUrl}\n\nこの招待は72時間有効です。`;

    await this.emailService.sendEmail({
      to: invitation.email,
      subject: `【Partner Hub】${organization.name} への招待`,
      html,
      text,
    });
  }
}
