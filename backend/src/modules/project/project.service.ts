import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Project } from './entities/project.entity';
import { Partner } from '../partner/entities/partner.entity';
import { CreateProjectDto, UpdateProjectDto, QueryProjectDto } from './dto';
import { PaginatedResponseDto } from '../../common/dto/pagination.dto';
import { ProjectStatus } from './enums/project-status.enum';

// SECURITY FIX: Whitelist of allowed sort columns to prevent SQL injection
// TypeORM QueryBuilder uses property names (camelCase), not DB column names
const ALLOWED_SORT_COLUMNS = [
  'createdAt',
  'updatedAt',
  'name',
  'status',
  'priority',
  'startDate',
  'endDate',
  'budget',
  'actualCost',
  'progress',
  'healthScore',
];

@Injectable()
export class ProjectService {
  private readonly logger = new Logger(ProjectService.name);

  constructor(
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(Partner)
    private partnerRepository: Repository<Partner>,
  ) {}

  async create(
    createProjectDto: CreateProjectDto,
    createdById: string,
  ): Promise<Project> {
    const { partnerIds, tags, ...projectData } = createProjectDto;

    // Handle tags - convert empty string or invalid values to undefined
    const sanitizedTags = Array.isArray(tags) && tags.length > 0
      ? tags.filter(t => t && typeof t === 'string' && t.trim() !== '')
      : undefined;

    const project = this.projectRepository.create({
      ...projectData,
      tags: sanitizedTags,
      createdById,
      // ownerId が指定されていない場合は createdById を使用
      ownerId: projectData.ownerId || createdById,
    });

    // Handle partner associations
    if (partnerIds && partnerIds.length > 0) {
      const partners = await this.partnerRepository.findBy({
        id: In(partnerIds),
      });
      if (partners.length !== partnerIds.length) {
        throw new BadRequestException('Some partner IDs are invalid');
      }
      project.partners = partners;
    }

    await this.projectRepository.save(project);
    this.logger.log(`Project created: ${project.name} (${project.id})`);

    return this.findOne(project.id);
  }

