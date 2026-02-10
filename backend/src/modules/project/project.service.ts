import {
  Injectable,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ResourceNotFoundException } from '../../common/exceptions/resource-not-found.exception';
import { BusinessException, AuthorizationException } from '../../common/exceptions/business.exception';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Project } from './entities/project.entity';
import { ProjectStakeholder } from './entities/project-stakeholder.entity';
import { Partner } from '../partner/entities/partner.entity';
import { UserProfile } from '../auth/entities/user-profile.entity';
import { CreateProjectDto, UpdateProjectDto, QueryProjectDto } from './dto';
import { PaginatedResponseDto } from '../../common/dto/pagination.dto';
import { ProjectStatus } from './enums/project-status.enum';
import { EmailService } from '../notification/services/email.service';
import { ProjectStatisticsService } from './services/project-statistics.service';

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
    @InjectRepository(ProjectStakeholder)
    private stakeholderRepository: Repository<ProjectStakeholder>,
    @InjectRepository(Partner)
    private partnerRepository: Repository<Partner>,
    @InjectRepository(UserProfile)
    private userProfileRepository: Repository<UserProfile>,
    private emailService: EmailService,
    @Inject(forwardRef(() => ProjectStatisticsService))
    private statisticsService: ProjectStatisticsService,
  ) {}

  async create(createProjectDto: CreateProjectDto, createdById: string): Promise<Project> {
    const { partnerIds, stakeholders, tags, ...projectData } = createProjectDto;

    // Get creator's organization
    const creator = await this.userProfileRepository.findOne({
      where: { id: createdById },
    });
    const organizationId = creator?.organizationId;

    // Handle tags - convert empty string or invalid values to undefined
    const sanitizedTags =
      Array.isArray(tags) && tags.length > 0
        ? tags.filter((t) => t && typeof t === 'string' && t.trim() !== '')
        : undefined;

    // Collect all partner IDs to validate and add to project_partners
    const allPartnerIds: string[] = [];
    if (stakeholders && stakeholders.length > 0) {
      allPartnerIds.push(...stakeholders.map((s) => s.partnerId));
    } else if (partnerIds && partnerIds.length > 0) {
      allPartnerIds.push(...partnerIds);
    }

    const project = this.projectRepository.create({
      ...projectData,
      tags: sanitizedTags,
      createdById,
      organizationId,
      // ownerId が指定されていない場合は createdById を使用
      ownerId: projectData.ownerId || createdById,
    });

    // Handle partner associations (project_partners join table)
    if (allPartnerIds.length > 0) {
      const uniquePartnerIds = [...new Set(allPartnerIds)];
      const partners = await this.partnerRepository.findBy({
        id: In(uniquePartnerIds),
      });
      if (partners.length !== uniquePartnerIds.length) {
        throw new BusinessException('PARTNER_001', {
          message: '無効なパートナーIDが含まれています',
          userMessage: '一部のパートナーIDが無効です',
        });
      }
      project.partners = partners;
    }

    await this.projectRepository.save(project);

    // Create project_stakeholders entries
    if (stakeholders && stakeholders.length > 0) {
      const stakeholderEntities = stakeholders.map((s) =>
        this.stakeholderRepository.create({
          projectId: project.id,
          partnerId: s.partnerId,
          tier: s.tier ?? 1,
          roleDescription: s.roleDescription,
          isPrimary: s.isPrimary ?? false,
        }),
      );
      await this.stakeholderRepository.save(stakeholderEntities);
      this.logger.log(`Created ${stakeholderEntities.length} stakeholders for project ${project.id}`);
    } else if (partnerIds && partnerIds.length > 0) {
      // Backward compat: partnerIds → stakeholders with tier 1
      const stakeholderEntities = partnerIds.map((pid) =>
        this.stakeholderRepository.create({
          projectId: project.id,
          partnerId: pid,
          tier: 1,
          isPrimary: false,
        }),
      );
      await this.stakeholderRepository.save(stakeholderEntities);
      this.logger.log(`Created ${stakeholderEntities.length} stakeholders (from partnerIds) for project ${project.id}`);
    }

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

      // Multi-tenancy: Filter by organization
      if (userId) {
        const user = await this.userProfileRepository.findOne({ where: { id: userId } });
        if (user?.organizationId) {
          queryBuilder.andWhere('project.organizationId = :orgId', { orgId: user.organizationId });
        }
      }

      // Apply access control filtering for non-admin users
      if (userId && userRole !== 'admin') {
        queryBuilder.andWhere(
          '(project.ownerId = :userId OR project.managerId = :userId OR project.createdById = :userId)',
          { userId },
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
        queryBuilder.andWhere('(project.name ILIKE :search OR project.description ILIKE :search)', {
          search: `%${search}%`,
        });
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
      // Use custom exception for consistent error response format
      throw ResourceNotFoundException.forProject(id);
    }

    // If userId is provided, check access control
    if (userId) {
      const hasAccess = this.checkProjectAccess(project, userId);
      if (!hasAccess) {
        throw new AuthorizationException('PROJECT_002', {
          message: 'この案件へのアクセス権限がありません',
        });
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
    const { partnerIds, stakeholders, tags, ...updateData } = updateProjectDto;

    // Handle tags - now using native PostgreSQL array, empty arrays are supported
    if (tags !== undefined) {
      (updateData as any).tags = Array.isArray(tags) ? tags : [];
    }

    Object.assign(project, updateData);

    // Handle stakeholders if provided (takes priority over partnerIds)
    if (stakeholders !== undefined) {
      // Validate all partner IDs
      const partnerIdsFromStakeholders = stakeholders.map((s) => s.partnerId);
      if (partnerIdsFromStakeholders.length > 0) {
        const uniqueIds = [...new Set(partnerIdsFromStakeholders)];
        const partners = await this.partnerRepository.findBy({
          id: In(uniqueIds),
        });
        if (partners.length !== uniqueIds.length) {
          throw new BusinessException('PARTNER_001', {
            message: '無効なパートナーIDが含まれています',
            userMessage: '一部のパートナーIDが無効です',
          });
        }
        // Update project_partners join table
        project.partners = partners;
      } else {
        project.partners = [];
      }

      // Replace stakeholders: delete existing, create new
      await this.stakeholderRepository.delete({ projectId: id });
      if (stakeholders.length > 0) {
        const stakeholderEntities = stakeholders.map((s) =>
          this.stakeholderRepository.create({
            projectId: id,
            partnerId: s.partnerId,
            tier: s.tier ?? 1,
            roleDescription: s.roleDescription,
            isPrimary: s.isPrimary ?? false,
          }),
        );
        await this.stakeholderRepository.save(stakeholderEntities);
        this.logger.log(`Replaced stakeholders for project ${id}: ${stakeholderEntities.length} entries`);
      }
    } else if (partnerIds !== undefined) {
      // Backward compat: handle partnerIds
      if (partnerIds.length > 0) {
        const partners = await this.partnerRepository.findBy({
          id: In(partnerIds),
        });
        if (partners.length !== partnerIds.length) {
          throw new BusinessException('PARTNER_001', {
            message: '無効なパートナーIDが含まれています',
            userMessage: '一部のパートナーIDが無効です',
          });
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
      throw ResourceNotFoundException.forPartner(partnerId);
    }

    if (!project.partners.find((p) => p.id === partnerId)) {
      project.partners.push(partner);
      await this.projectRepository.save(project);
      this.logger.log(`Partner added to project: ${partner.name} -> ${project.name}`);

      // Send email notification to the partner (async, don't block response)
      this.emailService.sendProjectInvitationEmail(project, partner).catch((error) => {
        this.logger.error(`Failed to send project invitation email to ${partner.email}`, error);
      });
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
      // Use custom exception for consistent error response format
      throw ResourceNotFoundException.forProject(id);
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

  // Delegate to statistics service
  async getProjectStatistics() {
    return this.statisticsService.getProjectStatistics();
  }

  async getOverdueProjects(): Promise<Project[]> {
    return this.statisticsService.getOverdueProjects();
  }

  async getUpcomingDeadlines(days: number = 7): Promise<Project[]> {
    return this.statisticsService.getUpcomingDeadlines(days);
  }

  async updateHealthScore(id: string): Promise<Project> {
    return this.statisticsService.updateHealthScore(id);
  }

  async getProjectTimeline(id: string) {
    return this.statisticsService.getProjectTimeline(id);
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
