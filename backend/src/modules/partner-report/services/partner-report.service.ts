import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { PartnerReport, ReportSource } from '../entities/partner-report.entity';
import { ReportRequest, RequestStatus } from '../entities/report-request.entity';
import { CreateReportDto, QueryReportDto } from '../dto';
import { PaginatedResponseDto } from '../../../common/dto/pagination.dto';
import { UserProfile } from '../../auth/entities/user-profile.entity';

@Injectable()
export class PartnerReportService {
  private readonly logger = new Logger(PartnerReportService.name);

  constructor(
    @InjectRepository(PartnerReport)
    private reportRepository: Repository<PartnerReport>,
    @InjectRepository(UserProfile)
    private userProfileRepository: Repository<UserProfile>,
    @InjectRepository(ReportRequest)
    private requestRepository: Repository<ReportRequest>,
  ) {}

  /**
   * 報告を作成（パートナーからの報告）
   */
  async createFromPartner(
    partnerId: string,
    organizationId: string | null,
    dto: CreateReportDto,
    source: ReportSource = ReportSource.WEB_FORM,
    sourceReference?: string,
  ): Promise<PartnerReport> {
    // コンテンツの構築: クイック報告の場合はweeklyAccomplishmentsをcontentにも設定
    let content = dto.content || null;
    if (!content && dto.weeklyAccomplishments) {
      content = dto.weeklyAccomplishments;
    }

    const report = this.reportRepository.create({
      partnerId,
      organizationId,
      projectId: dto.projectId || null,
      taskId: dto.taskId || null,
      reportType: dto.reportType,
      progressStatus: dto.progressStatus || null,
      content,
      weeklyAccomplishments: dto.weeklyAccomplishments || null,
      nextWeekPlan: dto.nextWeekPlan || null,
      attachments: dto.attachments || [],
      metadata: dto.metadata || {},
      source,
      sourceReference: sourceReference || null,
    });

    await this.reportRepository.save(report);

    // Mark any pending or overdue report requests as submitted
    await this.markPendingRequestsAsSubmitted(partnerId, report.id);

    this.logger.log(
      `パートナー報告作成: パートナー=${partnerId}, 種別=${dto.reportType}, ステータス=${dto.progressStatus || 'なし'}`,
    );

    return report;
  }

  /**
   * Mark pending/overdue report requests as submitted
   */
  private async markPendingRequestsAsSubmitted(
    partnerId: string,
    reportId: string,
  ): Promise<void> {
    // Find pending request
    const pendingRequest = await this.requestRepository.findOne({
      where: {
        partnerId,
        status: RequestStatus.PENDING,
      },
      order: { createdAt: 'DESC' },
    });

    if (pendingRequest) {
      pendingRequest.status = RequestStatus.SUBMITTED;
      pendingRequest.reportId = reportId;
      await this.requestRepository.save(pendingRequest);
      this.logger.log(`Report request ${pendingRequest.id} marked as submitted`);
    }

    // Also check for overdue requests
    const overdueRequest = await this.requestRepository.findOne({
      where: {
        partnerId,
        status: RequestStatus.OVERDUE,
      },
      order: { createdAt: 'DESC' },
    });

    if (overdueRequest) {
      overdueRequest.status = RequestStatus.SUBMITTED;
      overdueRequest.reportId = reportId;
      await this.requestRepository.save(overdueRequest);
      this.logger.log(`Overdue request ${overdueRequest.id} marked as submitted`);
    }
  }

  /**
   * 報告一覧を取得（管理者用、組織フィルター付き）
   */
  async findAll(
    queryDto: QueryReportDto,
    userId?: string,
  ): Promise<PaginatedResponseDto<PartnerReport>> {
    const {
      page = 1,
      limit = 20,
      partnerId,
      projectId,
      reportType,
      source,
      unreadOnly,
    } = queryDto;

    const queryBuilder = this.reportRepository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.partner', 'partner')
      .leftJoinAndSelect('report.project', 'project');

    // 組織フィルター
    if (userId) {
      const user = await this.userProfileRepository.findOne({
        where: { id: userId },
      });
      if (user?.organizationId) {
        queryBuilder.andWhere('report.organization_id = :orgId', {
          orgId: user.organizationId,
        });
      }
    }

    // フィルター適用
    if (partnerId) {
      queryBuilder.andWhere('report.partner_id = :partnerId', { partnerId });
    }

    if (projectId) {
      queryBuilder.andWhere('report.project_id = :projectId', { projectId });
    }

    if (reportType) {
      queryBuilder.andWhere('report.report_type = :reportType', { reportType });
    }

    if (source) {
      queryBuilder.andWhere('report.source = :source', { source });
    }

    if (unreadOnly) {
      queryBuilder.andWhere('report.is_read = false');
    }

    // ソート
    queryBuilder.orderBy('report.created_at', 'DESC');

    // ページネーション
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return new PaginatedResponseDto(data, total, page, limit);
  }

  /**
   * 報告詳細を取得
   */
  async findOne(id: string, userId?: string): Promise<PartnerReport> {
    const queryBuilder = this.reportRepository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.partner', 'partner')
      .leftJoinAndSelect('report.project', 'project')
      .where('report.id = :id', { id });

    // 組織フィルター
    if (userId) {
      const user = await this.userProfileRepository.findOne({
        where: { id: userId },
      });
      if (user?.organizationId) {
        queryBuilder.andWhere('report.organization_id = :orgId', {
          orgId: user.organizationId,
        });
      }
    }

    const report = await queryBuilder.getOne();

    if (!report) {
      throw new NotFoundException('報告が見つかりません');
    }

    return report;
  }

  /**
   * 報告を既読にする
   */
  async markAsRead(id: string, userId: string): Promise<PartnerReport> {
    const report = await this.findOne(id, userId);

    if (!report.isRead) {
      report.isRead = true;
      report.readAt = new Date();
      report.readById = userId;
      await this.reportRepository.save(report);

      this.logger.log(`報告を既読: ID=${id}, 既読者=${userId}`);
    }

    return report;
  }

  /**
   * 複数の報告を既読にする
   */
  async markMultipleAsRead(ids: string[], userId: string): Promise<void> {
    await this.reportRepository.update(
      { id: In(ids) as any },
      {
        isRead: true,
        readAt: new Date(),
        readById: userId,
      },
    );

    this.logger.log(`複数報告を既読: ${ids.length}件`);
  }

  /**
   * 未読報告数を取得
   */
  async getUnreadCount(userId: string): Promise<number> {
    const user = await this.userProfileRepository.findOne({
      where: { id: userId },
    });

    const queryBuilder = this.reportRepository
      .createQueryBuilder('report')
      .where('report.is_read = false');

    if (user?.organizationId) {
      queryBuilder.andWhere('report.organization_id = :orgId', {
        orgId: user.organizationId,
      });
    }

    return queryBuilder.getCount();
  }

  /**
   * パートナーの報告履歴を取得
   */
  async getPartnerReportHistory(
    partnerId: string,
    limit: number = 10,
  ): Promise<PartnerReport[]> {
    return this.reportRepository.find({
      where: { partnerId },
      relations: ['project', 'task'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
