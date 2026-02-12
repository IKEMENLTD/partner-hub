import { Test, TestingModule } from '@nestjs/testing';
import { StakeholderController } from './stakeholder.controller';
import { StakeholderService } from './stakeholder.service';

describe('StakeholderController', () => {
  let controller: StakeholderController;

  const mockStakeholder = {
    id: 'sh-uuid-1',
    projectId: 'proj-1',
    userId: 'user-1',
    tier: 1,
    roleDescription: 'Project Manager',
  };

  const mockStakeholderService = {
    create: jest.fn(),
    findAllByProject: jest.fn(),
    getStakeholderTree: jest.fn(),
    getStakeholdersByTier: jest.fn(),
    getPrimaryStakeholders: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    updateTier: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StakeholderController],
      providers: [
        { provide: StakeholderService, useValue: mockStakeholderService },
      ],
    }).compile();

    controller = module.get<StakeholderController>(StakeholderController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a stakeholder for a project', async () => {
      const createDto = { userId: 'user-1', tier: 1, role: 'PM' };
      mockStakeholderService.create.mockResolvedValue(mockStakeholder);

      const result = await controller.create('proj-1', createDto as any);

      expect(result).toEqual(mockStakeholder);
      expect(mockStakeholderService.create).toHaveBeenCalledWith({
        ...createDto,
        projectId: 'proj-1',
      });
    });
  });

  describe('findAllByProject', () => {
    it('should return stakeholders for a project', async () => {
      const expected = { data: [mockStakeholder], total: 1 };
      mockStakeholderService.findAllByProject.mockResolvedValue(expected);

      const result = await controller.findAllByProject('proj-1', {} as any);

      expect(result).toEqual(expected);
      expect(mockStakeholderService.findAllByProject).toHaveBeenCalledWith('proj-1', {});
    });
  });

  describe('getStakeholderTree', () => {
    it('should return stakeholder tree structure', async () => {
      const tree = { tier1: [], tier2: [], tier3: [] };
      mockStakeholderService.getStakeholderTree.mockResolvedValue(tree);

      const result = await controller.getStakeholderTree('proj-1');

      expect(result).toEqual(tree);
      expect(mockStakeholderService.getStakeholderTree).toHaveBeenCalledWith('proj-1');
    });
  });

  describe('getStakeholdersByTier', () => {
    it('should return stakeholders by tier', async () => {
      mockStakeholderService.getStakeholdersByTier.mockResolvedValue([mockStakeholder]);

      const result = await controller.getStakeholdersByTier('proj-1', 1);

      expect(result).toEqual([mockStakeholder]);
      expect(mockStakeholderService.getStakeholdersByTier).toHaveBeenCalledWith('proj-1', 1);
    });
  });

  describe('getPrimaryStakeholders', () => {
    it('should return primary stakeholders', async () => {
      mockStakeholderService.getPrimaryStakeholders.mockResolvedValue([mockStakeholder]);

      const result = await controller.getPrimaryStakeholders('proj-1');

      expect(result).toEqual([mockStakeholder]);
      expect(mockStakeholderService.getPrimaryStakeholders).toHaveBeenCalledWith('proj-1');
    });
  });

  describe('findOne', () => {
    it('should return a stakeholder by id', async () => {
      mockStakeholderService.findOne.mockResolvedValue(mockStakeholder);

      const result = await controller.findOne('sh-uuid-1');

      expect(result).toEqual(mockStakeholder);
      expect(mockStakeholderService.findOne).toHaveBeenCalledWith('sh-uuid-1');
    });

    it('should propagate not found errors', async () => {
      mockStakeholderService.findOne.mockRejectedValue(new Error('Not found'));

      await expect(controller.findOne('invalid')).rejects.toThrow('Not found');
    });
  });

  describe('update', () => {
    it('should update a stakeholder', async () => {
      const updateDto = { roleDescription: 'Lead Developer' };
      mockStakeholderService.update.mockResolvedValue({ ...mockStakeholder, ...updateDto });

      const result = await controller.update('sh-uuid-1', updateDto as any);

      expect(result.roleDescription).toBe('Lead Developer');
      expect(mockStakeholderService.update).toHaveBeenCalledWith('sh-uuid-1', updateDto);
    });
  });

  describe('updateTier', () => {
    it('should update stakeholder tier', async () => {
      mockStakeholderService.updateTier.mockResolvedValue({ ...mockStakeholder, tier: 2 });

      const result = await controller.updateTier('sh-uuid-1', { tier: 2 } as any);

      expect(mockStakeholderService.updateTier).toHaveBeenCalledWith('sh-uuid-1', 2);
    });
  });

  describe('remove', () => {
    it('should delete a stakeholder', async () => {
      mockStakeholderService.remove.mockResolvedValue(undefined);

      await controller.remove('sh-uuid-1');

      expect(mockStakeholderService.remove).toHaveBeenCalledWith('sh-uuid-1');
    });
  });
});
