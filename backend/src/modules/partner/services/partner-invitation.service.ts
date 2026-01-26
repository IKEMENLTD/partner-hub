import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, MoreThan } from 'typeorm';
import { randomBytes } from 'crypto';
import { Partner } from '../entities/partner.entity';
import { PartnerInvitation } from '../entities/partner-invitation.entity';
import { UserProfile } from '../../auth/entities/user-profile.entity';
import { EmailService } from '../../notification/services/email.service';
import { ConfigService } from '@nestjs/config';

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
  ) {
    this.frontendUrl = this.configService.get<string>('app.frontendUrl') || 'https://partner-hub-frontend.onrender.com';
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
  async sendInvitation(
    partnerId: string,
    invitedById?: string,
  ): Promise<PartnerInvitation> {
    // Find the partner
    const partner = await this.partnerRepository.findOne({
      where: { id: partnerId },
    });
    if (!partner) {
      throw new NotFoundException(`Partner with ID "${partnerId}" not found`);
    }

    // Check if partner already has a linked user
    if (partner.userId) {
      throw new ConflictException('Partner already has a linked user account');
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
      throw new NotFoundException('Invalid invitation token');
    }

    if (invitation.usedAt) {
      throw new BadRequestException('This invitation has already been used');
    }

    if (new Date() > invitation.expiresAt) {
      throw new BadRequestException('This invitation has expired');
    }

    return { invitation, partner: invitation.partner };
  }

  /**
   * Accept an invitation and link the partner to a user
   */
  async acceptInvitation(
    token: string,
    userId: string,
  ): Promise<Partner> {
    const { invitation, partner } = await this.verifyToken(token);

    // Verify the user exists
    const user = await this.userProfileRepository.findOne({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user email matches partner email (security check)
    if (user.email.toLowerCase() !== partner.email.toLowerCase()) {
      throw new BadRequestException(
        'User email does not match the invited partner email',
      );
    }

    // Check if partner already has a linked user
    if (partner.userId) {
      throw new ConflictException('Partner already has a linked user account');
    }

    // Link partner to user
    partner.userId = userId;
    await this.partnerRepository.save(partner);

    // Mark invitation as used
    invitation.usedAt = new Date();
    await this.invitationRepository.save(invitation);

    this.logger.log(`Partner ${partner.email} linked to user ${userId}`);

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

    // Link the partner
    partner.userId = userId;
    await this.partnerRepository.save(partner);

    // Mark invitation as used
    invitation.usedAt = new Date();
    await this.invitationRepository.save(invitation);

    this.logger.log(`Auto-linked partner ${email} to user ${userId} on login`);

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
}
