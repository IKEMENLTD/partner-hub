import {
  Injectable,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ResourceNotFoundException } from '../../common/exceptions/resource-not-found.exception';
import { ConflictException as CustomConflictException } from '../../common/exceptions/business.exception';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { Partner } from './entities/partner.entity';
import { Project } from '../project/entities/project.entity';
import { CreatePartnerDto, UpdatePartnerDto, QueryPartnerDto } from './dto';
import { PaginatedResponseDto } from '../../common/dto/pagination.dto';
import { PartnerStatus } from './enums/partner-status.enum';
import { EmailService } from '../notification/services/email.service';
import { PartnerInvitationService } from './services/partner-invitation.service';
import { PartnerReportTokenService } from '../partner-report/services/partner-report-token.service';
import { UserProfile } from '../auth/entities/user-profile.entity';
import { UserRole } from '../auth/enums/user-role.enum';
import { ConfigService } from '@nestjs/config';

// SECURITY FIX: Whitelist of allowed sort columns to prevent SQL injection
const ALLOWED_SORT_COLUMNS = [
  'createdAt',
  'updatedAt',
  'name',
  'email',
  'status',
  'type',
  'rating',
  'totalProjects',
  'completedProjects',
  'country',
  'companyName',
];

@Injectable()
export class PartnerService {
  private readonly logger = new Logger(PartnerService.name);

  constructor(
    @InjectRepository(Partner)
    private partnerRepository: Repository<Partner>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(UserProfile)
    private userProfileRepository: Repository<UserProfile>,
    private emailService: EmailService,
    @Inject(forwardRef(() => PartnerInvitationService))
    private partnerInvitationService: PartnerInvitationService,
    @Inject(forwardRef(() => PartnerReportTokenService))
    private partnerReportTokenService: PartnerReportTokenService,
    private configService: ConfigService,
  ) {}

  async create(createPartnerDto: CreatePartnerDto, createdById: string): Promise<Partner> {
    // Check if partner with email already exists
    const existingPartner = await this.partnerRepository.findOne({
      where: { email: createPartnerDto.email },
    });
    if (existingPartner) {
      throw new CustomConflictException('PARTNER_005', {
        message: 'このメールアドレスのパートナーは既に存在します',
        userMessage: 'このメールアドレスのパートナーは既に登録されています',
      });
    }

    // Get creator's organization
    const creator = await this.userProfileRepository.findOne({
      where: { id: createdById },
    });
    const organizationId = creator?.organizationId;

    const { sendInvitation = false, ...partnerData } = createPartnerDto;

    const partner = this.partnerRepository.create({
      ...partnerData,
      createdById,
      organizationId,
    });

    await this.partnerRepository.save(partner);
    this.logger.log(`Partner created: ${partner.name} (${partner.id})`);

    // 報告用トークンを生成し、報告用URLメールを送信（デフォルト動作）
    // sendInvitation=true の場合はログイン招待（複数案件を持つパートナー向け）
    if (sendInvitation) {
      // ログイン招待メール（マジックリンク）を送信
      // これは案件が複数になった場合など、明示的にログインが必要な場合のみ
      partner.loginEnabled = true;
      await this.partnerRepository.save(partner);
      this.partnerInvitationService.sendInvitation(partner.id, createdById).catch((error) => {
        this.logger.error(`Failed to send login invitation to ${partner.email}`, error);
      });
    } else {
      // 報告用トークンを生成してメール送信（ログイン不要）
      this.generateReportTokenAndSendEmail(partner).catch((error) => {
        this.logger.error(`Failed to send report URL email to ${partner.email}`, error);
      });
    }

    return partner;
  }

  /**
   * 報告用トークンを生成し、報告用URLメールを送信
   */
  private async generateReportTokenAndSendEmail(partner: Partner): Promise<void> {
    try {
      // 報告用トークンを生成
      const token = await this.partnerReportTokenService.generateToken(partner.id);
      const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
      const reportUrl = `${frontendUrl}/report/${token.token}`;

      // パートナーのステータスをアクティブに
      partner.status = PartnerStatus.ACTIVE;
      await this.partnerRepository.save(partner);

      // 報告用URLメールを送信
      await this.emailService.sendReportUrlEmail(partner, reportUrl);

      this.logger.log(`Report URL email sent to ${partner.email}`);
    } catch (error) {
      this.logger.error(`Failed to generate report token for ${partner.email}`, error);
      throw error;
    }
  }

