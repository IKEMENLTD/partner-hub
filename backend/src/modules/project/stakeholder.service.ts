import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectStakeholder } from './entities/project-stakeholder.entity';
import { Project } from './entities/project.entity';
import { Partner } from '../partner/entities/partner.entity';
import {
  CreateStakeholderDto,
  UpdateStakeholderDto,
  QueryStakeholderDto,
  StakeholderNodeDto,
  StakeholderTreeResponseDto,
} from './dto';
import { PaginatedResponseDto } from '../../common/dto/pagination.dto';
import { EmailService } from '../notification/services/email.service';

// SECURITY FIX: Whitelist of allowed sort columns to prevent SQL injection
const ALLOWED_SORT_COLUMNS = [
  'createdAt',
  'updatedAt',
  'tier',
  'isPrimary',
  'contractAmount',
  'roleDescription',
];

@Injectable()
export class StakeholderService {
  private readonly logger = new Logger(StakeholderService.name);

  constructor(
    @InjectRepository(ProjectStakeholder)
    private stakeholderRepository: Repository<ProjectStakeholder>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(Partner)
    private partnerRepository: Repository<Partner>,
    private emailService: EmailService,
  ) {}

  /**
   * Create a new stakeholder
   */
  async create(createStakeholderDto: CreateStakeholderDto): Promise<ProjectStakeholder> {
    const { projectId, partnerId, parentStakeholderId, ...stakeholderData } = createStakeholderDto;

    // Verify project exists
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });
    if (!project) {
      throw new NotFoundException(`Project with ID "${projectId}" not found`);
    }

    // Verify partner exists if provided
    if (partnerId) {
      const partner = await this.partnerRepository.findOne({
        where: { id: partnerId },
      });
      if (!partner) {
        throw new NotFoundException(`Partner with ID "${partnerId}" not found`);
      }
    }

    // Verify parent stakeholder exists if provided
    if (parentStakeholderId) {
      const parentStakeholder = await this.stakeholderRepository.findOne({
        where: { id: parentStakeholderId },
      });
      if (!parentStakeholder) {
        throw new NotFoundException(
          `Parent stakeholder with ID "${parentStakeholderId}" not found`,
        );
      }
      // Ensure parent stakeholder belongs to the same project
      if (parentStakeholder.projectId !== projectId) {
        throw new BadRequestException('Parent stakeholder must belong to the same project');
      }
    }

    const stakeholder = this.stakeholderRepository.create({
      ...stakeholderData,
      projectId,
      partnerId,
      parentStakeholderId,
    });

    await this.stakeholderRepository.save(stakeholder);
    this.logger.log(`Stakeholder created: ${stakeholder.id} for project ${projectId}`);

    // Send email notification if partner is associated (async, don't block response)
    if (partnerId) {
      const partner = await this.partnerRepository.findOne({ where: { id: partnerId } });
      if (partner) {
        const roleDescription = stakeholderData.roleDescription || 'プロジェクト関係者';
        this.emailService
          .sendStakeholderAddedEmail(project, partner, roleDescription)
          .catch((error) => {
            this.logger.error(`Failed to send stakeholder added email to ${partner.email}`, error);
          });
      }
    }

    return this.findOne(stakeholder.id);
  }

  /**
   * Get all stakeholders for a project with pagination
   */
  async findAllByProject(
    projectId: string,
    queryDto: QueryStakeholderDto,
  ): Promise<PaginatedResponseDto<ProjectStakeholder>> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      tier,
      isPrimary,
    } = queryDto;

    // Verify project exists
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });
    if (!project) {
      throw new NotFoundException(`Project with ID "${projectId}" not found`);
    }

    const queryBuilder = this.stakeholderRepository
      .createQueryBuilder('stakeholder')
      .leftJoinAndSelect('stakeholder.partner', 'partner')
      .leftJoinAndSelect('stakeholder.parentStakeholder', 'parentStakeholder')
      .where('stakeholder.projectId = :projectId', { projectId });

    // Apply filters
    if (tier !== undefined) {
      queryBuilder.andWhere('stakeholder.tier = :tier', { tier });
    }

    if (isPrimary !== undefined) {
      queryBuilder.andWhere('stakeholder.isPrimary = :isPrimary', { isPrimary });
    }

    // SECURITY FIX: Validate sortBy against whitelist to prevent SQL injection
    const safeSortBy = ALLOWED_SORT_COLUMNS.includes(sortBy) ? sortBy : 'createdAt';
    queryBuilder.orderBy(`stakeholder.${safeSortBy}`, sortOrder);

    // Apply pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return new PaginatedResponseDto(data, total, page, limit);
  }

  /**
   * Get a single stakeholder by ID
   */
  async findOne(id: string): Promise<ProjectStakeholder> {
    const stakeholder = await this.stakeholderRepository.findOne({
      where: { id },
      relations: ['partner', 'project', 'parentStakeholder'],
    });

    if (!stakeholder) {
      throw new NotFoundException(`Stakeholder with ID "${id}" not found`);
    }

    return stakeholder;
  }

  /**
   * Update a stakeholder
   */
  async update(
    id: string,
    updateStakeholderDto: UpdateStakeholderDto,
  ): Promise<ProjectStakeholder> {
    const stakeholder = await this.findOne(id);
    const { projectId, partnerId, parentStakeholderId, ...updateData } = updateStakeholderDto;

    // If changing project, verify new project exists
    if (projectId && projectId !== stakeholder.projectId) {
      const project = await this.projectRepository.findOne({
        where: { id: projectId },
      });
      if (!project) {
        throw new NotFoundException(`Project with ID "${projectId}" not found`);
      }
      stakeholder.projectId = projectId;
    }

    // If changing partner, verify new partner exists
    if (partnerId !== undefined) {
      if (partnerId) {
        const partner = await this.partnerRepository.findOne({
          where: { id: partnerId },
        });
        if (!partner) {
          throw new NotFoundException(`Partner with ID "${partnerId}" not found`);
        }
      }
      stakeholder.partnerId = partnerId;
    }

    // If changing parent stakeholder, verify it exists and belongs to the same project
    if (parentStakeholderId !== undefined) {
      if (parentStakeholderId) {
        const parentStakeholder = await this.stakeholderRepository.findOne({
          where: { id: parentStakeholderId },
        });
        if (!parentStakeholder) {
          throw new NotFoundException(
            `Parent stakeholder with ID "${parentStakeholderId}" not found`,
          );
        }
        if (parentStakeholder.projectId !== stakeholder.projectId) {
          throw new BadRequestException('Parent stakeholder must belong to the same project');
        }
        // Prevent circular references
        if (parentStakeholderId === id) {
          throw new BadRequestException('Stakeholder cannot be its own parent');
        }
      }
      stakeholder.parentStakeholderId = parentStakeholderId;
    }

    Object.assign(stakeholder, updateData);
    await this.stakeholderRepository.save(stakeholder);
    this.logger.log(`Stakeholder updated: ${stakeholder.id}`);

    return this.findOne(id);
  }

  /**
   * Update stakeholder tier
   */
  async updateTier(id: string, newTier: number): Promise<ProjectStakeholder> {
    if (newTier < 1 || newTier > 3) {
      throw new BadRequestException('Tier must be between 1 and 3');
    }

    const stakeholder = await this.findOne(id);
    stakeholder.tier = newTier;
    await this.stakeholderRepository.save(stakeholder);
    this.logger.log(`Stakeholder tier updated: ${stakeholder.id} -> tier ${newTier}`);

    return this.findOne(id);
  }

  /**
   * Delete a stakeholder
   */
  async remove(id: string): Promise<void> {
    const stakeholder = await this.findOne(id);

    // Check if this stakeholder is a parent to others
    const children = await this.stakeholderRepository.find({
      where: { parentStakeholderId: id },
    });

    if (children.length > 0) {
      // Unlink children before deletion
      for (const child of children) {
        child.parentStakeholderId = undefined as unknown as string;
        await this.stakeholderRepository.save(child);
      }
      this.logger.log(`Unlinked ${children.length} child stakeholders before deletion`);
    }

    await this.stakeholderRepository.remove(stakeholder);
    this.logger.log(`Stakeholder deleted: ${id}`);
  }

  /**
   * Get stakeholders by tier for a project
   */
  async getStakeholdersByTier(projectId: string, tier: number): Promise<ProjectStakeholder[]> {
    // Verify project exists
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });
    if (!project) {
      throw new NotFoundException(`Project with ID "${projectId}" not found`);
    }

    return this.stakeholderRepository.find({
      where: { projectId, tier },
      relations: ['partner', 'parentStakeholder'],
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Get stakeholder tree structure for a project
   */
  async getStakeholderTree(projectId: string): Promise<StakeholderTreeResponseDto> {
    // Verify project exists
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });
    if (!project) {
      throw new NotFoundException(`Project with ID "${projectId}" not found`);
    }

    // Fetch all stakeholders for the project
    const allStakeholders = await this.stakeholderRepository.find({
      where: { projectId },
      relations: ['partner'],
      order: { tier: 'ASC', createdAt: 'ASC' },
    });

    // Convert to a map for easy lookup
    const stakeholderMap = new Map<string, ProjectStakeholder>();
    allStakeholders.forEach((s) => stakeholderMap.set(s.id, s));

    // Build tree nodes for each stakeholder
    const buildNode = (stakeholder: ProjectStakeholder): StakeholderNodeDto => {
      // Find children
      const children = allStakeholders
        .filter((s) => s.parentStakeholderId === stakeholder.id)
        .map((child) => buildNode(child));

      return {
        id: stakeholder.id,
        partner: stakeholder.partner
          ? {
              id: stakeholder.partner.id,
              name: stakeholder.partner.name,
              email: stakeholder.partner.email,
              companyName: stakeholder.partner.companyName,
            }
          : null,
        roleDescription: stakeholder.roleDescription || '',
        contractAmount: stakeholder.contractAmount,
        isPrimary: stakeholder.isPrimary,
        tier: stakeholder.tier,
        parentStakeholderId: stakeholder.parentStakeholderId,
        children,
        createdAt: stakeholder.createdAt,
        updatedAt: stakeholder.updatedAt,
      };
    };

    // Group stakeholders by tier
    const tier1 = allStakeholders.filter((s) => s.tier === 1).map((s) => buildNode(s));
    const tier2 = allStakeholders.filter((s) => s.tier === 2).map((s) => buildNode(s));
    const tier3 = allStakeholders.filter((s) => s.tier === 3).map((s) => buildNode(s));

    return {
      tier1,
      tier2,
      tier3,
    };
  }

  /**
   * Get primary stakeholders for a project
   */
  async getPrimaryStakeholders(projectId: string): Promise<ProjectStakeholder[]> {
    // Verify project exists
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });
    if (!project) {
      throw new NotFoundException(`Project with ID "${projectId}" not found`);
    }

    return this.stakeholderRepository.find({
      where: { projectId, isPrimary: true },
      relations: ['partner'],
      order: { tier: 'ASC', createdAt: 'ASC' },
    });
  }
}
