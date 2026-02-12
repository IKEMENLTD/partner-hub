import { Test, TestingModule } from '@nestjs/testing';
import { PartnerController } from './partner.controller';
import { PartnerService } from './partner.service';
import { PartnerAccessGuard } from './guards/partner-access.guard';

describe('PartnerController', () => {
  let controller: PartnerController;

  const mockPartner = {
    id: 'partner-uuid-1',
    name: 'Test Partner',
    email: 'partner@test.com',
    companyName: 'Test Co.',
    status: 'active',
    rating: 4,
  };

  const mockPartnerService = {
    create: jest.fn(),
    findAll: jest.fn(),
    getPartnerStatistics: jest.fn(),
    getActivePartners: jest.fn(),
    getPartnersBySkills: jest.fn(),
    findDeleted: jest.fn(),
    restore: jest.fn(),
    getProjectsByPartner: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn(),
    updateRating: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PartnerController],
      providers: [
        { provide: PartnerService, useValue: mockPartnerService },
      ],
    })
      .overrideGuard(PartnerAccessGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PartnerController>(PartnerController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new partner', async () => {
      const createDto = { name: 'Test Partner', email: 'partner@test.com' };
      const userId = 'user-uuid-1';
      mockPartnerService.create.mockResolvedValue(mockPartner);

      const result = await controller.create(createDto as any, userId);

      expect(result).toEqual(mockPartner);
      expect(mockPartnerService.create).toHaveBeenCalledWith(createDto, userId);
    });

    it('should propagate errors from service', async () => {
      mockPartnerService.create.mockRejectedValue(new Error('Conflict'));

      await expect(controller.create({} as any, 'user-1')).rejects.toThrow('Conflict');
    });
  });

  describe('findAll', () => {
    it('should return paginated partners', async () => {
      const queryDto = { page: 1, limit: 10 };
      const userId = 'user-uuid-1';
      const expected = { data: [mockPartner], total: 1 };
      mockPartnerService.findAll.mockResolvedValue(expected);

      const result = await controller.findAll(queryDto as any, userId);

      expect(result).toEqual(expected);
      expect(mockPartnerService.findAll).toHaveBeenCalledWith(queryDto, userId);
    });
  });

  describe('getStatistics', () => {
    it('should return partner statistics', async () => {
      const stats = { total: 10, active: 8, inactive: 2 };
      mockPartnerService.getPartnerStatistics.mockResolvedValue(stats);

      const result = await controller.getStatistics();

      expect(result).toEqual(stats);
      expect(mockPartnerService.getPartnerStatistics).toHaveBeenCalled();
    });
  });

  describe('getActivePartners', () => {
    it('should return active partners', async () => {
      mockPartnerService.getActivePartners.mockResolvedValue([mockPartner]);

      const result = await controller.getActivePartners();

      expect(result).toEqual([mockPartner]);
      expect(mockPartnerService.getActivePartners).toHaveBeenCalled();
    });
  });

  describe('getBySkills', () => {
    it('should return partners matching skills', async () => {
      mockPartnerService.getPartnersBySkills.mockResolvedValue([mockPartner]);

      const result = await controller.getBySkills('React, Node.js');

      expect(result).toEqual([mockPartner]);
      expect(mockPartnerService.getPartnersBySkills).toHaveBeenCalledWith(['React', 'Node.js']);
    });
  });

  describe('findDeleted', () => {
    it('should return soft-deleted partners', async () => {
      mockPartnerService.findDeleted.mockResolvedValue([]);

      const result = await controller.findDeleted();

      expect(result).toEqual([]);
      expect(mockPartnerService.findDeleted).toHaveBeenCalled();
    });
  });

  describe('restore', () => {
    it('should restore a soft-deleted partner', async () => {
      mockPartnerService.restore.mockResolvedValue(mockPartner);

      const result = await controller.restore('partner-uuid-1');

      expect(result).toEqual(mockPartner);
      expect(mockPartnerService.restore).toHaveBeenCalledWith('partner-uuid-1');
    });

    it('should propagate not found errors', async () => {
      mockPartnerService.restore.mockRejectedValue(new Error('Not found'));

      await expect(controller.restore('invalid-id')).rejects.toThrow('Not found');
    });
  });

  describe('getPartnerProjects', () => {
    it('should return projects for a partner', async () => {
      const projects = [{ id: 'proj-1', name: 'Project 1' }];
      mockPartnerService.getProjectsByPartner.mockResolvedValue(projects);

      const result = await controller.getPartnerProjects('partner-uuid-1');

      expect(result).toEqual(projects);
      expect(mockPartnerService.getProjectsByPartner).toHaveBeenCalledWith('partner-uuid-1');
    });
  });

  describe('findOne', () => {
    it('should return a partner by id', async () => {
      mockPartnerService.findOne.mockResolvedValue(mockPartner);

      const result = await controller.findOne('partner-uuid-1');

      expect(result).toEqual(mockPartner);
      expect(mockPartnerService.findOne).toHaveBeenCalledWith('partner-uuid-1');
    });

    it('should propagate not found errors', async () => {
      mockPartnerService.findOne.mockRejectedValue(new Error('Not found'));

      await expect(controller.findOne('invalid-id')).rejects.toThrow('Not found');
    });
  });

  describe('update', () => {
    it('should update a partner', async () => {
      const updateDto = { name: 'Updated Partner' };
      mockPartnerService.update.mockResolvedValue({ ...mockPartner, ...updateDto });

      const result = await controller.update('partner-uuid-1', updateDto as any);

      expect(result.name).toBe('Updated Partner');
      expect(mockPartnerService.update).toHaveBeenCalledWith('partner-uuid-1', updateDto);
    });
  });

  describe('updateStatus', () => {
    it('should update partner status', async () => {
      const updateStatusDto = { status: 'inactive' };
      mockPartnerService.updateStatus.mockResolvedValue({ ...mockPartner, status: 'inactive' });

      const result = await controller.updateStatus('partner-uuid-1', updateStatusDto as any);

      expect(result.status).toBe('inactive');
      expect(mockPartnerService.updateStatus).toHaveBeenCalledWith('partner-uuid-1', 'inactive');
    });
  });

  describe('updateRating', () => {
    it('should update partner rating', async () => {
      const updateRatingDto = { rating: 5 };
      mockPartnerService.updateRating.mockResolvedValue({ ...mockPartner, rating: 5 });

      const result = await controller.updateRating('partner-uuid-1', updateRatingDto as any);

      expect(result.rating).toBe(5);
      expect(mockPartnerService.updateRating).toHaveBeenCalledWith('partner-uuid-1', 5);
    });
  });

  describe('remove', () => {
    it('should delete a partner and return success message', async () => {
      mockPartnerService.remove.mockResolvedValue(undefined);

      const result = await controller.remove('partner-uuid-1');

      expect(result).toEqual({ message: 'パートナーを削除しました' });
      expect(mockPartnerService.remove).toHaveBeenCalledWith('partner-uuid-1');
    });

    it('should propagate errors from service', async () => {
      mockPartnerService.remove.mockRejectedValue(new Error('Not found'));

      await expect(controller.remove('invalid-id')).rejects.toThrow('Not found');
    });
  });
});