  async findAll(
    queryDto: QueryPartnerDto,
    userId?: string,
  ): Promise<PaginatedResponseDto<Partner>> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      status,
      type,
      search,
      skills,
      country,
    } = queryDto;

    const queryBuilder = this.partnerRepository.createQueryBuilder('partner');

    // Multi-tenancy: Filter by organization
    if (userId) {
      const user = await this.userProfileRepository.findOne({ where: { id: userId } });

      if (user?.organizationId) {
        // 組織に所属している場合、同じ組織のパートナーのみ表示
        queryBuilder.andWhere('partner.organization_id = :orgId', { orgId: user.organizationId });
      } else if (user?.role === UserRole.ADMIN) {
        // 管理者で組織未設定の場合は全件表示（システム管理者向け）
        // フィルターなし
      } else {
        // 組織に所属していない一般ユーザーは、自分に紐付いたパートナーのみ表示
        const linkedPartner = await this.partnerRepository.findOne({ where: { userId } });
        if (linkedPartner) {
          queryBuilder.andWhere('partner.id = :linkedPartnerId', {
            linkedPartnerId: linkedPartner.id,
          });
        } else {
          // 紐付けもない場合は結果なし
          queryBuilder.andWhere('1 = 0');
        }
      }
    }

    // Apply filters
    if (status) {
      queryBuilder.andWhere('partner.status = :status', { status });
    }

    if (type) {
      queryBuilder.andWhere('partner.type = :type', { type });
    }

    if (search) {
      queryBuilder.andWhere(
        '(partner.name ILIKE :search OR partner.email ILIKE :search OR partner.companyName ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (country) {
      queryBuilder.andWhere('partner.country = :country', { country });
    }

    if (skills && skills.length > 0) {
      // PostgreSQL array overlap check
      queryBuilder.andWhere('partner.skills && :skills', {
        skills: skills,
      });
    }

    // SECURITY FIX: Validate sortBy against whitelist to prevent SQL injection
    const safeSortBy = ALLOWED_SORT_COLUMNS.includes(sortBy) ? sortBy : 'createdAt';
    queryBuilder.orderBy(`partner.${safeSortBy}`, sortOrder);

    // Apply pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return new PaginatedResponseDto(data, total, page, limit);
  }

  async findOne(id: string): Promise<Partner> {
    const partner = await this.partnerRepository.findOne({
      where: { id },
      relations: ['user', 'createdBy'],
    });

    if (!partner) {
      throw ResourceNotFoundException.forPartner(id);
    }

    return partner;
  }

  async findByEmail(email: string): Promise<Partner | null> {
    return this.partnerRepository.findOne({ where: { email } });
  }

  async update(id: string, updatePartnerDto: UpdatePartnerDto): Promise<Partner> {
    const partner = await this.findOne(id);

    // Check email uniqueness if changing email
    if (updatePartnerDto.email && updatePartnerDto.email !== partner.email) {
      const existingPartner = await this.partnerRepository.findOne({
        where: { email: updatePartnerDto.email },
      });
      if (existingPartner) {
        throw new CustomConflictException('PARTNER_005', {
          message: 'このメールアドレスのパートナーは既に存在します',
          userMessage: 'このメールアドレスのパートナーは既に登録されています',
        });
      }
    }

    Object.assign(partner, updatePartnerDto);
    await this.partnerRepository.save(partner);

    this.logger.log(`Partner updated: ${partner.name} (${partner.id})`);

    return partner;
  }

  async updateStatus(id: string, status: PartnerStatus): Promise<Partner> {
    const partner = await this.findOne(id);
    partner.status = status;
    await this.partnerRepository.save(partner);

    this.logger.log(`Partner status updated: ${partner.name} -> ${status}`);

    return partner;
  }

  async updateRating(id: string, rating: number): Promise<Partner> {
    const partner = await this.findOne(id);
    partner.rating = rating;
    await this.partnerRepository.save(partner);

    this.logger.log(`Partner rating updated: ${partner.name} -> ${rating}`);

    return partner;
  }

  async incrementProjectCount(id: string, completed: boolean = false): Promise<void> {
    const partner = await this.findOne(id);
    partner.totalProjects += 1;
    if (completed) {
      partner.completedProjects += 1;
    }
    await this.partnerRepository.save(partner);
  }

  async remove(id: string): Promise<void> {
    const partner = await this.findOne(id);
    // Use soft delete instead of hard delete
    await this.partnerRepository.softRemove(partner);
    this.logger.log(`Partner soft deleted: ${partner.name} (${id})`);
  }

  /**
   * Permanently delete a partner (admin only)
   */
  async forceRemove(id: string): Promise<void> {
    const partner = await this.partnerRepository.findOne({
      where: { id },
      withDeleted: true,
    });
    if (!partner) {
      throw ResourceNotFoundException.forPartner(id);
    }
    await this.partnerRepository.remove(partner);
    this.logger.log(`Partner permanently deleted: ${partner.name} (${id})`);
  }

  async getActivePartners(): Promise<Partner[]> {
    return this.partnerRepository.find({
      where: { status: PartnerStatus.ACTIVE },
    });
  }

  async getPartnersBySkills(skills: string[]): Promise<Partner[]> {
    return this.partnerRepository
      .createQueryBuilder('partner')
      .where('partner.status = :status', { status: PartnerStatus.ACTIVE })
      .andWhere('partner.skills && :skills', { skills })
      .orderBy('partner.rating', 'DESC')
      .getMany();
  }

  async getPartnerStatistics(): Promise<{
    total: number;
    active: number;
    inactive: number;
    pending: number;
    averageRating: number;
  }> {
    const [total, active, inactive, pending] = await Promise.all([
      this.partnerRepository.count(),
      this.partnerRepository.count({ where: { status: PartnerStatus.ACTIVE } }),
      this.partnerRepository.count({ where: { status: PartnerStatus.INACTIVE } }),
      this.partnerRepository.count({ where: { status: PartnerStatus.PENDING } }),
    ]);

    const avgResult = await this.partnerRepository
      .createQueryBuilder('partner')
      .select('AVG(partner.rating)', 'avg')
      .where('partner.rating > 0')
      .getRawOne();

    return {
      total,
      active,
      inactive,
      pending,
      averageRating: parseFloat(avgResult?.avg || '0'),
    };
  }

  async getProjectsByPartner(partnerId: string): Promise<Project[]> {
    // Verify partner exists
    await this.findOne(partnerId);

    return this.projectRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.partners', 'partners')
      .leftJoinAndSelect('project.owner', 'owner')
      .leftJoinAndSelect('project.manager', 'manager')
      .where('partners.id = :partnerId', { partnerId })
      .orderBy('project.createdAt', 'DESC')
      .getMany();
  }
}
