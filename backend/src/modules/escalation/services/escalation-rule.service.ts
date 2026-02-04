import { Injectable, Logger } from '@nestjs/common';
import { ResourceNotFoundException } from '../../../common/exceptions/resource-not-found.exception';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { EscalationRule } from '../entities/escalation-rule.entity';
import { EscalationLog } from '../entities/escalation-log.entity';
import {
  CreateEscalationRuleDto,
  UpdateEscalationRuleDto,
  QueryEscalationRuleDto,
  QueryEscalationLogDto,
} from '../dto';
import { PaginatedResponseDto } from '../../../common/dto/pagination.dto';
import { EscalationRuleStatus } from '../enums/escalation.enum';

@Injectable()
export class EscalationRuleService {
  private readonly logger = new Logger(EscalationRuleService.name);

  constructor(
    @InjectRepository(EscalationRule)
    private escalationRuleRepository: Repository<EscalationRule>,
    @InjectRepository(EscalationLog)
    private escalationLogRepository: Repository<EscalationLog>,
  ) {}

  async createRule(
    createRuleDto: CreateEscalationRuleDto,
    createdById: string,
  ): Promise<EscalationRule> {
    const rule = this.escalationRuleRepository.create({
      ...createRuleDto,
      createdById,
    });

    await this.escalationRuleRepository.save(rule);
    this.logger.log(`Escalation rule created: ${rule.name} (${rule.id})`);

    return this.findRuleById(rule.id);
  }

  async findAllRules(
    queryDto: QueryEscalationRuleDto,
  ): Promise<PaginatedResponseDto<EscalationRule>> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'priority',
      sortOrder = 'ASC',
      projectId,
      triggerType,
      action,
      status,
    } = queryDto;

    const queryBuilder = this.escalationRuleRepository
      .createQueryBuilder('rule')
      .leftJoinAndSelect('rule.project', 'project')
      .leftJoinAndSelect('rule.escalateToUser', 'escalateToUser')
      .leftJoinAndSelect('rule.createdBy', 'createdBy');

    if (projectId) {
      queryBuilder.andWhere('(rule.projectId = :projectId OR rule.projectId IS NULL)', {
        projectId,
      });
    }

    if (triggerType) {
      queryBuilder.andWhere('rule.triggerType = :triggerType', { triggerType });
    }

    if (action) {
      queryBuilder.andWhere('rule.action = :action', { action });
    }

    if (status) {
      queryBuilder.andWhere('rule.status = :status', { status });
    }

    queryBuilder.orderBy(`rule.${sortBy}`, sortOrder);

    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return new PaginatedResponseDto(data, total, page, limit);
  }

  async findRuleById(id: string): Promise<EscalationRule> {
    const rule = await this.escalationRuleRepository.findOne({
      where: { id },
      relations: ['project', 'escalateToUser', 'createdBy'],
    });

    if (!rule) {
      throw new ResourceNotFoundException('SYSTEM_001', {
        resourceType: 'EscalationRule',
        resourceId: id,
        userMessage: 'エスカレーションルールが見つかりません',
      });
    }

    return rule;
  }

  async updateRule(id: string, updateRuleDto: UpdateEscalationRuleDto): Promise<EscalationRule> {
    const rule = await this.findRuleById(id);
    Object.assign(rule, updateRuleDto);
    await this.escalationRuleRepository.save(rule);

    this.logger.log(`Escalation rule updated: ${rule.name} (${rule.id})`);

    return this.findRuleById(id);
  }

  async deleteRule(id: string): Promise<void> {
    const rule = await this.findRuleById(id);
    await this.escalationRuleRepository.remove(rule);
    this.logger.log(`Escalation rule deleted: ${rule.name} (${id})`);
  }

  async getActiveRulesForTask(projectId?: string): Promise<EscalationRule[]> {
    return this.escalationRuleRepository.find({
      where: [
        { projectId, status: EscalationRuleStatus.ACTIVE },
        { projectId: IsNull(), status: EscalationRuleStatus.ACTIVE },
      ],
      order: { priority: 'ASC' },
    });
  }

  // Log Operations
  async findAllLogs(queryDto: QueryEscalationLogDto): Promise<PaginatedResponseDto<EscalationLog>> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      projectId,
      taskId,
      ruleId,
      action,
      status,
      dateFrom,
      dateTo,
    } = queryDto;

    const queryBuilder = this.escalationLogRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.rule', 'rule')
      .leftJoinAndSelect('log.task', 'task')
      .leftJoinAndSelect('log.project', 'project')
      .leftJoinAndSelect('log.escalatedToUser', 'escalatedToUser');

    if (projectId) {
      queryBuilder.andWhere('log.projectId = :projectId', { projectId });
    }

    if (taskId) {
      queryBuilder.andWhere('log.taskId = :taskId', { taskId });
    }

    if (ruleId) {
      queryBuilder.andWhere('log.ruleId = :ruleId', { ruleId });
    }

    if (action) {
      queryBuilder.andWhere('log.action = :action', { action });
    }

    if (status) {
      queryBuilder.andWhere('log.status = :status', { status });
    }

    if (dateFrom) {
      queryBuilder.andWhere('log.createdAt >= :dateFrom', { dateFrom });
    }

    if (dateTo) {
      queryBuilder.andWhere('log.createdAt <= :dateTo', { dateTo });
    }

    queryBuilder.orderBy(`log.${sortBy}`, sortOrder);

    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return new PaginatedResponseDto(data, total, page, limit);
  }

  async getEscalationHistory(projectId: string): Promise<EscalationLog[]> {
    return this.escalationLogRepository.find({
      where: { projectId },
      relations: ['rule', 'task', 'escalatedToUser'],
      order: { createdAt: 'DESC' },
    });
  }
}
