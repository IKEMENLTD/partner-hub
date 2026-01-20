import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DashboardService } from './dashboard.service';
import { Project } from '../project/entities/project.entity';
import { Task } from '../task/entities/task.entity';
import { Partner } from '../partner/entities/partner.entity';
import { User } from '../auth/entities/user.entity';
import { Reminder } from '../reminder/entities/reminder.entity';

describe('DashboardService', () => {
  let service: DashboardService;

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
    getOne: jest.fn().mockResolvedValue(null),
    getCount: jest.fn().mockResolvedValue(0),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([]),
    getRawOne: jest.fn().mockResolvedValue({ avg: '0' }),
  };

  const createMockRepository = () => ({
    count: jest.fn().mockResolvedValue(0),
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        {
          provide: getRepositoryToken(Project),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(Task),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(Partner),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(User),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(Reminder),
          useValue: createMockRepository(),
        },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getOverview', () => {
    it('should return dashboard overview', async () => {
      const result = await service.getOverview();

      expect(result).toHaveProperty('projects');
      expect(result).toHaveProperty('tasks');
      expect(result).toHaveProperty('partners');
      expect(result).toHaveProperty('users');
      expect(result).toHaveProperty('reminders');
    });

    it('should return overview with user-specific reminders', async () => {
      const result = await service.getOverview('user-uuid');

      expect(result).toHaveProperty('reminders');
      expect(result.reminders).toHaveProperty('unread');
    });
  });

  describe('getProjectSummaries', () => {
    it('should return project summaries', async () => {
      const result = await service.getProjectSummaries(5);

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getPartnerPerformance', () => {
    it('should return partner performance metrics', async () => {
      const result = await service.getPartnerPerformance(5);

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getUpcomingDeadlines', () => {
    it('should return upcoming deadlines', async () => {
      const result = await service.getUpcomingDeadlines(7);

      expect(result).toHaveProperty('projects');
      expect(result).toHaveProperty('tasks');
    });
  });

  describe('getOverdueItems', () => {
    it('should return overdue items', async () => {
      const result = await service.getOverdueItems();

      expect(result).toHaveProperty('projects');
      expect(result).toHaveProperty('tasks');
    });
  });

  describe('getRecentActivity', () => {
    it('should return recent activity', async () => {
      const result = await service.getRecentActivity(10);

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getTaskDistribution', () => {
    it('should return task distribution', async () => {
      const result = await service.getTaskDistribution();

      expect(result).toHaveProperty('byStatus');
      expect(result).toHaveProperty('byPriority');
      expect(result).toHaveProperty('byType');
    });
  });

  describe('getProjectProgress', () => {
    it('should return project progress statistics', async () => {
      const result = await service.getProjectProgress();

      expect(result).toHaveProperty('byStatus');
      expect(result).toHaveProperty('averageProgress');
      expect(result).toHaveProperty('onTrack');
      expect(result).toHaveProperty('atRisk');
      expect(result).toHaveProperty('delayed');
    });
  });

  describe('getUserDashboard', () => {
    it('should return user dashboard data', async () => {
      const result = await service.getUserDashboard('user-uuid');

      expect(result).toHaveProperty('assignedTasks');
      expect(result).toHaveProperty('upcomingDeadlines');
      expect(result).toHaveProperty('recentReminders');
      expect(result).toHaveProperty('taskStats');
    });
  });
});
