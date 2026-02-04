import { Injectable, Logger } from '@nestjs/common';
import { ResourceNotFoundException } from '../../common/exceptions/resource-not-found.exception';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import {
  CustomFieldTemplate,
  CustomFieldDefinition,
} from './entities/custom-field-template.entity';
import { CreateCustomFieldTemplateDto, QueryCustomFieldTemplateDto } from './dto';
import { PaginatedResponseDto } from '../../common/dto/pagination.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CustomFieldTemplateService {
  private readonly logger = new Logger(CustomFieldTemplateService.name);

  constructor(
    @InjectRepository(CustomFieldTemplate)
    private readonly templateRepository: Repository<CustomFieldTemplate>,
  ) {}

  async create(
    createDto: CreateCustomFieldTemplateDto,
    createdById: string,
    organizationId?: string,
  ): Promise<CustomFieldTemplate> {
    // フィールド定義にIDを付与
    const fieldsWithIds: CustomFieldDefinition[] = createDto.fields.map((field, index) => ({
      id: uuidv4(),
      name: field.name,
      type: field.type as CustomFieldDefinition['type'],
      required: field.required ?? false,
      order: field.order ?? index,
      options: field.options,
    }));

    const template = this.templateRepository.create({
      name: createDto.name,
      description: createDto.description,
      fields: fieldsWithIds,
      createdById,
      organizationId,
    });

    await this.templateRepository.save(template);
    this.logger.log(`Custom field template created: ${template.name} (${template.id})`);

    return this.findOne(template.id);
  }

  async findAll(
    queryDto: QueryCustomFieldTemplateDto,
    organizationId?: string,
  ): Promise<PaginatedResponseDto<CustomFieldTemplate>> {
    const {
      page = 1,
      limit = 20,
      search,
      isActive,
      sortBy = 'usageCount',
      sortOrder = 'DESC',
    } = queryDto;

    const queryBuilder = this.templateRepository
      .createQueryBuilder('template')
      .leftJoinAndSelect('template.createdBy', 'createdBy');

    // 組織でフィルタ（同じ会社のテンプレートのみ表示）
    if (organizationId) {
      queryBuilder.andWhere('template.organizationId = :organizationId', { organizationId });
    }

    // 検索
    if (search) {
      queryBuilder.andWhere('template.name ILIKE :search', { search: `%${search}%` });
    }

    // アクティブフラグでフィルタ
    if (isActive !== undefined) {
      queryBuilder.andWhere('template.isActive = :isActive', { isActive });
    }

    // ソート
    const sortColumn =
      sortBy === 'usageCount'
        ? 'template.usageCount'
        : sortBy === 'name'
          ? 'template.name'
          : 'template.createdAt';
    queryBuilder.orderBy(sortColumn, sortOrder);

    // ページネーション
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return new PaginatedResponseDto(data, total, page, limit);
  }

  async findOne(id: string): Promise<CustomFieldTemplate> {
    const template = await this.templateRepository.findOne({
      where: { id },
      relations: ['createdBy'],
    });

    if (!template) {
      throw new ResourceNotFoundException('SYSTEM_001', {
        resourceType: 'CustomFieldTemplate',
        resourceId: id,
        userMessage: 'カスタムフィールドテンプレートが見つかりません',
      });
    }

    return template;
  }

  async remove(id: string): Promise<void> {
    const template = await this.findOne(id);
    await this.templateRepository.remove(template);
    this.logger.log(`Custom field template deleted: ${template.name} (${id})`);
  }

  async incrementUsageCount(id: string): Promise<CustomFieldTemplate> {
    const template = await this.findOne(id);
    template.usageCount += 1;
    await this.templateRepository.save(template);
    this.logger.log(
      `Custom field template usage incremented: ${template.name} -> ${template.usageCount}`,
    );
    return template;
  }

  async deactivate(id: string): Promise<CustomFieldTemplate> {
    const template = await this.findOne(id);
    template.isActive = false;
    await this.templateRepository.save(template);
    this.logger.log(`Custom field template deactivated: ${template.name}`);
    return template;
  }
}
