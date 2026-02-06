import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, MoreThan } from 'typeorm';
import { randomBytes } from 'crypto';
import { Partner } from '../entities/partner.entity';
import { PartnerStatus } from '../enums/partner-status.enum';
import { PartnerInvitation } from '../entities/partner-invitation.entity';
import { UserProfile } from '../../auth/entities/user-profile.entity';
import { EmailService } from '../../notification/services/email.service';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../../supabase/supabase.service';
import { UserRole } from '../../auth/enums/user-role.enum';
import {
  RegisterWithInvitationDto,
  InvitationRegisterResponseDto,
} from '../dto/register-with-invitation.dto';
import { ResourceNotFoundException } from '../../../common/exceptions/resource-not-found.exception';
import { BusinessException, ConflictException as CustomConflictException } from '../../../common/exceptions/business.exception';

@Injectable()
export class PartnerInvitationService {
  private readonly logger = new Logger(PartnerInvitationService.name);
  private readonly INVITATION_VALIDITY_HOURS = 72; // 3 days
  private readonly frontendUrl: string;

  constructor(
    @InjectRepository(PartnerInvitation)
    private invitationRepository: Repository<PartnerInvitation>,
    @InjectRepository(Partner)
    private partnerRepository: Repository<Partner>,
    @InjectRepository(UserProfile)
    private userProfileRepository: Repository<UserProfile>,
    private emailService: EmailService,
    private configService: ConfigService,
    private supabaseService: SupabaseService,
  ) {
    this.frontendUrl =
      this.configService.get<string>('app.frontendUrl') ||
      'https://partner-hub-frontend.onrender.com';
  }

  /**
   * Generate a secure random token
   */
  private generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Create and send an invitation to a partner
   */
  async sendInvitation(partnerId: string, invitedById?: string): Promise<PartnerInvitation> {
    // Find the partner
    const partner = await this.partnerRepository.findOne({
      where: { id: partnerId },
    });
    if (!partner) {
      throw ResourceNotFoundException.forPartner(partnerId);
    }

    // Check if partner already has a linked user
    if (partner.userId) {
      throw new CustomConflictException('PARTNER_006', {
        message: 'このパートナーは既にユーザーアカウントに紐付けられています',
        userMessage: 'このパートナーは既にユーザーアカウントに紐付けられています',
      });
    }

    // Invalidate any existing pending invitations
    await this.invitationRepository.update(
      {
        partnerId,
        usedAt: IsNull(),
      },
      {
        usedAt: new Date(), // Mark as used to invalidate
      },
    );

    // Create new invitation
    const token = this.generateToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.INVITATION_VALIDITY_HOURS);

    const invitation = this.invitationRepository.create({
      partnerId,
      token,
      email: partner.email,
      expiresAt,
      createdById: invitedById,
    });

    await this.invitationRepository.save(invitation);
    this.logger.log(`Invitation created for partner: ${partner.email}`);

    // Get inviter name if available
    let invitedByName: string | undefined;
    if (invitedById) {
      const inviter = await this.userProfileRepository.findOne({
        where: { id: invitedById },
      });
      invitedByName = inviter?.fullName || inviter?.email;
    }

    // Send invitation email - directs to register page with invitation token
    const invitationUrl = `${this.frontendUrl}/register?invitation=${token}`;
    await this.emailService.sendPartnerInvitationEmail(
      partner,
      invitationUrl,
      expiresAt,
      invitedByName,
    );

