import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { Partner } from '../entities/partner.entity';
import { EmailService } from '../../notification/services/email.service';
import {
  PartnerContactSetupDto,
  PartnerContactSetupResponseDto,
  PartnerContactSetupTokenInfoDto,
} from '../dto/partner-contact-setup.dto';
import { PreferredChannel } from '../enums/preferred-channel.enum';
import { ResourceNotFoundException } from '../../../common/exceptions/resource-not-found.exception';
import { BusinessException } from '../../../common/exceptions/business.exception';

@Injectable()
export class PartnerContactSetupService {
  private readonly logger = new Logger(PartnerContactSetupService.name);
  private readonly TOKEN_VALIDITY_HOURS = 168; // 7日間有効
  private readonly frontendUrl: string;

  constructor(
    @InjectRepository(Partner)
    private partnerRepository: Repository<Partner>,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {
    this.frontendUrl =
      this.configService.get<string>('app.frontendUrl') ||
      'https://partner-hub-frontend.onrender.com';
  }

  /**
   * セットアップトークンを生成
   */
  private generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * パートナーに初回セットアップメールを送信
   */
  async sendContactSetupEmail(partnerId: string): Promise<void> {
    const partner = await this.partnerRepository.findOne({
      where: { id: partnerId },
    });

    if (!partner) {
      throw ResourceNotFoundException.forPartner(partnerId);
    }

    // 既にセットアップ済みの場合はリセット（管理者が再送信を要求した場合）
    if (partner.contactSetupCompleted) {
      this.logger.log(`Partner ${partner.email} already completed contact setup, resetting for re-setup`);
      partner.contactSetupCompleted = false;
    }

    // トークン生成と有効期限設定
    const token = this.generateToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.TOKEN_VALIDITY_HOURS);

    // パートナーにトークンを保存
    partner.contactSetupToken = token;
    partner.contactSetupTokenExpiresAt = expiresAt;
    await this.partnerRepository.save(partner);

    // セットアップURLを生成
    const setupUrl = `${this.frontendUrl}/partner-setup/${token}`;

    // メール送信（非同期 — レスポンスをブロックしない）
    this.emailService.sendContactSetupEmail(partner, setupUrl, expiresAt).catch((err) => {
      this.logger.error(`Failed to send contact setup email to ${partner.email}`, err);
    });

    this.logger.log(`Contact setup email queued for partner: ${partner.email}`);
  }

  /**
   * トークンを検証してパートナー情報を返す
   */
  async verifySetupToken(token: string): Promise<PartnerContactSetupTokenInfoDto> {
    const partner = await this.partnerRepository.findOne({
      where: { contactSetupToken: token },
    });

    if (!partner) {
      return {
        valid: false,
        message: '無効なトークンです',
      };
    }

    if (partner.contactSetupCompleted) {
      return {
        valid: false,
        message: '連絡先の設定は既に完了しています',
      };
    }

    if (!partner.contactSetupTokenExpiresAt || new Date() > partner.contactSetupTokenExpiresAt) {
      return {
        valid: false,
        message: 'トークンの有効期限が切れています。担当者に再送信を依頼してください。',
      };
    }

    return {
      valid: true,
      partner: {
        id: partner.id,
        name: partner.name,
        email: partner.email,
        companyName: partner.companyName,
      },
      expiresAt: partner.contactSetupTokenExpiresAt,
    };
  }

  /**
   * パートナーの連絡先設定を完了
   */
  async completeContactSetup(
    token: string,
    dto: PartnerContactSetupDto,
  ): Promise<PartnerContactSetupResponseDto> {
    // トークン検証
    const tokenInfo = await this.verifySetupToken(token);
    if (!tokenInfo.valid) {
      throw new BusinessException('PARTNER_007', {
        message: '無効なセットアップトークンです',
        userMessage: tokenInfo.message,
      });
    }

    const partner = await this.partnerRepository.findOne({
      where: { contactSetupToken: token },
    });

    if (!partner) {
      throw ResourceNotFoundException.forPartner(token);
    }

    // 連絡先設定を更新
    partner.preferredChannel = dto.preferredChannel;
    partner.smsPhoneNumber = dto.smsPhoneNumber;
    partner.contactSetupCompleted = true;
    // トークンは使用済みにするため削除
    partner.contactSetupToken = null;
    partner.contactSetupTokenExpiresAt = null;

    await this.partnerRepository.save(partner);

    this.logger.log(
      `Partner ${partner.email} completed contact setup: channel=${dto.preferredChannel}`,
    );

    return {
      success: true,
      message: '連絡先の設定が完了しました',
      partner: {
        id: partner.id,
        name: partner.name,
        email: partner.email,
        preferredChannel: partner.preferredChannel,
      },
    };
  }

  /**
   * セットアップメールを再送信
   */
  async resendSetupEmail(partnerId: string): Promise<void> {
    return this.sendContactSetupEmail(partnerId);
  }

  /**
   * パートナーの連絡先設定状況を取得
   */
  async getContactSetupStatus(partnerId: string): Promise<{
    completed: boolean;
    preferredChannel: PreferredChannel;
    hasLineId: boolean;
    hasSmsNumber: boolean;
  }> {
    const partner = await this.partnerRepository.findOne({
      where: { id: partnerId },
    });

    if (!partner) {
      throw ResourceNotFoundException.forPartner(partnerId);
    }

    return {
      completed: partner.contactSetupCompleted,
      preferredChannel: partner.preferredChannel,
      hasLineId: !!partner.lineUserId,
      hasSmsNumber: !!partner.smsPhoneNumber,
    };
  }
}
