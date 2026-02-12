import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ResourceNotFoundException } from '../../common/exceptions/resource-not-found.exception';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReportConfig, ReportPeriod } from './entities/report-config.entity';
import {
  GeneratedReport,
  GeneratedReportStatus,
  ReportData,
} from './entities/generated-report.entity';
import {
  CreateReportConfigDto,
  UpdateReportConfigDto,
  QueryReportConfigDto,
  QueryGeneratedReportDto,
  GenerateReportDto,
} from './dto';
import { PaginatedResponseDto } from '../../common/dto/pagination.dto';
import { ReportConfigService } from './services/report-config.service';
import { ReportDataService } from './services/report-data.service';

// SECURITY FIX: Whitelist of allowed sort columns to prevent SQL injection
const ALLOWED_SORT_COLUMNS = [
  'createdAt',
  'updatedAt',
  'status',
  'period',
  'reportConfigId',
  'generatedAt',
  'title',
  'dateRangeStart',
  'dateRangeEnd',
  'sentAt',
];

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(
    @InjectRepository(GeneratedReport)
    private generatedReportRepository: Repository<GeneratedReport>,
    @Inject(forwardRef(() => ReportConfigService))
    private reportConfigService: ReportConfigService,
    @Inject(forwardRef(() => ReportDataService))
    private reportDataService: ReportDataService,
  ) {}

  // ==================== Report Config (Delegated) ====================

  async createConfig(dto: CreateReportConfigDto, createdById: string): Promise<ReportConfig> {
    return this.reportConfigService.createConfig(dto, createdById);
  }

  async findAllConfigs(
    queryDto: QueryReportConfigDto,
  ): Promise<PaginatedResponseDto<ReportConfig>> {
    return this.reportConfigService.findAllConfigs(queryDto);
  }

  async findConfigById(id: string): Promise<ReportConfig> {
    return this.reportConfigService.findConfigById(id);
  }

  async updateConfig(id: string, dto: UpdateReportConfigDto): Promise<ReportConfig> {
    return this.reportConfigService.updateConfig(id, dto);
  }

  async deleteConfig(id: string): Promise<void> {
    return this.reportConfigService.deleteConfig(id);
  }

  async getActiveConfigsForScheduling(): Promise<ReportConfig[]> {
    return this.reportConfigService.getActiveConfigsForScheduling();
  }

  async markConfigAsRun(configId: string): Promise<void> {
    return this.reportConfigService.markConfigAsRun(configId);
  }

  async recalculateAllNextRunTimes(): Promise<number> {
    return this.reportConfigService.recalculateAllNextRunTimes();
  }

  // ==================== Generated Reports ====================

  async findAllGeneratedReports(
    queryDto: QueryGeneratedReportDto,
  ): Promise<PaginatedResponseDto<GeneratedReport>> {
    const {
      page = 1,
      limit = 10,
      reportConfigId,
      period,
      status,
      fromDate,
      toDate,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = queryDto;

    const queryBuilder = this.generatedReportRepository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.reportConfig', 'reportConfig')
      .leftJoinAndSelect('report.generatedBy', 'generatedBy');

    if (reportConfigId) {
      queryBuilder.andWhere('report.reportConfigId = :reportConfigId', {
        reportConfigId,
      });
    }

    if (period) {
      queryBuilder.andWhere('report.period = :period', { period });
    }

    if (status) {
      queryBuilder.andWhere('report.status = :status', { status });
    }

    if (fromDate) {
      queryBuilder.andWhere('report.createdAt >= :fromDate', { fromDate });
    }

    if (toDate) {
      queryBuilder.andWhere('report.createdAt <= :toDate', { toDate });
    }

    // SECURITY FIX: Validate sortBy against whitelist to prevent SQL injection
    const safeSortBy = ALLOWED_SORT_COLUMNS.includes(sortBy) ? sortBy : 'createdAt';
    queryBuilder.orderBy(`report.${safeSortBy}`, sortOrder);

    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return new PaginatedResponseDto(data, total, page, limit);
  }

  async findGeneratedReportById(id: string): Promise<GeneratedReport> {
    const report = await this.generatedReportRepository.findOne({
      where: { id },
      relations: ['reportConfig', 'generatedBy'],
    });

    if (!report) {
      throw ResourceNotFoundException.forReport(id);
    }

    return report;
  }

  // ==================== Report Generation ====================

  async generateReport(dto: GenerateReportDto, generatedById?: string): Promise<GeneratedReport> {
    const { period, startDate, endDate, reportConfigId } = dto;

    // Calculate date range
    const { start, end } = this.calculateDateRange(
      period || ReportPeriod.WEEKLY,
      startDate,
      endDate,
    );

    // Generate report data using delegated service
    const reportData = await this.reportDataService.gatherReportData(start, end);

    // Determine title
    const periodLabel = period === ReportPeriod.MONTHLY ? '月次' : '週次';
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    const title = `${periodLabel}レポート (${startStr} - ${endStr})`;

    // Create generated report
    const generatedReport = this.generatedReportRepository.create({
      reportConfigId,
      title,
      period: period || ReportPeriod.WEEKLY,
      dateRangeStart: start,
      dateRangeEnd: end,
      status: GeneratedReportStatus.GENERATED,
      reportData,
      isManual: true,
      generatedById,
    });

    await this.generatedReportRepository.save(generatedReport);
    this.logger.log(`Report generated: ${title} (${generatedReport.id})`);

    return this.findGeneratedReportById(generatedReport.id);
  }

  async gatherReportData(startDate: Date, endDate: Date): Promise<ReportData> {
    return this.reportDataService.gatherReportData(startDate, endDate);
  }

  // ==================== Helper Methods ====================

  private calculateDateRange(
    period: ReportPeriod,
    startDateStr?: string,
    endDateStr?: string,
  ): { start: Date; end: Date } {
    if (startDateStr && endDateStr) {
      return {
        start: new Date(startDateStr),
        end: new Date(endDateStr),
      };
    }

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const start = new Date(end);

    if (period === ReportPeriod.MONTHLY) {
      start.setMonth(start.getMonth() - 1);
    } else {
      start.setDate(start.getDate() - 7);
    }

    start.setHours(0, 0, 0, 0);

    return { start, end };
  }
}