  /**
   * Find all projects with access control filtering
   * @param queryDto Query parameters
   * @param userId Current user ID for access control (optional, if null shows all - for admin)
   * @param userRole Current user role for access control
   */
  async findAll(
    queryDto: QueryProjectDto,
    userId?: string,
    userRole?: string,
  ): Promise<PaginatedResponseDto<Project>> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      status,
      priority,
      search,
      ownerId,
      managerId,
      partnerId,
      startDateFrom,
      startDateTo,
      endDateFrom,
      endDateTo,
    } = queryDto;

    try {
      const queryBuilder = this.projectRepository
        .createQueryBuilder('project')
        .leftJoinAndSelect('project.owner', 'owner')
        .leftJoinAndSelect('project.manager', 'manager')
        .leftJoinAndSelect('project.partners', 'partners')
        .leftJoinAndSelect('project.createdBy', 'createdBy');

      // Apply access control filtering for non-admin users
      if (userId && userRole !== 'admin') {
        queryBuilder.andWhere(
          '(project.ownerId = :userId OR project.managerId = :userId OR project.createdById = :userId)',
          { userId }
        );
      }

      // Apply filters
      if (status) {
        queryBuilder.andWhere('project.status = :status', { status });
      }

      if (priority) {
        queryBuilder.andWhere('project.priority = :priority', { priority });
      }

      if (search) {
        queryBuilder.andWhere(
          '(project.name ILIKE :search OR project.description ILIKE :search)',
          { search: `%${search}%` },
        );
      }

      if (ownerId) {
        queryBuilder.andWhere('project.ownerId = :ownerId', { ownerId });
      }

      if (managerId) {
        queryBuilder.andWhere('project.managerId = :managerId', { managerId });
      }

      if (partnerId) {
        queryBuilder.andWhere('partners.id = :partnerId', { partnerId });
      }

      if (startDateFrom) {
        queryBuilder.andWhere('project.startDate >= :startDateFrom', {
          startDateFrom,
        });
      }

      if (startDateTo) {
        queryBuilder.andWhere('project.startDate <= :startDateTo', {
          startDateTo,
        });
      }

      if (endDateFrom) {
        queryBuilder.andWhere('project.endDate >= :endDateFrom', { endDateFrom });
      }

      if (endDateTo) {
        queryBuilder.andWhere('project.endDate <= :endDateTo', { endDateTo });
      }

      // SECURITY FIX: Validate sortBy against whitelist to prevent SQL injection
      const safeSortBy = ALLOWED_SORT_COLUMNS.includes(sortBy) ? sortBy : 'createdAt';
      queryBuilder.orderBy(`project.${safeSortBy}`, sortOrder);

      // Apply pagination
      const skip = (page - 1) * limit;
      queryBuilder.skip(skip).take(limit);

      // Log the generated SQL for debugging
      this.logger.debug(`Generated SQL: ${queryBuilder.getSql()}`);

      const [data, total] = await queryBuilder.getManyAndCount();

      return new PaginatedResponseDto(data, total, page, limit);
    } catch (error) {
      this.logger.error(`Error in findAll: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findOne(id: string, userId?: string): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id },
      relations: ['owner', 'manager', 'partners', 'createdBy'],
    });

    if (!project) {
      throw new NotFoundException(`Project with ID "${id}" not found`);
    }

    // If userId is provided, check access control
    if (userId) {
      const hasAccess = this.checkProjectAccess(project, userId);
      if (!hasAccess) {
        throw new ForbiddenException('You do not have permission to access this project');
      }
    }

    return project;
  }

  /**
   * Check if a user has access to a project
   * @param project Project entity
   * @param userId User ID to check
   * @returns true if user has access
   */
  private checkProjectAccess(project: Project, userId: string): boolean {
    // Owner has access
    if (project.ownerId === userId) return true;

    // Manager has access
    if (project.managerId === userId) return true;

    // Creator has access
    if (project.createdById === userId) return true;

    // Partner organization member has access (simplified check)
    // In a full implementation, you'd check if the user belongs to a partner organization

    return false;
  }

  /**
   * Public method to check if a user has access to a project
   * @param projectId Project ID
   * @param userId User ID to check
   * @returns true if user has access, false otherwise
   */
  async checkAccess(projectId: string, userId: string): Promise<boolean> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      relations: ['partners'],
    });

    if (!project) {
      return false;
    }

    return this.checkProjectAccess(project, userId);
  }

  async update(id: string, updateProjectDto: UpdateProjectDto): Promise<Project> {
    const project = await this.findOne(id);
    const { partnerIds, ...updateData } = updateProjectDto;

    Object.assign(project, updateData);

    // Handle partner associations if provided
    if (partnerIds !== undefined) {
      if (partnerIds.length > 0) {
        const partners = await this.partnerRepository.findBy({
          id: In(partnerIds),
        });
        if (partners.length !== partnerIds.length) {
          throw new BadRequestException('Some partner IDs are invalid');
        }
        project.partners = partners;
      } else {
        project.partners = [];
      }
    }

    await this.projectRepository.save(project);
    this.logger.log(`Project updated: ${project.name} (${project.id})`);

    return this.findOne(project.id);
  }

  async updateStatus(id: string, status: ProjectStatus): Promise<Project> {
    const project = await this.findOne(id);
    project.status = status;

    if (status === ProjectStatus.COMPLETED) {
      project.actualEndDate = new Date();
      project.progress = 100;
    }

    await this.projectRepository.save(project);
    this.logger.log(`Project status updated: ${project.name} -> ${status}`);

    return project;
  }

  async updateProgress(id: string, progress: number): Promise<Project> {
    const project = await this.findOne(id);
    project.progress = progress;

    if (progress === 100) {
      project.status = ProjectStatus.COMPLETED;
      project.actualEndDate = new Date();
    }

    await this.projectRepository.save(project);
    this.logger.log(`Project progress updated: ${project.name} -> ${progress}%`);

    return project;
  }

  async addPartner(projectId: string, partnerId: string): Promise<Project> {
    const project = await this.findOne(projectId);
    const partner = await this.partnerRepository.findOne({
      where: { id: partnerId },
    });

    if (!partner) {
      throw new NotFoundException(`Partner with ID "${partnerId}" not found`);
    }

    if (!project.partners.find((p) => p.id === partnerId)) {
      project.partners.push(partner);
      await this.projectRepository.save(project);
      this.logger.log(`Partner added to project: ${partner.name} -> ${project.name}`);
    }

    return this.findOne(projectId);
  }

  async removePartner(projectId: string, partnerId: string): Promise<Project> {
    const project = await this.findOne(projectId);
    project.partners = project.partners.filter((p) => p.id !== partnerId);
    await this.projectRepository.save(project);
    this.logger.log(`Partner removed from project: ${partnerId} -> ${project.name}`);

    return this.findOne(projectId);
  }

  async remove(id: string): Promise<void> {
    const project = await this.findOne(id);
    // Use soft delete instead of hard delete
    await this.projectRepository.softRemove(project);
    this.logger.log(`Project soft deleted: ${project.name} (${id})`);
  }

  /**
   * Permanently delete a project (admin only)
   */
  async forceRemove(id: string): Promise<void> {
    const project = await this.projectRepository.findOne({
      where: { id },
      withDeleted: true,
    });
    if (!project) {
      throw new NotFoundException(`Project with ID "${id}" not found`);
    }
    await this.projectRepository.remove(project);
    this.logger.log(`Project permanently deleted: ${project.name} (${id})`);
  }

  async getProjectsByPartner(partnerId: string): Promise<Project[]> {
    return this.projectRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.partners', 'partners')
      .where('partners.id = :partnerId', { partnerId })
      .getMany();
  }

  async getProjectStatistics(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    averageProgress: number;
    totalBudget: number;
    totalActualCost: number;
  }> {
    const total = await this.projectRepository.count();

    const statusCounts = await this.projectRepository
      .createQueryBuilder('project')
      .select('project.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('project.status')
      .getRawMany();

    const priorityCounts = await this.projectRepository
      .createQueryBuilder('project')
      .select('project.priority', 'priority')
      .addSelect('COUNT(*)', 'count')
      .groupBy('project.priority')
      .getRawMany();

    const aggregates = await this.projectRepository
      .createQueryBuilder('project')
      .select('AVG(project.progress)', 'avgProgress')
      .addSelect('SUM(project.budget)', 'totalBudget')
      .addSelect('SUM(project.actualCost)', 'totalActualCost')
      .getRawOne();

    const byStatus: Record<string, number> = {};
    statusCounts.forEach((item) => {
      byStatus[item.status] = parseInt(item.count, 10);
    });

    const byPriority: Record<string, number> = {};
    priorityCounts.forEach((item) => {
      byPriority[item.priority] = parseInt(item.count, 10);
    });

    return {
      total,
      byStatus,
      byPriority,
      averageProgress: parseFloat(aggregates?.avgProgress || '0'),
      totalBudget: parseFloat(aggregates?.totalBudget || '0'),
      totalActualCost: parseFloat(aggregates?.totalActualCost || '0'),
    };
  }

  async getOverdueProjects(): Promise<Project[]> {
    const today = new Date();
    return this.projectRepository
      .createQueryBuilder('project')
      .where('project.endDate < :today', { today })
      .andWhere('project.status NOT IN (:...completedStatuses)', {
        completedStatuses: [ProjectStatus.COMPLETED, ProjectStatus.CANCELLED],
      })
      .leftJoinAndSelect('project.owner', 'owner')
      .leftJoinAndSelect('project.manager', 'manager')
      .getMany();
  }

  async getUpcomingDeadlines(days: number = 7): Promise<Project[]> {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return this.projectRepository
      .createQueryBuilder('project')
      .where('project.endDate BETWEEN :today AND :futureDate', {
        today,
        futureDate,
      })
      .andWhere('project.status NOT IN (:...completedStatuses)', {
        completedStatuses: [ProjectStatus.COMPLETED, ProjectStatus.CANCELLED],
      })
      .leftJoinAndSelect('project.owner', 'owner')
      .leftJoinAndSelect('project.manager', 'manager')
      .orderBy('project.endDate', 'ASC')
      .getMany();
  }

  /**
   * ヘルススコアを計算する
   * @param project 対象のプロジェクト
   * @returns 0-100のヘルススコア
   */
  private calculateHealthScore(project: Project): number {
    let score = 100;

    const today = new Date();
    const endDate = project.endDate ? new Date(project.endDate) : null;
    const startDate = project.startDate ? new Date(project.startDate) : null;

    // 期限超過で減点（-30点）
    if (endDate && today > endDate && project.status !== ProjectStatus.COMPLETED && project.status !== ProjectStatus.CANCELLED) {
      score -= 30;
    }

    // 進捗遅れで減点
    // 期間の経過割合と進捗率を比較
    if (startDate && endDate && project.progress !== undefined) {
      const totalDuration = endDate.getTime() - startDate.getTime();
      const elapsed = today.getTime() - startDate.getTime();

      if (totalDuration > 0 && elapsed > 0) {
        const expectedProgress = Math.min(100, (elapsed / totalDuration) * 100);
        const progressGap = expectedProgress - project.progress;

        // 進捗が期待より20%以上遅れている場合、最大-25点
        if (progressGap > 20) {
          score -= Math.min(25, Math.floor(progressGap / 2));
        }
      }
    }

    // 予算超過で減点（-20点）
    if (project.budget && project.actualCost) {
      const budgetRatio = project.actualCost / project.budget;
      if (budgetRatio > 1) {
        score -= Math.min(20, Math.floor((budgetRatio - 1) * 100));
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * プロジェクトのヘルススコアを更新する
   * @param id プロジェクトID
   * @returns 更新後のプロジェクト
   */
  async updateHealthScore(id: string): Promise<Project> {
    const project = await this.findOne(id);
    project.healthScore = this.calculateHealthScore(project);
    await this.projectRepository.save(project);
    this.logger.log(`Project health score updated: ${project.name} -> ${project.healthScore}`);
    return project;
  }

  async getProjectTimeline(id: string): Promise<{
    projectId: string;
    projectName: string;
    events: Array<{
      type: string;
      description: string;
      timestamp: Date;
    }>;
  }> {
    const project = await this.findOne(id);

    const events: Array<{
      type: string;
      description: string;
      timestamp: Date;
    }> = [];

    // Add creation event
    events.push({
      type: 'created',
      description: `Project "${project.name}" was created`,
      timestamp: project.createdAt,
    });

    // Add update event if different from creation
    if (project.updatedAt.getTime() !== project.createdAt.getTime()) {
      events.push({
        type: 'updated',
        description: `Project "${project.name}" was last updated`,
        timestamp: project.updatedAt,
      });
    }

    // Add status-related events
    if (project.status === ProjectStatus.COMPLETED && project.actualEndDate) {
      events.push({
        type: 'completed',
        description: `Project "${project.name}" was completed`,
        timestamp: project.actualEndDate,
      });
    }

    // Sort events by timestamp
    events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return {
      projectId: project.id,
      projectName: project.name,
      events,
    };
  }

  async addMember(projectId: string, userId: string): Promise<Project> {
    const project = await this.findOne(projectId);

    // For simplicity, we'll set the user as manager if not already set
    // In a full implementation, you'd have a separate members table
    if (!project.managerId) {
      project.managerId = userId;
      await this.projectRepository.save(project);
      this.logger.log(`Member added to project as manager: ${userId} -> ${project.name}`);
    } else if (!project.ownerId) {
      project.ownerId = userId;
      await this.projectRepository.save(project);
      this.logger.log(`Member added to project as owner: ${userId} -> ${project.name}`);
    } else {
      this.logger.log(`Member roles already filled for project: ${project.name}`);
    }

    return this.findOne(projectId);
  }

  async removeMember(projectId: string, memberId: string): Promise<Project> {
    const project = await this.findOne(projectId);

    // Remove member from manager or owner role
    if (project.managerId === memberId) {
      project.managerId = undefined as unknown as string;
      await this.projectRepository.save(project);
      this.logger.log(`Member removed from project (manager): ${memberId} -> ${project.name}`);
    } else if (project.ownerId === memberId) {
      project.ownerId = undefined as unknown as string;
      await this.projectRepository.save(project);
      this.logger.log(`Member removed from project (owner): ${memberId} -> ${project.name}`);
    }

    return this.findOne(projectId);
  }
}
