import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../project/entities/project.entity';
import { Partner } from '../partner/entities/partner.entity';
import { Task } from '../task/entities/task.entity';
import { SearchQueryDto, SearchType } from './dto/search-query.dto';
import { UserRole } from '../auth/enums/user-role.enum';

export interface SearchResultItem {
  id: string;
  type: 'project' | 'partner' | 'task';
  name: string;
  description?: string;
  status?: string;
  relevance: number;
  metadata?: Record<string, any>;
}

export interface SearchResults {
  projects: SearchResultItem[];
  partners: SearchResultItem[];
  tasks: SearchResultItem[];
  total: number;
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(Partner)
    private readonly partnerRepository: Repository<Partner>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
  ) {}

  async search(
    query: SearchQueryDto,
    userId: string,
    userRole: string,
    organizationId?: string,
  ): Promise<SearchResults> {
    const { q, type, limit } = query;
    const searchTerm = `%${q}%`;

    this.logger.debug(
      `Search request: q="${q}", type="${type}", userId="${userId}", userRole="${userRole}", organizationId="${organizationId}"`,
    );

    const results: SearchResults = {
      projects: [],
      partners: [],
      tasks: [],
      total: 0,
    };

    // Search projects
    if (type === SearchType.ALL || type === SearchType.PROJECTS) {
      results.projects = await this.searchProjects(searchTerm, q, limit || 10, userId, userRole);
    }

    // Search partners
    if (type === SearchType.ALL || type === SearchType.PARTNERS) {
      results.partners = await this.searchPartners(searchTerm, q, limit || 10, organizationId);
    }

    // Search tasks
    if (type === SearchType.ALL || type === SearchType.TASKS) {
      results.tasks = await this.searchTasks(searchTerm, q, limit || 10, userId, userRole);
    }

    results.total = results.projects.length + results.partners.length + results.tasks.length;

    this.logger.debug(
      `Search results: projects=${results.projects.length}, partners=${results.partners.length}, tasks=${results.tasks.length}, total=${results.total}`,
    );

    return results;
  }

  private async searchProjects(
    searchTerm: string,
    originalQuery: string,
    limit: number,
    userId: string,
    userRole: string,
  ): Promise<SearchResultItem[]> {
    const queryBuilder = this.projectRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.owner', 'owner')
      .leftJoinAndSelect('project.manager', 'manager')
      .where('project.deletedAt IS NULL')
      .andWhere('(project.name ILIKE :searchTerm OR project.description ILIKE :searchTerm)', {
        searchTerm,
      });

    // Role-based filtering
    if (userRole !== UserRole.ADMIN && userRole !== UserRole.MANAGER) {
      this.logger.debug(`Applying role filter for non-admin/manager user: userId="${userId}"`);
      queryBuilder.andWhere(
        '(project.ownerId = :userId OR project.managerId = :userId OR project.createdById = :userId)',
        { userId },
      );
    } else {
      this.logger.debug(`Skipping role filter - user is admin or manager`);
    }

    // Order by updated date (most recent first) and take limit
    queryBuilder.orderBy('project.updatedAt', 'DESC').take(limit);

    const projects = await queryBuilder.getMany();

    return projects.map((project) => ({
      id: project.id,
      type: 'project' as const,
      name: project.name,
      description: project.description?.substring(0, 200),
      status: project.status,
      relevance: this.calculateRelevance(originalQuery, project.name, project.description),
      metadata: {
        ownerId: project.ownerId,
        ownerName: project.owner?.fullName,
        managerId: project.managerId,
        managerName: project.manager?.fullName,
        progress: project.progress,
        healthScore: project.healthScore,
      },
    }));
  }

  private async searchPartners(
    searchTerm: string,
    originalQuery: string,
    limit: number,
    organizationId?: string,
  ): Promise<SearchResultItem[]> {
    const queryBuilder = this.partnerRepository
      .createQueryBuilder('partner')
      .where('partner.deletedAt IS NULL')
      .andWhere(
        '(partner.companyName ILIKE :searchTerm OR partner.name ILIKE :searchTerm OR partner.email ILIKE :searchTerm)',
        { searchTerm },
      );

    // Organization filtering if provided
    if (organizationId) {
      queryBuilder.andWhere('partner.organizationId = :organizationId', {
        organizationId,
      });
    }

    // Order by updated date (most recent first) and take limit
    queryBuilder.orderBy('partner.updatedAt', 'DESC').take(limit);

    const partners = await queryBuilder.getMany();

    return partners.map((partner) => ({
      id: partner.id,
      type: 'partner' as const,
      name: partner.companyName || partner.name,
      description: partner.description?.substring(0, 200),
      status: partner.status,
      relevance: this.calculateRelevance(
        originalQuery,
        partner.companyName || partner.name,
        partner.description,
        partner.name,
      ),
      metadata: {
        email: partner.email,
        contactPerson: partner.name,
        companyName: partner.companyName,
        type: partner.type,
        rating: partner.rating,
      },
    }));
  }

  private async searchTasks(
    searchTerm: string,
    originalQuery: string,
    limit: number,
    userId: string,
    userRole: string,
  ): Promise<SearchResultItem[]> {
    const queryBuilder = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.project', 'project')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .where('task.deletedAt IS NULL')
      .andWhere('(task.title ILIKE :searchTerm OR task.description ILIKE :searchTerm)', {
        searchTerm,
      });

    // Role-based filtering
    if (userRole !== UserRole.ADMIN && userRole !== UserRole.MANAGER) {
      queryBuilder.andWhere('(task.assigneeId = :userId OR task.createdById = :userId)', {
        userId,
      });
    }

    // Order by due date (soonest first) and updated date, then take limit
    queryBuilder
      .orderBy('task.dueDate', 'ASC', 'NULLS LAST')
      .addOrderBy('task.updatedAt', 'DESC')
      .take(limit);

    const tasks = await queryBuilder.getMany();

    return tasks.map((task) => ({
      id: task.id,
      type: 'task' as const,
      name: task.title,
      description: task.description?.substring(0, 200),
      status: task.status,
      relevance: this.calculateRelevance(originalQuery, task.title, task.description),
      metadata: {
        projectId: task.projectId,
        projectName: task.project?.name,
        assigneeId: task.assigneeId,
        assigneeName: task.assignee?.fullName,
        dueDate: task.dueDate,
        priority: task.priority,
      },
    }));
  }

  /**
   * Calculate relevance score based on how well the query matches the content
   * Higher score = more relevant
   */
  private calculateRelevance(query: string, ...fields: (string | undefined | null)[]): number {
    const lowerQuery = query.toLowerCase();
    let score = 0;

    for (const field of fields) {
      if (!field) continue;
      const lowerField = field.toLowerCase();

      // Exact match in name/title gets highest score
      if (lowerField === lowerQuery) {
        score += 100;
      }
      // Starts with query
      else if (lowerField.startsWith(lowerQuery)) {
        score += 80;
      }
      // Contains as whole word
      else if (new RegExp(`\\b${this.escapeRegex(lowerQuery)}\\b`).test(lowerField)) {
        score += 60;
      }
      // Contains query
      else if (lowerField.includes(lowerQuery)) {
        score += 40;
      }
    }

    return score;
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
