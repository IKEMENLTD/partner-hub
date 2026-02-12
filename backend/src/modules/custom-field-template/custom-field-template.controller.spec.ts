import { Test, TestingModule } from '@nestjs/testing';
import { CustomFieldTemplateController } from './custom-field-template.controller';
import { CustomFieldTemplateService } from './custom-field-template.service';

describe('CustomFieldTemplateController', () => {
  let controller: CustomFieldTemplateController;

  const mockTemplate = {
    id: 'template-uuid-1',
    name: 'Budget Field',
    fieldType: 'number',
    isActive: true,
    usageCount: 5,
  };

  const mockTemplateService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    incrementUsageCount: jest.fn(),
    activate: jest.fn(),
    deactivate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomFieldTemplateController],
      providers: [
        { provide: CustomFieldTemplateService, useValue: mockTemplateService },
      ],
    }).compile();

    controller = module.get<CustomFieldTemplateController>(CustomFieldTemplateController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a custom field template', async () => {
      const createDto = { name: 'Budget Field', fieldType: 'number' };
      const user = { id: 'user-1', organizationId: 'org-1' } as any;
      mockTemplateService.create.mockResolvedValue(mockTemplate);

      const result = await controller.create(createDto as any, user);

      expect(result).toEqual(mockTemplate);
      expect(mockTemplateService.create).toHaveBeenCalledWith(createDto, 'user-1', 'org-1');
    });
  });

  describe('findAll', () => {
    it('should return template list', async () => {
      const expected = { data: [mockTemplate], total: 1 };
      const user = { organizationId: 'org-1' } as any;
      mockTemplateService.findAll.mockResolvedValue(expected);

      const result = await controller.findAll({} as any, user);

      expect(result).toEqual(expected);
      expect(mockTemplateService.findAll).toHaveBeenCalledWith({}, 'org-1');
    });
  });

  describe('findOne', () => {
    it('should return a template by id', async () => {
      mockTemplateService.findOne.mockResolvedValue(mockTemplate);

      const result = await controller.findOne('template-1', 'org-1');

      expect(result).toEqual(mockTemplate);
      expect(mockTemplateService.findOne).toHaveBeenCalledWith('template-1', 'org-1');
    });

    it('should propagate not found errors', async () => {
      mockTemplateService.findOne.mockRejectedValue(new Error('Not found'));

      await expect(controller.findOne('invalid', 'org-1')).rejects.toThrow('Not found');
    });
  });

  describe('remove', () => {
    it('should delete a template', async () => {
      mockTemplateService.remove.mockResolvedValue(undefined);

      const result = await controller.remove('template-1', 'org-1');

      expect(mockTemplateService.remove).toHaveBeenCalledWith('template-1', 'org-1');
    });
  });

  describe('incrementUsage', () => {
    it('should increment usage count', async () => {
      mockTemplateService.incrementUsageCount.mockResolvedValue({ ...mockTemplate, usageCount: 6 });

      const result = await controller.incrementUsage('template-1', 'org-1');

      expect(mockTemplateService.incrementUsageCount).toHaveBeenCalledWith('template-1', 'org-1');
    });
  });

  describe('activate', () => {
    it('should activate a template', async () => {
      mockTemplateService.activate.mockResolvedValue({ ...mockTemplate, isActive: true });

      const result = await controller.activate('template-1', 'org-1');

      expect(mockTemplateService.activate).toHaveBeenCalledWith('template-1', 'org-1');
    });
  });

  describe('deactivate', () => {
    it('should deactivate a template', async () => {
      mockTemplateService.deactivate.mockResolvedValue({ ...mockTemplate, isActive: false });

      const result = await controller.deactivate('template-1', 'org-1');

      expect(mockTemplateService.deactivate).toHaveBeenCalledWith('template-1', 'org-1');
    });
  });
});
