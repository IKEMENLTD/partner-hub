import { Injectable, Logger } from '@nestjs/common';
import { ResourceNotFoundException } from '../../../common/exceptions/resource-not-found.exception';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { ReportConfig, ReportPeriod, ReportStatus } from '../entities/report-config.entity';
import { CreateReportConfigDto, UpdateReportConfigDto, QueryReportConfigDto } from '../dto';
import { PaginatedResponseDto } from '../../../common/dto/pagination.dto';

@Injectable()
export class ReportConfigService {
  private readonly logger = new Logger(ReportConfigService.name);

  constructor(
    @InjectRepository(ReportConfig)
    private reportConfigRepository: Repository<ReportConfig>,
  ) {}

  async createConfig(dto: CreateReportConfigDto, createdById: string): Promise<ReportConfig> {
    const config = this.reportConfigRepository.create({
      ...dto,
      createdById,
      scheduleCron: this.buildCronExpression(dto),
      nextRunAt: this.calculateNextRunTime(dto),
    });

    await this.reportConfigRepository.save(config);
    this.logger.log(`Report config created: ${config.name} (${config.id})`);

    return this.findConfigById(config.id);
  }

  async findAllConfigs(
    queryDto: QueryReportConfigDto,
  ): Promise<PaginatedResponseDto<ReportConfig>> {
    const {
      page = 1,
      limit = 10,
      period,
      status,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = queryDto;

    const queryBuilder = this.reportConfigRepository
      .createQueryBuilder('config')
      .leftJoinAndSelect('config.createdBy', 'createdBy');

    if (period) {
      queryBuilder.andWhere('config.period = :period', { period });
    }

    if (status) {
      queryBuilder.andWhere('config.status = :status', { status });
    } else {
      // By default, exclude deleted configs
      queryBuilder.andWhere('config.status != :deletedStatus', {
        deletedStatus: ReportStatus.DELETED,
      });
    }

    if (search) {
      queryBuilder.andWhere('(config.name ILIKE :search OR config.description ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    queryBuilder.orderBy(`config.${sortBy}`, sortOrder);

    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return new PaginatedResponseDto(data, total, page, limit);
  }

  async findConfigById(id: string): Promise<ReportConfig> {
    const config = await this.reportConfigRepository.findOne({
      where: { id },
      relations: ['createdBy'],
    });

    if (!config) {
      throw new ResourceNotFoundException('REPORT_001', {
        resourceType: 'ReportConfig',
        resourceId: id,
        userMessage: 'レポート設定が見つかりません',
      });
    }

    return config;
  }

  async updateConfig(id: string, dto: UpdateReportConfigDto): Promise<ReportConfig> {
    const config = await this.findConfigById(id);

    Object.assign(config, dto);

    // Recalculate cron and next run time if schedule changed
    if (dto.period || dto.dayOfWeek || dto.dayOfMonth || dto.sendTime) {
      config.scheduleCron = this.buildCronExpression(config);
      config.nextRunAt = this.calculateNextRunTime(config);
    }

    await this.reportConfigRepository.save(config);
    this.logger.log(`Report config updated: ${config.name} (${config.id})`);

    return this.findConfigById(id);
  }

  async deleteConfig(id: string): Promise<void> {
    const config = await this.findConfigById(id);
    config.status = ReportStatus.DELETED;
    await this.reportConfigRepository.save(config);
    this.logger.log(`Report config deleted: ${config.name} (${id})`);
  }

  // Get active configs that need to run
  async getActiveConfigsForScheduling(): Promise<ReportConfig[]> {
    const now = new Date();

    return this.reportConfigRepository.find({
      where: {
        status: ReportStatus.ACTIVE,
        nextRunAt: LessThan(now),
      },
    });
  }

  // Update config after running
  async markConfigAsRun(configId: string): Promise<void> {
    const config = await this.findConfigById(configId);
    config.lastGeneratedAt = new Date();
    config.nextRunAt = this.calculateNextRunTime(config);
    await this.reportConfigRepository.save(config);
  }

  // Recalculate nextRunAt for all active configs (startup migration)
  async recalculateAllNextRunTimes(): Promise<number> {
    const configs = await this.reportConfigRepository.find({
      where: { status: ReportStatus.ACTIVE },
    });

    for (const config of configs) {
      config.nextRunAt = this.calculateNextRunTime(config);
    }

    if (configs.length > 0) {
      await this.reportConfigRepository.save(configs);
    }

    return configs.length;
  }

  // Helper methods
  buildCronExpression(config: Partial<ReportConfig>): string {
    const [hour, minute] = (config.sendTime || '09:00').split(':').map(Number);

    if (config.period === ReportPeriod.MONTHLY) {
      // Monthly: run on specific day of month
      return `${minute} ${hour} ${config.dayOfMonth || 1} * *`;
    } else {
      // Weekly: run on specific day of week
      return `${minute} ${hour} * * ${config.dayOfWeek || 1}`;
    }
  }

  calculateNextRunTime(config: Partial<ReportConfig>): Date {
    // sendTime はユーザーが JST (UTC+9) で入力した時刻
    const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
    const nowUTC = new Date();
    // JST での「現在時刻」を仮想的に作成（UTC メソッドで操作するため）
    const nowJST = new Date(nowUTC.getTime() + JST_OFFSET_MS);

    const [hour, minute] = (config.sendTime || '09:00').split(':').map(Number);

    // JST フレームで次回実行時刻を計算
    const nextRunJST = new Date(nowJST);
    nextRunJST.setUTCHours(hour, minute, 0, 0);

    if (config.period === ReportPeriod.MONTHLY) {
      // Monthly
      nextRunJST.setUTCDate(config.dayOfMonth || 1);
      if (nextRunJST <= nowJST) {
        nextRunJST.setUTCMonth(nextRunJST.getUTCMonth() + 1);
      }
    } else {
      // Weekly
      const targetDay = config.dayOfWeek || 1;
      const currentDay = nowJST.getUTCDay();
      let daysToAdd = targetDay - currentDay;

      if (daysToAdd < 0 || (daysToAdd === 0 && nextRunJST <= nowJST)) {
        daysToAdd += 7;
      }

      nextRunJST.setUTCDate(nowJST.getUTCDate() + daysToAdd);
    }

    // JST → UTC に変換して返す
    return new Date(nextRunJST.getTime() - JST_OFFSET_MS);
  }
}
