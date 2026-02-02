import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { PartnerReportToken } from '../entities/partner-report-token.entity';
import { Partner } from '../../partner/entities/partner.entity';

@Injectable()
export class PartnerReportTokenService {
  private readonly logger = new Logger(PartnerReportTokenService.name);

  constructor(
    @InjectRepository(PartnerReportToken)
    private tokenRepository: Repository<PartnerReportToken>,
    @InjectRepository(Partner)
    private partnerRepository: Repository<Partner>,
  ) {}

  /**
   * 報告用トークンを生成
   */
  async generateToken(
    partnerId: string,
    projectId?: string,
    expiresInDays?: number,
  ): Promise<PartnerReportToken> {
    const partner = await this.partnerRepository.findOne({
      where: { id: partnerId },
    });

    if (!partner) {
      throw new NotFoundException('パートナーが見つかりません');
    }

    // 既存のアクティブなトークンをチェック
    const queryBuilder = this.tokenRepository
      .createQueryBuilder('token')
      .where('token.partner_id = :partnerId', { partnerId })
      .andWhere('token.is_active = :isActive', { isActive: true });

    if (projectId) {
      queryBuilder.andWhere('token.project_id = :projectId', { projectId });
    } else {
      queryBuilder.andWhere('token.project_id IS NULL');
    }

    const existingToken = await queryBuilder.getOne();

    if (existingToken) {
      this.logger.log(`既存のトークンを返却: ${partnerId}`);
      return existingToken;
    }

    // 新しいトークンを生成
    const token = randomBytes(32).toString('hex');
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const reportToken = this.tokenRepository.create({
      partnerId,
      projectId: projectId || null,
      token,
      expiresAt,
      organizationId: partner.organizationId,
    });

    await this.tokenRepository.save(reportToken);

    this.logger.log(`報告用トークン生成: パートナー=${partnerId}`);

    return reportToken;
  }

  /**
   * パートナーの報告用トークンを取得
   */
  async getTokenByPartnerId(partnerId: string): Promise<PartnerReportToken | null> {
    return this.tokenRepository.findOne({
      where: { partnerId, isActive: true },
      relations: ['partner', 'project'],
    });
  }

  /**
   * トークン文字列からトークン情報を取得
   */
  async getByToken(token: string): Promise<PartnerReportToken | null> {
    return this.tokenRepository.findOne({
      where: { token },
      relations: ['partner', 'project'],
    });
  }

  /**
   * トークンを無効化
   */
  async deactivateToken(partnerId: string, tokenId?: string): Promise<void> {
    const whereCondition: any = { partnerId };
    if (tokenId) {
      whereCondition.id = tokenId;
    }

    const result = await this.tokenRepository.update(whereCondition, {
      isActive: false,
    });

    if (result.affected === 0) {
      throw new NotFoundException('トークンが見つかりません');
    }

    this.logger.log(`トークン無効化: パートナー=${partnerId}`);
  }

  /**
   * トークンを再生成（既存のものを無効化して新規作成）
   */
  async regenerateToken(
    partnerId: string,
    projectId?: string,
    expiresInDays?: number,
  ): Promise<PartnerReportToken> {
    // 既存のトークンを無効化
    const updateBuilder = this.tokenRepository
      .createQueryBuilder()
      .update()
      .set({ isActive: false })
      .where('partner_id = :partnerId', { partnerId });

    if (projectId) {
      updateBuilder.andWhere('project_id = :projectId', { projectId });
    } else {
      updateBuilder.andWhere('project_id IS NULL');
    }

    await updateBuilder.execute();

    // 新規トークンを生成
    const partner = await this.partnerRepository.findOne({
      where: { id: partnerId },
    });

    if (!partner) {
      throw new NotFoundException('パートナーが見つかりません');
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const reportToken = this.tokenRepository.create({
      partnerId,
      projectId: projectId || null,
      token,
      expiresAt,
      organizationId: partner.organizationId,
    });

    await this.tokenRepository.save(reportToken);

    this.logger.log(`報告用トークン再生成: パートナー=${partnerId}`);

    return reportToken;
  }

  /**
   * 報告用URLを生成
   */
  getReportUrl(token: string, baseUrl: string): string {
    return `${baseUrl}/report/${token}`;
  }
}
