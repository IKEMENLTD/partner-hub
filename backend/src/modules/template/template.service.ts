import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Template, TemplatePhase, TemplateTask } from './entities/template.entity';
import { Project } from '../project/entities/project.entity';
import { Task } from '../task/entities/task.entity';
import { Partner } from '../partner/entities/partner.entity';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  ApplyTemplateDto,
  QueryTemplateDto,
} from './dto';
import { PaginatedResponseDto } from '../../common/dto/pagination.dto';
import { ProjectStatus } from '../project/enums/project-status.enum';
import { TaskStatus, TaskType } from '../task/enums/task-status.enum';

// SECURITY FIX: Whitelist of allowed sort columns to prevent SQL injection
const ALLOWED_SORT_COLUMNS = [
  'createdAt',
  'updatedAt',
  'name',
  'projectType',
  'isActive',
];

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);

  constructor(
    @InjectRepository(Template)
    private templateRepository: Repository<Template>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(Partner)
    private partnerRepository: Repository<Partner>,
  ) {}

  async create(createTemplateDto: CreateTemplateDto): Promise<Template> {
    const template = this.templateRepository.create(createTemplateDto);
    await this.templateRepository.save(template);
    this.logger.log(`Template created: ${template.name} (${template.id})`);
    return this.findOne(template.id);
  }

  async findAll(queryDto: QueryTemplateDto): Promise<PaginatedResponseDto<Template>> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      search,
      projectType,
      isActive,
    } = queryDto;

    const queryBuilder = this.templateRepository
      .createQueryBuilder('template');

    // Apply filters
    if (search) {
      queryBuilder.andWhere(
        '(template.name ILIKE :search OR template.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (projectType) {
      queryBuilder.andWhere('template.projectType = :projectType', { projectType });
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('template.isActive = :isActive', { isActive });
    }

    // SECURITY FIX: Validate sortBy against whitelist to prevent SQL injection
    const safeSortBy = ALLOWED_SORT_COLUMNS.includes(sortBy) ? sortBy : 'createdAt';
    queryBuilder.orderBy(`template.${safeSortBy}`, sortOrder);

    // Apply pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return new PaginatedResponseDto(data, total, page, limit);
  }

  async findOne(id: string): Promise<Template> {
    const template = await this.templateRepository.findOne({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException(`Template with ID "${id}" not found`);
    }

    return template;
  }

  async update(id: string, updateTemplateDto: UpdateTemplateDto): Promise<Template> {
    const template = await this.findOne(id);

    Object.assign(template, updateTemplateDto);
    await this.templateRepository.save(template);

    this.logger.log(`Template updated: ${template.name} (${template.id})`);

    return this.findOne(template.id);
  }

  async remove(id: string): Promise<void> {
    const template = await this.findOne(id);
    await this.templateRepository.remove(template);
    this.logger.log(`Template deleted: ${template.name} (${id})`);
  }

  /**
   * テンプレートを適用して新しいプロジェクトとタスクを作成する
   * @param id テンプレートID
   * @param applyTemplateDto 適用パラメータ
   * @param createdById 作成者のユーザーID
   * @returns 作成されたプロジェクト
   */
  async applyTemplate(
    id: string,
    applyTemplateDto: ApplyTemplateDto,
    createdById: string,
  ): Promise<Project> {
    const template = await this.findOne(id);

    if (!template.isActive) {
      throw new BadRequestException('Cannot apply an inactive template');
    }

    // Validate partner IDs if provided
    let partners: Partner[] = [];
    const partnerIds = applyTemplateDto.partnerIds ||
      (applyTemplateDto.partnerId ? [applyTemplateDto.partnerId] : []);

    if (partnerIds.length > 0) {
      partners = await this.partnerRepository.findBy({
        id: In(partnerIds),
      });
      if (partners.length !== partnerIds.length) {
        throw new BadRequestException('Some partner IDs are invalid');
      }
    }

    // Create the project
    const project = this.projectRepository.create({
      name: applyTemplateDto.projectName,
      description: applyTemplateDto.projectDescription,
      projectType: template.projectType,
      status: ProjectStatus.DRAFT,
      startDate: applyTemplateDto.startDate ? new Date(applyTemplateDto.startDate) : undefined,
      endDate: applyTemplateDto.endDate ? new Date(applyTemplateDto.endDate) : undefined,
      budget: applyTemplateDto.budget,
      managerId: applyTemplateDto.managerId,
      ownerId: createdById,
      createdById,
      partners,
    });

    await this.projectRepository.save(project);
    this.logger.log(`Project created from template: ${project.name} (${project.id})`);

    // Create tasks from template phases
    if (template.phases && template.phases.length > 0) {
      await this.createTasksFromTemplate(project.id, template.phases, createdById, applyTemplateDto.startDate);
    }

    // Reload project with relations
    const createdProject = await this.projectRepository.findOne({
      where: { id: project.id },
      relations: ['owner', 'manager', 'partners', 'createdBy'],
    });

    return createdProject!;
  }

  /**
   * テンプレートのフェーズ定義からタスクを作成する
   */
  private async createTasksFromTemplate(
    projectId: string,
    phases: TemplatePhase[],
    createdById: string,
    projectStartDate?: string,
  ): Promise<void> {
    // Sort phases by order
    const sortedPhases = [...phases].sort((a, b) => a.order - b.order);

    let currentDate = projectStartDate ? new Date(projectStartDate) : new Date();

    for (const phase of sortedPhases) {
      // Create a parent task for the phase
      const phaseTask = this.taskRepository.create({
        title: phase.name,
        description: `Phase: ${phase.name}`,
        projectId,
        status: TaskStatus.TODO,
        type: TaskType.FEATURE, // Using FEATURE type for phase-level tasks
        startDate: new Date(currentDate),
        createdById,
      });

      await this.taskRepository.save(phaseTask);
      this.logger.log(`Phase task created: ${phaseTask.title} (${phaseTask.id})`);

      // Sort tasks by order and create them
      const sortedTasks = [...phase.tasks].sort((a, b) => a.order - b.order);

      for (const taskDef of sortedTasks) {
        const taskStartDate = new Date(currentDate);
        const taskDueDate = taskDef.estimatedDays
          ? new Date(currentDate.getTime() + taskDef.estimatedDays * 24 * 60 * 60 * 1000)
          : undefined;

        const task = this.taskRepository.create({
          title: taskDef.name,
          description: taskDef.description,
          projectId,
          parentTaskId: phaseTask.id,
          status: TaskStatus.TODO,
          type: TaskType.TASK,
          startDate: taskStartDate,
          dueDate: taskDueDate,
          estimatedHours: taskDef.estimatedDays ? taskDef.estimatedDays * 8 : 0, // Assume 8 hours per day
          createdById,
        });

        await this.taskRepository.save(task);
        this.logger.log(`Task created: ${task.title} (${task.id})`);

        // Move current date forward based on estimated days
        if (taskDef.estimatedDays) {
          currentDate = new Date(currentDate.getTime() + taskDef.estimatedDays * 24 * 60 * 60 * 1000);
        }
      }

      // Update phase task due date to the end of all its subtasks
      phaseTask.dueDate = new Date(currentDate);
      await this.taskRepository.save(phaseTask);
    }
  }

  /**
   * アクティブなテンプレート一覧を取得する
   */
  async findActiveTemplates(): Promise<Template[]> {
    return this.templateRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  /**
   * プロジェクトタイプ別のテンプレートを取得する
   */
  async findByProjectType(projectType: string): Promise<Template[]> {
    return this.templateRepository.find({
      where: {
        projectType: projectType as any,
        isActive: true,
      },
      order: { name: 'ASC' },
    });
  }
}
