import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectService } from './project.service';
import { Project } from './entities/project.entity';
import { Partner } from '../partner/entities/partner.entity';
import { UserProfile } from '../auth/entities/user-profile.entity';
import { EmailService } from '../notification/services/email.service';
import { ProjectStatisticsService } from './services/project-statistics.service';
import { ProjectStatus, ProjectPriority } from './enums/project-status.enum';
import { ResourceNotFoundException } from '../../common/exceptions/resource-not-found.exception';

describe('ProjectService', () => {
  let service: ProjectService;
  let projectRepository: Repository<Project>;
  let partnerRepository: Repository<Partner>;

  const mockProject: Partial<Project> = {
    id: 'test-project-uuid',
    name: 'Test Project',
    description: 'Test description',
    status: ProjectStatus.IN_PROGRESS,
    priority: ProjectPriority.HIGH,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
    progress: 50,
    budget: 100000,
    actualCost: 50000,
    partners: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPartner = {
    id: 'test-partner-uuid',
    name: 'Test Partner',
    email: 'partner@example.com',
  };

  const mockProjectRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
    softRemove: jest.fn(),
    count: jest.fn(),
    findBy: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[mockProject], 1]),
      getMany: jest.fn().mockResolvedValue([mockProject]),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
      getRawOne: jest
        .fn()
        .mockResolvedValue({ avgProgress: '50', totalBudget: '100000', totalActualCost: '50000' }),
      getSql: jest.fn().mockReturnValue('SELECT * FROM project'),
    })),
  };

  const mockPartnerRepository = {
    findOne: jest.fn(),
    findBy: jest.fn(),
  };

  const mockUserProfileRepository = {
    findOne: jest.fn(),
  };

  const mockEmailService = {
    sendProjectInvitationEmail: jest.fn().mockResolvedValue(undefined),
  };

  const mockStatisticsService = {
    getProjectStatistics: jest.fn().mockResolvedValue({
      total: 10,
      byStatus: {},
      byPriority: {},
      averageProgress: 50,
      totalBudget: 100000,
      totalActualCost: 50000,
    }),
    getOverdueProjects: jest.fn().mockResolvedValue([mockProject]),
    getUpcomingDeadlines: jest.fn().mockResolvedValue([mockProject]),
    updateHealthScore: jest.fn().mockResolvedValue(mockProject),
    getProjectTimeline: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectService,
        {
          provide: getRepositoryToken(Project),
          useValue: mockProjectRepository,
        },
        {
          provide: getRepositoryToken(Partner),
          useValue: mockPartnerRepository,
        },
        {
          provide: getRepositoryToken(UserProfile),
          useValue: mockUserProfileRepository,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: ProjectStatisticsService,
          useValue: mockStatisticsService,
        },
      ],
    }).compile();

    service = module.get<ProjectService>(ProjectService);
    projectRepository = module.get<Repository<Project>>(getRepositoryToken(Project));
    partnerRepository = module.get<Repository<Partner>>(getRepositoryToken(Partner));

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto = {
      name: 'New Project',
      description: 'New project description',
      status: ProjectStatus.DRAFT,
    };

    it('should create a project successfully', async () => {
      mockProjectRepository.create.mockReturnValue({ ...mockProject, ...createDto });
      mockProjectRepository.save.mockResolvedValue({ ...mockProject, ...createDto });
      mockProjectRepository.findOne.mockResolvedValue({ ...mockProject, ...createDto });

      const result = await service.create(createDto, 'user-uuid');

      expect(result).toBeDefined();
      expect(mockProjectRepository.create).toHaveBeenCalled();
      expect(mockProjectRepository.save).toHaveBeenCalled();
    });

    it('should create a project with partners', async () => {
      mockPartnerRepository.findBy.mockResolvedValue([mockPartner]);
      mockProjectRepository.create.mockReturnValue({ ...mockProject, partners: [mockPartner] });
      mockProjectRepository.save.mockResolvedValue({ ...mockProject, partners: [mockPartner] });
      mockProjectRepository.findOne.mockResolvedValue({ ...mockProject, partners: [mockPartner] });

      const result = await service.create(
        { ...createDto, partnerIds: ['test-partner-uuid'] },
        'user-uuid',
      );

      expect(result).toBeDefined();
      expect(mockPartnerRepository.findBy).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a project when found', async () => {
      mockProjectRepository.findOne.mockResolvedValue(mockProject);

      const result = await service.findOne('test-project-uuid');

      expect(result).toEqual(mockProject);
    });

    it('should throw ResourceNotFoundException when project not found', async () => {
      mockProjectRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent-uuid')).rejects.toThrow(ResourceNotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return paginated projects', async () => {
      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });
  });

  describe('updateStatus', () => {
    it('should update project status', async () => {
      mockProjectRepository.findOne.mockResolvedValue({ ...mockProject });
      mockProjectRepository.save.mockResolvedValue({
        ...mockProject,
        status: ProjectStatus.COMPLETED,
      });

      const result = await service.updateStatus('test-project-uuid', ProjectStatus.COMPLETED);

      expect(result.status).toBe(ProjectStatus.COMPLETED);
    });

    it('should set actualEndDate and progress when completing', async () => {
      const project = { ...mockProject };
      mockProjectRepository.findOne.mockResolvedValue(project);
      mockProjectRepository.save.mockImplementation((p) => Promise.resolve(p));

      await service.updateStatus('test-project-uuid', ProjectStatus.COMPLETED);

      expect(project.actualEndDate).toBeDefined();
      expect(project.progress).toBe(100);
    });
  });

  describe('updateProgress', () => {
    it('should update project progress', async () => {
      mockProjectRepository.findOne.mockResolvedValue({ ...mockProject });
      mockProjectRepository.save.mockResolvedValue({
        ...mockProject,
        progress: 75,
      });

      const result = await service.updateProgress('test-project-uuid', 75);

      expect(result.progress).toBe(75);
    });
  });

  describe('remove', () => {
    it('should delete a project', async () => {
      mockProjectRepository.findOne.mockResolvedValue(mockProject);

      await service.remove('test-project-uuid');

      expect(mockProjectRepository.softRemove).toHaveBeenCalledWith(mockProject);
    });
  });

  describe('getProjectStatistics', () => {
    it('should return project statistics', async () => {
      mockProjectRepository.count.mockResolvedValue(10);

      const result = await service.getProjectStatistics();

      expect(result.total).toBe(10);
      expect(result).toHaveProperty('byStatus');
      expect(result).toHaveProperty('byPriority');
      expect(result).toHaveProperty('averageProgress');
    });
  });

  describe('addPartner', () => {
    it('should add a partner to project', async () => {
      mockProjectRepository.findOne.mockResolvedValue({
        ...mockProject,
        partners: [],
      });
      mockPartnerRepository.findOne.mockResolvedValue(mockPartner);
      mockProjectRepository.save.mockResolvedValue({
        ...mockProject,
        partners: [mockPartner],
      });

      const result = await service.addPartner('test-project-uuid', 'test-partner-uuid');

      expect(mockProjectRepository.save).toHaveBeenCalled();
    });

    it('should throw ResourceNotFoundException if partner not found', async () => {
      mockProjectRepository.findOne.mockResolvedValue(mockProject);
      mockPartnerRepository.findOne.mockResolvedValue(null);

      await expect(service.addPartner('test-project-uuid', 'non-existent-partner')).rejects.toThrow(
        ResourceNotFoundException,
      );
    });

    it('should not add duplicate partner', async () => {
      mockProjectRepository.findOne.mockResolvedValue({
        ...mockProject,
        partners: [mockPartner],
      });
      mockPartnerRepository.findOne.mockResolvedValue(mockPartner);

      await service.addPartner('test-project-uuid', 'test-partner-uuid');

      // Save should not be called if partner already exists
      expect(mockProjectRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('removePartner', () => {
    it('should remove a partner from project', async () => {
      mockProjectRepository.findOne
        .mockResolvedValueOnce({
          ...mockProject,
          partners: [mockPartner],
        })
        .mockResolvedValueOnce({
          ...mockProject,
          partners: [],
        });
      mockProjectRepository.save.mockResolvedValue({
        ...mockProject,
        partners: [],
      });

      const result = await service.removePartner('test-project-uuid', 'test-partner-uuid');

      expect(mockProjectRepository.save).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update project successfully', async () => {
      mockProjectRepository.findOne.mockResolvedValue(mockProject);
      mockProjectRepository.save.mockResolvedValue({
        ...mockProject,
        name: 'Updated Project',
      });

      const result = await service.update('test-project-uuid', {
        name: 'Updated Project',
      });

      expect(mockProjectRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if partner IDs are invalid', async () => {
      mockProjectRepository.findOne.mockResolvedValue(mockProject);
      mockPartnerRepository.findBy.mockResolvedValue([]);

      await expect(
        service.update('test-project-uuid', {
          partnerIds: ['invalid-id'],
        }),
      ).rejects.toThrow();
    });
  });

  describe('getOverdueProjects', () => {
    it('should return overdue projects', async () => {
      const result = await service.getOverdueProjects();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getUpcomingDeadlines', () => {
    it('should return projects with upcoming deadlines', async () => {
      const result = await service.getUpcomingDeadlines(7);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should use default days parameter', async () => {
      const result = await service.getUpcomingDeadlines();

      expect(result).toBeDefined();
    });
  });

  describe('getProjectsByPartner', () => {
    it('should return projects for a specific partner', async () => {
      const result = await service.getProjectsByPartner('test-partner-uuid');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty partner list when creating project', async () => {
      mockProjectRepository.create.mockReturnValue(mockProject);
      mockProjectRepository.save.mockResolvedValue(mockProject);
      mockProjectRepository.findOne.mockResolvedValue(mockProject);

      const result = await service.create(
        {
          name: 'Test Project',
          partnerIds: [],
        },
        'user-uuid',
      );

      expect(result).toBeDefined();
    });

    it('should handle null dates gracefully', async () => {
      mockProjectRepository.findOne.mockResolvedValue({
        ...mockProject,
        startDate: null,
        endDate: null,
      });
      mockProjectRepository.save.mockResolvedValue(mockProject);

      const result = await service.updateStatus('test-project-uuid', ProjectStatus.IN_PROGRESS);

      expect(result).toBeDefined();
    });

    it('should handle progress boundary values', async () => {
      mockProjectRepository.findOne.mockResolvedValue(mockProject);
      mockProjectRepository.save.mockResolvedValue({
        ...mockProject,
        progress: 0,
      });

      const result = await service.updateProgress('test-project-uuid', 0);

      expect(result.progress).toBe(0);
    });
  });

  describe('Boundary value tests', () => {
    it('should set progress to 100 and status to COMPLETED when progress is 100', async () => {
      const project = { ...mockProject, progress: 50 };
      mockProjectRepository.findOne.mockResolvedValue(project);
      mockProjectRepository.save.mockImplementation((p) => Promise.resolve(p));

      await service.updateProgress('test-project-uuid', 100);

      expect(project.progress).toBe(100);
      expect(project.status).toBe(ProjectStatus.COMPLETED);
      expect(project.actualEndDate).toBeDefined();
    });

    it('should handle maximum budget values', async () => {
      mockProjectRepository.findOne.mockResolvedValue({
        ...mockProject,
        budget: Number.MAX_SAFE_INTEGER,
      });

      const result = await service.findOne('test-project-uuid');

      expect(result.budget).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should filter projects by multiple criteria', async () => {
      const result = await service.findAll({
        page: 1,
        limit: 10,
        status: ProjectStatus.IN_PROGRESS,
        priority: ProjectPriority.HIGH,
        search: 'Test',
      });

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
    });
  });
});
