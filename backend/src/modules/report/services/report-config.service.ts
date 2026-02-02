import { Injectable, NotFoundException, Logger } from '@nestjs/common';
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
      throw new NotFoundException(`Report config with ID "${id}" not found`);
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
    const now = new Date();
    const [hour, minute] = (config.sendTime || '09:00').split(':').map(Number);

    const nextRun = new Date(now);
    nextRun.setHours(hour, minute, 0, 0);

    if (config.period === ReportPeriod.MONTHLY) {
      // Monthly
      nextRun.setDate(config.dayOfMonth || 1);
      if (nextRun <= now) {
        nextRun.setMonth(nextRun.getMonth() + 1);
      }
    } else {
      // Weekly
      const targetDay = config.dayOfWeek || 1;
      const currentDay = now.getDay();
      let daysToAdd = targetDay - currentDay;

      if (daysToAdd < 0 || (daysToAdd === 0 && nextRun <= now)) {
        daysToAdd += 7;
      }

      nextRun.setDate(now.getDate() + daysToAdd);
    }

    return nextRun;
  }
}