    return invitation;
  }

  /**
   * Verify an invitation token and return the associated partner
   */
  async verifyToken(token: string): Promise<{ invitation: PartnerInvitation; partner: Partner }> {
    const invitation = await this.invitationRepository.findOne({
      where: { token },
      relations: ['partner'],
    });

    if (!invitation) {
      throw new ResourceNotFoundException('PARTNER_001', {
        resourceType: 'Invitation',
        resourceId: token,
        userMessage: '無効な招待トークンです',
      });
    }

    if (invitation.usedAt) {
      throw new BusinessException('PARTNER_007', {
        message: 'この招待は既に使用されています',
        userMessage: 'この招待は既に使用されています',
      });
    }

    if (new Date() > invitation.expiresAt) {
      throw new BusinessException('PARTNER_007', {
        message: 'この招待は期限切れです',
        userMessage: 'この招待は有効期限が切れています',
      });
    }

    return { invitation, partner: invitation.partner };
  }

  /**
   * Accept an invitation and link the partner to a user
   */
  async acceptInvitation(token: string, userId: string): Promise<Partner> {
    const { invitation, partner } = await this.verifyToken(token);

    // Verify the user exists
    const user = await this.userProfileRepository.findOne({
      where: { id: userId },
    });
    if (!user) {
      throw ResourceNotFoundException.forUser(userId);
    }

    // Check if user email matches partner email (security check)
    if (user.email.toLowerCase() !== partner.email.toLowerCase()) {
      throw new BusinessException('VALIDATION_001', {
        message: 'ユーザーのメールアドレスがパートナーのメールアドレスと一致しません',
        userMessage: 'ユーザーのメールアドレスが招待先のパートナーと一致しません',
      });
    }

    // Check if partner already has a linked user
    if (partner.userId) {
      throw new CustomConflictException('PARTNER_006', {
        message: 'このパートナーは既にユーザーアカウントに紐付けられています',
        userMessage: 'このパートナーは既にユーザーアカウントに紐付けられています',
      });
    }

    // Link partner to user and activate
    partner.userId = userId;
    partner.status = PartnerStatus.ACTIVE; // 招待経由のリンクでアクティブに
    await this.partnerRepository.save(partner);

    // Mark invitation as used
    invitation.usedAt = new Date();
    await this.invitationRepository.save(invitation);

    this.logger.log(`Partner ${partner.email} linked to user ${userId} and activated`);

    return partner;
  }

  /**
   * Check if a user has a pending invitation (for auto-linking on login)
   */
  async checkPendingInvitation(email: string): Promise<PartnerInvitation | null> {
    const invitation = await this.invitationRepository.findOne({
      where: {
        email: email.toLowerCase(),
        usedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
      relations: ['partner'],
      order: { createdAt: 'DESC' },
    });

    return invitation;
  }

  /**
   * Auto-link user to partner if they have a pending invitation
   * Called during user login/registration
   */
  async autoLinkOnLogin(userId: string, email: string): Promise<Partner | null> {
    // First check if there's a partner with matching email that's not linked
    const partner = await this.partnerRepository.findOne({
      where: {
        email: email.toLowerCase(),
        userId: IsNull(),
      },
    });

    if (!partner) {
      return null;
    }

    // Check if there's a valid pending invitation
    const invitation = await this.checkPendingInvitation(email);
    if (!invitation) {
      // No invitation required - auto-link based on email match
      // This is a policy decision - you might want to require invitation
      return null;
    }

    // Link the partner and activate
    partner.userId = userId;
    partner.status = PartnerStatus.ACTIVE; // 自動リンク時にアクティブに
    await this.partnerRepository.save(partner);

    // Mark invitation as used
    invitation.usedAt = new Date();
    await this.invitationRepository.save(invitation);

    this.logger.log(`Auto-linked partner ${email} to user ${userId} on login and activated`);

    return partner;
  }

  /**
   * Resend invitation to a partner
   */
  async resendInvitation(partnerId: string, invitedById?: string): Promise<PartnerInvitation> {
    return this.sendInvitation(partnerId, invitedById);
  }

  /**
   * Get pending invitations for a partner
   */
  async getPendingInvitations(partnerId: string): Promise<PartnerInvitation[]> {
    return this.invitationRepository.find({
      where: {
        partnerId,
        usedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Register a new user via invitation and link to partner
   * Uses Supabase Admin API to create user with email_confirm: true (skips email verification)
   */
  async registerWithInvitation(
    dto: RegisterWithInvitationDto,
  ): Promise<InvitationRegisterResponseDto> {
    // 1. Verify the invitation token
    const { invitation, partner } = await this.verifyToken(dto.token);

    // 2. Check if partner already has a linked user
    if (partner.userId) {
      throw new CustomConflictException('PARTNER_006', {
        message: 'このパートナーは既にユーザーアカウントに紐付けられています',
        userMessage: 'このパートナーは既にユーザーアカウントに紐付けられています',
      });
    }

    // 3. 入力値のサニタイズ
    const sanitizedFirstName = dto.firstName.trim();
    const sanitizedLastName = dto.lastName.trim();

    // 4. Check if Supabase Admin is available
    const supabaseAdmin = this.supabaseService.admin;
    if (!supabaseAdmin) {
      throw new InternalServerErrorException(
        '認証システムの設定が完了していません。管理者にお問い合わせください。',
      );
    }

    // 5. Create user in Supabase with email_confirm: true (skip email verification)
    // Note: Do NOT store invitation_token in user_metadata (security risk - visible in JWT)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: partner.email,
      password: dto.password,
      email_confirm: true, // Skip email verification for invited users
      user_metadata: {
        first_name: sanitizedFirstName,
        last_name: sanitizedLastName,
        partner_id: partner.id,
        registered_via: 'invitation',
      },
    });

    if (authError) {
      this.logger.error(`Supabase user creation failed: ${authError.message}`);
      if (authError.message.includes('already registered')) {
        throw new CustomConflictException('USER_002', {
          message: 'このメールアドレスは既に登録されています',
          userMessage: 'このメールアドレスは既に登録されています。ログインしてください。',
        });
      }
      // 内部エラーメッセージをユーザーに露出しない
      throw new BusinessException('USER_004', {
        message: 'ユーザーの作成に失敗しました',
        userMessage: 'ユーザー作成に失敗しました。入力内容を確認して再度お試しください。',
      });
    }

    const supabaseUser = authData.user;
    if (!supabaseUser) {
      throw new InternalServerErrorException('認証システムでのユーザー作成に失敗しました');
    }

    try {
      // 6. Create user profile in our database
      const userProfile = this.userProfileRepository.create({
        id: supabaseUser.id,
        email: partner.email.toLowerCase(),
        firstName: sanitizedFirstName,
        lastName: sanitizedLastName,
        role: UserRole.PARTNER,
        isActive: true,
        organizationId: partner.organizationId, // パートナーの組織IDを継承
      });
      await this.userProfileRepository.save(userProfile);

      // 7. Link partner to user and activate
      partner.userId = supabaseUser.id;
      partner.status = PartnerStatus.ACTIVE; // 招待経由の登録完了でアクティブに
      await this.partnerRepository.save(partner);

      // 8. Mark invitation as used
      invitation.usedAt = new Date();
      await this.invitationRepository.save(invitation);

      this.logger.log(
        `Partner ${partner.email} registered and linked to user ${supabaseUser.id} via invitation`,
      );

      // 9. Sign in the user to get a session
      const supabaseClient = this.supabaseService.client;
      const { data: sessionData, error: sessionError } =
        await supabaseClient.auth.signInWithPassword({
          email: partner.email,
          password: dto.password,
        });

      if (sessionError || !sessionData.session) {
        this.logger.warn(`Session creation failed: ${sessionError?.message}`);
        // Return response without session - user can login manually
        return {
          message: '登録が完了しました。ログインしてください。',
          user: {
            id: supabaseUser.id,
            email: partner.email,
            firstName: sanitizedFirstName,
            lastName: sanitizedLastName,
          },
          partner: {
            id: partner.id,
            name: partner.name,
            email: partner.email,
          },
          session: undefined,
        };
      }

      return {
        message: '登録が完了しました',
        user: {
          id: supabaseUser.id,
          email: partner.email,
          firstName: sanitizedFirstName,
          lastName: sanitizedLastName,
        },
        partner: {
          id: partner.id,
          name: partner.name,
          email: partner.email,
        },
        session: {
          accessToken: sessionData.session.access_token,
          refreshToken: sessionData.session.refresh_token,
          expiresIn: sessionData.session.expires_in ?? 3600,
          expiresAt: sessionData.session.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
        },
      };
    } catch (error) {
      // Rollback: delete the Supabase user if profile/partner linking fails
      this.logger.error(`Registration failed, rolling back: ${error.message}`);
      try {
        await supabaseAdmin.auth.admin.deleteUser(supabaseUser.id);
      } catch (rollbackError) {
        this.logger.error(`Rollback failed: ${rollbackError.message}`);
      }
      throw error;
    }
  }
}
