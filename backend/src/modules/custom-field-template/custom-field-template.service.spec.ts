import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CustomFieldTemplateService } from './custom-field-template.service';
import {
  CustomFieldTemplate,
  CustomFieldDefinition,
} from './entities/custom-field-template.entity';
import { CreateCustomFieldTemplateDto, QueryCustomFieldTemplateDto } from './dto';
import { ResourceNotFoundException } from '../../common/exceptions/resource-not-found.exception';

// Mock uuid to return predictable values
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));

describe('CustomFieldTemplateService', () => {
  let service: CustomFieldTemplateService;
  let templateRepository: Record<string, jest.Mock>;

  const now = new Date('2026-02-12T00:00:00Z');

  const mockFields: CustomFieldDefinition[] = [
    {
      id: 'field-1',
      name: '補助金名',
      type: 'text',
      required: true,
      order: 0,
      options: undefined,
    },
    {
      id: 'field-2',
      name: '金額',
      type: 'number',
      required: false,
      order: 1,
      options: undefined,
    },
  ];

  const mockTemplate: Partial<CustomFieldTemplate> = {
    id: 'template-1',
    name: '補助金案件フィールド',
    description: '補助金申請案件用のカスタムフィールドセット',
    fields: mockFields,
    isActive: true,
    usageCount: 5,
    organizationId: 'org-1',
    createdById: 'user-1',
    createdBy: { id: 'user-1', displayName: 'Test User' } as any,
    createdAt: now,
    updatedAt: now,
  };

  // QueryBuilder mock setup
  const createMockQueryBuilder = () => {
    const qb: Record<string, jest.Mock> = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    return qb;
  };

  const mockTemplateRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomFieldTemplateService,
        {
          provide: getRepositoryToken(CustomFieldTemplate),
          useValue: mockTemplateRepository,
        },
      ],
    }).compile();

    service = module.get<CustomFieldTemplateService>(CustomFieldTemplateService);
    templateRepository = module.get(getRepositoryToken(CustomFieldTemplate));

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // =============================================
  // create
  // =============================================

  describe('create', () => {
    const createDto: CreateCustomFieldTemplateDto = {
      name: '補助金案件フィールド',
      description: '補助金申請案件用のカスタムフィールドセット',
      fields: [
        { name: '補助金名', type: 'text', required: true, order: 0 },
        { name: '金額', type: 'number', required: false, order: 1 },
      ],
    };

    it('should create a custom field template and return it with relations', async () => {
      const createdEntity = { ...mockTemplate, id: 'template-new' };
      mockTemplateRepository.create.mockReturnValue(createdEntity);
      mockTemplateRepository.save.mockResolvedValue(createdEntity);
      mockTemplateRepository.findOne.mockResolvedValue(createdEntity);

      const result = await service.create(createDto, 'user-1', 'org-1');

      expect(mockTemplateRepository.create).toHaveBeenCalledWith({
        name: createDto.name,
        description: createDto.description,
        fields: expect.arrayContaining([
          expect.objectContaining({
            id: 'mock-uuid',
            name: '補助金名',
            type: 'text',
            required: true,
            order: 0,
          }),
          expect.objectContaining({
            id: 'mock-uuid',
            name: '金額',
            type: 'number',
            required: false,
            order: 1,
          }),
        ]),
        createdById: 'user-1',
        organizationId: 'org-1',
      });
      expect(mockTemplateRepository.save).toHaveBeenCalledWith(createdEntity);
      expect(mockTemplateRepository.findOne).toHaveBeenCalled();
      expect(result).toEqual(createdEntity);
    });

    it('should assign UUIDs to field definitions', async () => {
      const createdEntity = { ...mockTemplate };
      mockTemplateRepository.create.mockReturnValue(createdEntity);
      mockTemplateRepository.save.mockResolvedValue(createdEntity);
      mockTemplateRepository.findOne.mockResolvedValue(createdEntity);

      await service.create(createDto, 'user-1');

      const createCall = mockTemplateRepository.create.mock.calls[0][0];
      expect(createCall.fields).toHaveLength(2);
      createCall.fields.forEach((field: CustomFieldDefinition) => {
        expect(field.id).toBe('mock-uuid');
      });
    });

    it('should default required to false when not specified', async () => {
      const dtoWithoutRequired: CreateCustomFieldTemplateDto = {
        name: 'テスト',
        fields: [{ name: 'フィールド', type: 'text', order: 0 }],
      };

      const createdEntity = { ...mockTemplate };
      mockTemplateRepository.create.mockReturnValue(createdEntity);
      mockTemplateRepository.save.mockResolvedValue(createdEntity);
      mockTemplateRepository.findOne.mockResolvedValue(createdEntity);

      await service.create(dtoWithoutRequired, 'user-1');

      const createCall = mockTemplateRepository.create.mock.calls[0][0];
      expect(createCall.fields[0].required).toBe(false);
    });

    it('should default order to index when not specified', async () => {
      const dtoWithoutOrder: CreateCustomFieldTemplateDto = {
        name: 'テスト',
        fields: [
          { name: 'フィールド1', type: 'text', order: undefined as any },
          { name: 'フィールド2', type: 'number', order: undefined as any },
        ],
      };

      const createdEntity = { ...mockTemplate };
      mockTemplateRepository.create.mockReturnValue(createdEntity);
      mockTemplateRepository.save.mockResolvedValue(createdEntity);
      mockTemplateRepository.findOne.mockResolvedValue(createdEntity);

      await service.create(dtoWithoutOrder, 'user-1');

      const createCall = mockTemplateRepository.create.mock.calls[0][0];
      expect(createCall.fields[0].order).toBe(0);
      expect(createCall.fields[1].order).toBe(1);
    });

    it('should create template without organizationId', async () => {
      const createdEntity = { ...mockTemplate, organizationId: undefined };
      mockTemplateRepository.create.mockReturnValue(createdEntity);
      mockTemplateRepository.save.mockResolvedValue(createdEntity);
      mockTemplateRepository.findOne.mockResolvedValue(createdEntity);

      await service.create(createDto, 'user-1');

      const createCall = mockTemplateRepository.create.mock.calls[0][0];
      expect(createCall.organizationId).toBeUndefined();
    });

    it('should preserve options for select type fields', async () => {
      const dtoWithOptions: CreateCustomFieldTemplateDto = {
        name: 'セレクトフィールド',
        fields: [
          {
            name: 'ステータス',
            type: 'select',
            order: 0,
            options: ['進行中', '完了', '保留'],
          },
        ],
      };

      const createdEntity = { ...mockTemplate };
      mockTemplateRepository.create.mockReturnValue(createdEntity);
      mockTemplateRepository.save.mockResolvedValue(createdEntity);
      mockTemplateRepository.findOne.mockResolvedValue(createdEntity);

      await service.create(dtoWithOptions, 'user-1', 'org-1');

      const createCall = mockTemplateRepository.create.mock.calls[0][0];
      expect(createCall.fields[0].options).toEqual(['進行中', '完了', '保留']);
    });

    it('should throw when repository save fails', async () => {
      const error = new Error('Database connection failed');
      mockTemplateRepository.create.mockReturnValue({});
      mockTemplateRepository.save.mockRejectedValue(error);

      await expect(service.create(createDto, 'user-1')).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should throw ResourceNotFoundException when findOne fails after create', async () => {
      const createdEntity = { ...mockTemplate, id: 'template-new' };
      mockTemplateRepository.create.mockReturnValue(createdEntity);
      mockTemplateRepository.save.mockResolvedValue(createdEntity);
      mockTemplateRepository.findOne.mockResolvedValue(null);

      await expect(service.create(createDto, 'user-1')).rejects.toThrow(
        ResourceNotFoundException,
      );
    });
  });

  // =============================================
  // findAll
  // =============================================

  describe('findAll', () => {
    it('should return paginated results with default query options', async () => {
      const qb = createMockQueryBuilder();
      qb.getManyAndCount.mockResolvedValue([[mockTemplate], 1]);
      mockTemplateRepository.createQueryBuilder.mockReturnValue(qb);

      const queryDto: QueryCustomFieldTemplateDto = {};
      const result = await service.findAll(queryDto);

      expect(mockTemplateRepository.createQueryBuilder).toHaveBeenCalledWith('template');
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('template.createdBy', 'createdBy');
      expect(qb.orderBy).toHaveBeenCalledWith('template.usageCount', 'DESC');
      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(20);
      expect(result.data).toEqual([mockTemplate]);
      expect(result.pagination.total).toBe(1);
    });

    it('should filter by organizationId when provided', async () => {
      const qb = createMockQueryBuilder();
      mockTemplateRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({}, 'org-1');

      expect(qb.andWhere).toHaveBeenCalledWith(
        'template.organizationId = :organizationId',
        { organizationId: 'org-1' },
      );
    });

    it('should not filter by organizationId when not provided', async () => {
      const qb = createMockQueryBuilder();
      mockTemplateRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({});

      const orgCalls = qb.andWhere.mock.calls.filter(
        (call: any[]) => typeof call[0] === 'string' && call[0].includes('organizationId'),
      );
      expect(orgCalls).toHaveLength(0);
    });

    it('should filter by search keyword with ILIKE', async () => {
      const qb = createMockQueryBuilder();
      mockTemplateRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ search: '補助金' });

      expect(qb.andWhere).toHaveBeenCalledWith('template.name ILIKE :search', {
        search: '%補助金%',
      });
    });

    it('should not apply search filter when search is not provided', async () => {
      const qb = createMockQueryBuilder();
      mockTemplateRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({});

      const searchCalls = qb.andWhere.mock.calls.filter(
        (call: any[]) => typeof call[0] === 'string' && call[0].includes('ILIKE'),
      );
      expect(searchCalls).toHaveLength(0);
    });

    it('should filter by isActive when provided as true', async () => {
      const qb = createMockQueryBuilder();
      mockTemplateRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ isActive: true });

      expect(qb.andWhere).toHaveBeenCalledWith('template.isActive = :isActive', {
        isActive: true,
      });
    });

    it('should filter by isActive when provided as false', async () => {
      const qb = createMockQueryBuilder();
      mockTemplateRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ isActive: false });

      expect(qb.andWhere).toHaveBeenCalledWith('template.isActive = :isActive', {
        isActive: false,
      });
    });

    it('should not filter by isActive when undefined', async () => {
      const qb = createMockQueryBuilder();
      mockTemplateRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ isActive: undefined });

      const isActiveCalls = qb.andWhere.mock.calls.filter(
        (call: any[]) => typeof call[0] === 'string' && call[0].includes('isActive'),
      );
      expect(isActiveCalls).toHaveLength(0);
    });

    it('should sort by usageCount by default', async () => {
      const qb = createMockQueryBuilder();
      mockTemplateRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({});

      expect(qb.orderBy).toHaveBeenCalledWith('template.usageCount', 'DESC');
    });

    it('should sort by name when sortBy is name', async () => {
      const qb = createMockQueryBuilder();
      mockTemplateRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ sortBy: 'name' });

      expect(qb.orderBy).toHaveBeenCalledWith('template.name', 'DESC');
    });

    it('should sort by createdAt when sortBy is createdAt', async () => {
      const qb = createMockQueryBuilder();
      mockTemplateRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ sortBy: 'createdAt' });

      expect(qb.orderBy).toHaveBeenCalledWith('template.createdAt', 'DESC');
    });

    it('should default to createdAt sort for unknown sortBy values', async () => {
      const qb = createMockQueryBuilder();
      mockTemplateRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ sortBy: 'unknownField' as any });

      expect(qb.orderBy).toHaveBeenCalledWith('template.createdAt', 'DESC');
    });

    it('should apply ASC sort order', async () => {
      const qb = createMockQueryBuilder();
      mockTemplateRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ sortOrder: 'ASC' });

      expect(qb.orderBy).toHaveBeenCalledWith('template.usageCount', 'ASC');
    });

    it('should apply correct pagination offset', async () => {
      const qb = createMockQueryBuilder();
      mockTemplateRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ page: 3, limit: 10 });

      expect(qb.skip).toHaveBeenCalledWith(20); // (3 - 1) * 10
      expect(qb.take).toHaveBeenCalledWith(10);
    });

    it('should handle page 1 with skip 0', async () => {
      const qb = createMockQueryBuilder();
      mockTemplateRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ page: 1, limit: 20 });

      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(20);
    });

    it('should return correct PaginatedResponseDto structure', async () => {
      const templates = [
        { ...mockTemplate, id: 'template-1' },
        { ...mockTemplate, id: 'template-2' },
      ];
      const qb = createMockQueryBuilder();
      qb.getManyAndCount.mockResolvedValue([templates, 50]);
      mockTemplateRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll({ page: 2, limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.pagination.total).toBe(50);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.offset).toBe(10); // (2 - 1) * 10
      expect(result.pagination.hasMore).toBe(true); // 10 + 2 < 50
    });

    it('should return hasMore false when on the last page', async () => {
      const templates = [{ ...mockTemplate, id: 'template-1' }];
      const qb = createMockQueryBuilder();
      qb.getManyAndCount.mockResolvedValue([templates, 1]);
      mockTemplateRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.pagination.hasMore).toBe(false);
    });

    it('should return empty data when no templates found', async () => {
      const qb = createMockQueryBuilder();
      qb.getManyAndCount.mockResolvedValue([[], 0]);
      mockTemplateRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll({});

      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });

    it('should apply all filters simultaneously', async () => {
      const qb = createMockQueryBuilder();
      qb.getManyAndCount.mockResolvedValue([[], 0]);
      mockTemplateRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(
        {
          page: 2,
          limit: 5,
          search: '補助金',
          isActive: true,
          sortBy: 'name',
          sortOrder: 'ASC',
        },
        'org-1',
      );

      expect(qb.andWhere).toHaveBeenCalledWith(
        'template.organizationId = :organizationId',
        { organizationId: 'org-1' },
      );
      expect(qb.andWhere).toHaveBeenCalledWith('template.name ILIKE :search', {
        search: '%補助金%',
      });
      expect(qb.andWhere).toHaveBeenCalledWith('template.isActive = :isActive', {
        isActive: true,
      });
      expect(qb.orderBy).toHaveBeenCalledWith('template.name', 'ASC');
      expect(qb.skip).toHaveBeenCalledWith(5); // (2 - 1) * 5
      expect(qb.take).toHaveBeenCalledWith(5);
    });
  });

  // =============================================
  // findOne
  // =============================================

  describe('findOne', () => {
    it('should return a template by id with createdBy relation', async () => {
      mockTemplateRepository.findOne.mockResolvedValue(mockTemplate);

      const result = await service.findOne('template-1');

      expect(mockTemplateRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'template-1' },
        relations: ['createdBy'],
      });
      expect(result).toEqual(mockTemplate);
    });

    it('should throw ResourceNotFoundException when template not found', async () => {
      mockTemplateRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('nonexistent-id')).rejects.toThrow(
        ResourceNotFoundException,
      );
    });

    it('should include resourceType and resourceId in the exception', async () => {
      mockTemplateRepository.findOne.mockResolvedValue(null);

      try {
        await service.findOne('nonexistent-id');
        fail('Expected ResourceNotFoundException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ResourceNotFoundException);
        const rnfError = error as ResourceNotFoundException;
        expect(rnfError.resourceType).toBe('CustomFieldTemplate');
        expect(rnfError.resourceId).toBe('nonexistent-id');
      }
    });

    it('should return template with all fields populated', async () => {
      const fullTemplate: Partial<CustomFieldTemplate> = {
        id: 'template-full',
        name: 'Full Template',
        description: 'A complete template',
        fields: mockFields,
        isActive: true,
        usageCount: 10,
        organizationId: 'org-1',
        createdById: 'user-1',
        createdBy: { id: 'user-1' } as any,
        createdAt: now,
        updatedAt: now,
      };
      mockTemplateRepository.findOne.mockResolvedValue(fullTemplate);

      const result = await service.findOne('template-full');

      expect(result.name).toBe('Full Template');
      expect(result.fields).toHaveLength(2);
      expect(result.isActive).toBe(true);
      expect(result.usageCount).toBe(10);
    });
  });

  // =============================================
  // remove
  // =============================================

  describe('remove', () => {
    it('should remove an existing template', async () => {
      mockTemplateRepository.findOne.mockResolvedValue(mockTemplate);
      mockTemplateRepository.remove.mockResolvedValue(mockTemplate);

      await service.remove('template-1');

      expect(mockTemplateRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'template-1' },
        relations: ['createdBy'],
      });
      expect(mockTemplateRepository.remove).toHaveBeenCalledWith(mockTemplate);
    });

    it('should return void on successful removal', async () => {
      mockTemplateRepository.findOne.mockResolvedValue(mockTemplate);
      mockTemplateRepository.remove.mockResolvedValue(mockTemplate);

      const result = await service.remove('template-1');

      expect(result).toBeUndefined();
    });

    it('should throw ResourceNotFoundException when template does not exist', async () => {
      mockTemplateRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('nonexistent-id')).rejects.toThrow(
        ResourceNotFoundException,
      );
      expect(mockTemplateRepository.remove).not.toHaveBeenCalled();
    });

    it('should propagate repository errors during removal', async () => {
      mockTemplateRepository.findOne.mockResolvedValue(mockTemplate);
      mockTemplateRepository.remove.mockRejectedValue(
        new Error('Foreign key constraint violation'),
      );

      await expect(service.remove('template-1')).rejects.toThrow(
        'Foreign key constraint violation',
      );
    });
  });

  // =============================================
  // incrementUsageCount
  // =============================================

  describe('incrementUsageCount', () => {
    it('should increment usage count by 1 and save', async () => {
      const template = { ...mockTemplate, usageCount: 5 };
      mockTemplateRepository.findOne.mockResolvedValue(template);
      mockTemplateRepository.save.mockResolvedValue({ ...template, usageCount: 6 });

      const result = await service.incrementUsageCount('template-1');

      expect(template.usageCount).toBe(6);
      expect(mockTemplateRepository.save).toHaveBeenCalledWith(template);
      expect(result).toEqual(template);
    });

    it('should increment from 0 to 1', async () => {
      const template = { ...mockTemplate, usageCount: 0 };
      mockTemplateRepository.findOne.mockResolvedValue(template);
      mockTemplateRepository.save.mockResolvedValue({ ...template, usageCount: 1 });

      await service.incrementUsageCount('template-1');

      expect(template.usageCount).toBe(1);
      expect(mockTemplateRepository.save).toHaveBeenCalled();
    });

    it('should throw ResourceNotFoundException when template does not exist', async () => {
      mockTemplateRepository.findOne.mockResolvedValue(null);

      await expect(service.incrementUsageCount('nonexistent-id')).rejects.toThrow(
        ResourceNotFoundException,
      );
      expect(mockTemplateRepository.save).not.toHaveBeenCalled();
    });

    it('should propagate repository save errors', async () => {
      const template = { ...mockTemplate, usageCount: 5 };
      mockTemplateRepository.findOne.mockResolvedValue(template);
      mockTemplateRepository.save.mockRejectedValue(new Error('Database write error'));

      await expect(service.incrementUsageCount('template-1')).rejects.toThrow(
        'Database write error',
      );
    });

    it('should return the updated template', async () => {
      const template = { ...mockTemplate, usageCount: 99 };
      mockTemplateRepository.findOne.mockResolvedValue(template);
      mockTemplateRepository.save.mockResolvedValue(template);

      const result = await service.incrementUsageCount('template-1');

      expect(result.usageCount).toBe(100);
    });
  });

  // =============================================
  // activate
  // =============================================

  describe('activate', () => {
    it('should set isActive to true and save', async () => {
      const template = { ...mockTemplate, isActive: false };
      mockTemplateRepository.findOne.mockResolvedValue(template);
      mockTemplateRepository.save.mockResolvedValue({ ...template, isActive: true });

      const result = await service.activate('template-1');

      expect(template.isActive).toBe(true);
      expect(mockTemplateRepository.save).toHaveBeenCalledWith(template);
      expect(result).toEqual(template);
    });

    it('should keep isActive as true when already active', async () => {
      const template = { ...mockTemplate, isActive: true };
      mockTemplateRepository.findOne.mockResolvedValue(template);
      mockTemplateRepository.save.mockResolvedValue(template);

      const result = await service.activate('template-1');

      expect(result.isActive).toBe(true);
      expect(mockTemplateRepository.save).toHaveBeenCalledWith(template);
    });

    it('should throw ResourceNotFoundException when template does not exist', async () => {
      mockTemplateRepository.findOne.mockResolvedValue(null);

      await expect(service.activate('nonexistent-id')).rejects.toThrow(
        ResourceNotFoundException,
      );
      expect(mockTemplateRepository.save).not.toHaveBeenCalled();
    });

    it('should return the activated template', async () => {
      const template = { ...mockTemplate, isActive: false };
      mockTemplateRepository.findOne.mockResolvedValue(template);
      mockTemplateRepository.save.mockResolvedValue(template);

      const result = await service.activate('template-1');

      expect(result.isActive).toBe(true);
      expect(result.name).toBe(mockTemplate.name);
    });

    it('should propagate repository save errors', async () => {
      const template = { ...mockTemplate, isActive: false };
      mockTemplateRepository.findOne.mockResolvedValue(template);
      mockTemplateRepository.save.mockRejectedValue(new Error('Save failed'));

      await expect(service.activate('template-1')).rejects.toThrow('Save failed');
    });
  });

  // =============================================
  // deactivate
  // =============================================

  describe('deactivate', () => {
    it('should set isActive to false and save', async () => {
      const template = { ...mockTemplate, isActive: true };
      mockTemplateRepository.findOne.mockResolvedValue(template);
      mockTemplateRepository.save.mockResolvedValue({ ...template, isActive: false });

      const result = await service.deactivate('template-1');

      expect(template.isActive).toBe(false);
      expect(mockTemplateRepository.save).toHaveBeenCalledWith(template);
      expect(result).toEqual(template);
    });

    it('should keep isActive as false when already inactive', async () => {
      const template = { ...mockTemplate, isActive: false };
      mockTemplateRepository.findOne.mockResolvedValue(template);
      mockTemplateRepository.save.mockResolvedValue(template);

      const result = await service.deactivate('template-1');

      expect(result.isActive).toBe(false);
      expect(mockTemplateRepository.save).toHaveBeenCalledWith(template);
    });

    it('should throw ResourceNotFoundException when template does not exist', async () => {
      mockTemplateRepository.findOne.mockResolvedValue(null);

      await expect(service.deactivate('nonexistent-id')).rejects.toThrow(
        ResourceNotFoundException,
      );
      expect(mockTemplateRepository.save).not.toHaveBeenCalled();
    });

    it('should return the deactivated template', async () => {
      const template = { ...mockTemplate, isActive: true };
      mockTemplateRepository.findOne.mockResolvedValue(template);
      mockTemplateRepository.save.mockResolvedValue(template);

      const result = await service.deactivate('template-1');

      expect(result.isActive).toBe(false);
      expect(result.name).toBe(mockTemplate.name);
    });

    it('should propagate repository save errors', async () => {
      const template = { ...mockTemplate, isActive: true };
      mockTemplateRepository.findOne.mockResolvedValue(template);
      mockTemplateRepository.save.mockRejectedValue(new Error('Connection timeout'));

      await expect(service.deactivate('template-1')).rejects.toThrow('Connection timeout');
    });
  });

  // =============================================
  // Field type coverage
  // =============================================

  describe('field type coverage', () => {
    it.each(['text', 'number', 'date', 'select'] as const)(
      'should create template with %s field type',
      async (fieldType) => {
        const dto: CreateCustomFieldTemplateDto = {
          name: `${fieldType}テンプレート`,
          fields: [
            {
              name: `${fieldType}フィールド`,
              type: fieldType,
              order: 0,
              ...(fieldType === 'select' ? { options: ['A', 'B', 'C'] } : {}),
            },
          ],
        };

        const createdEntity = { ...mockTemplate, id: 'template-typed' };
        mockTemplateRepository.create.mockReturnValue(createdEntity);
        mockTemplateRepository.save.mockResolvedValue(createdEntity);
        mockTemplateRepository.findOne.mockResolvedValue(createdEntity);

        await service.create(dto, 'user-1');

        const createCall = mockTemplateRepository.create.mock.calls[0][0];
        expect(createCall.fields[0].type).toBe(fieldType);
      },
    );
  });

  // =============================================
  // Edge cases
  // =============================================

  describe('edge cases', () => {
    it('should handle template with empty fields array', async () => {
      const dto: CreateCustomFieldTemplateDto = {
        name: '空のテンプレート',
        fields: [],
      };

      const createdEntity = { ...mockTemplate, fields: [] };
      mockTemplateRepository.create.mockReturnValue(createdEntity);
      mockTemplateRepository.save.mockResolvedValue(createdEntity);
      mockTemplateRepository.findOne.mockResolvedValue(createdEntity);

      const result = await service.create(dto, 'user-1');

      const createCall = mockTemplateRepository.create.mock.calls[0][0];
      expect(createCall.fields).toEqual([]);
      expect(result).toEqual(createdEntity);
    });

    it('should handle template with no description', async () => {
      const dto: CreateCustomFieldTemplateDto = {
        name: '説明なしテンプレート',
        fields: [{ name: 'field', type: 'text', order: 0 }],
      };

      const createdEntity = { ...mockTemplate, description: undefined };
      mockTemplateRepository.create.mockReturnValue(createdEntity);
      mockTemplateRepository.save.mockResolvedValue(createdEntity);
      mockTemplateRepository.findOne.mockResolvedValue(createdEntity);

      await service.create(dto, 'user-1');

      const createCall = mockTemplateRepository.create.mock.calls[0][0];
      expect(createCall.description).toBeUndefined();
    });

    it('should handle findAll with large page number', async () => {
      const qb = createMockQueryBuilder();
      qb.getManyAndCount.mockResolvedValue([[], 5]);
      mockTemplateRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll({ page: 100, limit: 10 });

      expect(qb.skip).toHaveBeenCalledWith(990); // (100 - 1) * 10
      expect(result.data).toEqual([]);
    });

    it('should handle concurrent increment operations', async () => {
      const template1 = { ...mockTemplate, usageCount: 5 };
      const template2 = { ...mockTemplate, usageCount: 6 };
      mockTemplateRepository.findOne
        .mockResolvedValueOnce(template1)
        .mockResolvedValueOnce(template2);
      mockTemplateRepository.save
        .mockResolvedValueOnce(template1)
        .mockResolvedValueOnce(template2);

      const result1 = await service.incrementUsageCount('template-1');
      const result2 = await service.incrementUsageCount('template-1');

      expect(result1.usageCount).toBe(6);
      expect(result2.usageCount).toBe(7);
    });
  });
});
