import { Test, TestingModule } from '@nestjs/testing';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { HealthScoreService } from './services/health-score.service';
import { TaskService } from '../task/task.service';
import { ProjectAccessGuard } from './guards/project-access.guard';

describe('ProjectController', () => {
  let controller: ProjectController;

  const mockProject = {
    id: 'proj-uuid-1',
    name: 'Test Project',
    status: 'active',
    progress: 50,
    healthScore: 80,
  };

  const mockProjectService = {
    create: jest.fn(),
    getTemplates: jest.fn(),
    findAll: jest.fn(),
    getProjectStatistics: jest.fn(),
    getOverdueProjects: jest.fn(),
    getUpcomingDeadlines: jest.fn(),
    getProjectsByPartner: jest.fn(),
    findDeleted: jest.fn(),
    restore: jest.fn(),
    getProjectTimeline: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn(),
    updateProgress: jest.fn(),
    addPartner: jest.fn(),
    removePartner: jest.fn(),
    addMember: jest.fn(),
    removeMember: jest.fn(),
    remove: jest.fn(),
  };

  const mockHealthScoreService = {
    getHealthScoreStatistics: jest.fn(),
    updateAllProjectHealthScores: jest.fn(),
    updateProjectHealthScore: jest.fn(),
    calculateHealthScore: jest.fn(),
  };

  const mockTaskService = {
    findAll: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectController],
      providers: [
        { provide: ProjectService, useValue: mockProjectService },
        { provide: HealthScoreService, useValue: mockHealthScoreService },
        { provide: TaskService, useValue: mockTaskService },
      ],
    })
      .overrideGuard(ProjectAccessGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ProjectController>(ProjectController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new project', async () => {
      const createDto = { name: 'New Project' };
      mockProjectService.create.mockResolvedValue(mockProject);

      const result = await controller.create(createDto as any, 'user-1');

      expect(result).toEqual(mockProject);
      expect(mockProjectService.create).toHaveBeenCalledWith(createDto, 'user-1');
    });
  });

  describe('getTemplates', () => {
    it('should return project templates', async () => {
      const templates = [{ id: 't-1', name: 'Template 1' }];
      mockProjectService.getTemplates.mockResolvedValue(templates);

      const result = await controller.getTemplates();

      expect(result).toEqual(templates);
    });
  });

  describe('findAll', () => {
    it('should return paginated projects', async () => {
      const expected = { data: [mockProject], total: 1 };
      mockProjectService.findAll.mockResolvedValue(expected);

      const result = await controller.findAll({} as any, 'user-1', 'ADMIN');

      expect(result).toEqual(expected);
      expect(mockProjectService.findAll).toHaveBeenCalledWith({}, 'user-1', 'ADMIN');
    });
  });

  describe('getStatistics', () => {
    it('should return project statistics', async () => {
      const stats = { total: 5, active: 3 };
      mockProjectService.getProjectStatistics.mockResolvedValue(stats);

      const result = await controller.getStatistics();

      expect(result).toEqual(stats);
    });
  });

  describe('getHealthStatistics', () => {
    it('should return health score statistics', async () => {
      const stats = { average: 75 };
      mockHealthScoreService.getHealthScoreStatistics.mockResolvedValue(stats);

      const result = await controller.getHealthStatistics();

      expect(result).toEqual(stats);
    });
  });

  describe('recalculateAllHealthScores', () => {
    it('should recalculate all health scores', async () => {
      const response = { updated: 10 };
      mockHealthScoreService.updateAllProjectHealthScores.mockResolvedValue(response);

      const result = await controller.recalculateAllHealthScores();

      expect(result).toEqual(response);
    });
  });

  describe('getOverdueProjects', () => {
    it('should return overdue projects', async () => {
      mockProjectService.getOverdueProjects.mockResolvedValue([mockProject]);

      const result = await controller.getOverdueProjects();

      expect(result).toEqual([mockProject]);
    });
  });

  describe('getUpcomingDeadlines', () => {
    it('should return upcoming deadlines with default days', async () => {
      mockProjectService.getUpcomingDeadlines.mockResolvedValue([]);

      const result = await controller.getUpcomingDeadlines(undefined);

      expect(mockProjectService.getUpcomingDeadlines).toHaveBeenCalledWith(7);
    });

    it('should return upcoming deadlines with custom days', async () => {
      mockProjectService.getUpcomingDeadlines.mockResolvedValue([]);

      await controller.getUpcomingDeadlines(14);

      expect(mockProjectService.getUpcomingDeadlines).toHaveBeenCalledWith(14);
    });
  });

  describe('getProjectsByPartner', () => {
    it('should return projects for a partner', async () => {
      mockProjectService.getProjectsByPartner.mockResolvedValue([mockProject]);

      const result = await controller.getProjectsByPartner('partner-1');

      expect(result).toEqual([mockProject]);
      expect(mockProjectService.getProjectsByPartner).toHaveBeenCalledWith('partner-1');
    });
  });

  describe('findDeleted', () => {
    it('should return soft-deleted projects', async () => {
      mockProjectService.findDeleted.mockResolvedValue([]);

      const result = await controller.findDeleted();

      expect(result).toEqual([]);
    });
  });

  describe('restore', () => {
    it('should restore a soft-deleted project', async () => {
      mockProjectService.restore.mockResolvedValue(mockProject);

      const result = await controller.restore('proj-1');

      expect(result).toEqual(mockProject);
    });
  });

  describe('getTimeline', () => {
    it('should return project timeline', async () => {
      const timeline = [{ action: 'created', date: new Date() }];
      mockProjectService.getProjectTimeline.mockResolvedValue(timeline);

      const result = await controller.getTimeline('proj-1');

      expect(result).toEqual(timeline);
    });
  });

  describe('findOne', () => {
    it('should return a project by id', async () => {
      mockProjectService.findOne.mockResolvedValue(mockProject);

      const result = await controller.findOne('proj-1', 'user-1');

      expect(result).toEqual(mockProject);
      expect(mockProjectService.findOne).toHaveBeenCalledWith('proj-1', 'user-1');
    });
  });

  describe('update', () => {
    it('should update a project', async () => {
      const updateDto = { name: 'Updated' };
      mockProjectService.update.mockResolvedValue({ ...mockProject, ...updateDto });

      const result = await controller.update('proj-1', updateDto as any);

      expect(result.name).toBe('Updated');
    });
  });

  describe('updateStatus', () => {
    it('should update project status', async () => {
      mockProjectService.updateStatus.mockResolvedValue({ ...mockProject, status: 'completed' });

      const result = await controller.updateStatus('proj-1', { status: 'completed' } as any);

      expect(mockProjectService.updateStatus).toHaveBeenCalledWith('proj-1', 'completed');
    });
  });

  describe('updateProgress', () => {
    it('should update project progress', async () => {
      mockProjectService.updateProgress.mockResolvedValue({ ...mockProject, progress: 80 });

      const result = await controller.updateProgress('proj-1', { progress: 80 } as any);

      expect(mockProjectService.updateProgress).toHaveBeenCalledWith('proj-1', 80);
    });
  });

  describe('addPartner', () => {
    it('should add a partner to a project', async () => {
      mockProjectService.addPartner.mockResolvedValue({ success: true });

      const result = await controller.addPartner('proj-1', 'partner-1');

      expect(mockProjectService.addPartner).toHaveBeenCalledWith('proj-1', 'partner-1');
    });
  });

  describe('removePartner', () => {
    it('should remove a partner from a project', async () => {
      mockProjectService.removePartner.mockResolvedValue({ success: true });

      const result = await controller.removePartner('proj-1', 'partner-1');

      expect(mockProjectService.removePartner).toHaveBeenCalledWith('proj-1', 'partner-1');
    });
  });

  describe('addMember', () => {
    it('should add a member to a project', async () => {
      mockProjectService.addMember.mockResolvedValue({ success: true });

      const result = await controller.addMember('proj-1', 'user-2');

      expect(mockProjectService.addMember).toHaveBeenCalledWith('proj-1', 'user-2');
    });
  });

  describe('removeMember', () => {
    it('should remove a member from a project', async () => {
      mockProjectService.removeMember.mockResolvedValue({ success: true });

      const result = await controller.removeMember('proj-1', 'user-2');

      expect(mockProjectService.removeMember).toHaveBeenCalledWith('proj-1', 'user-2');
    });
  });

  describe('remove', () => {
    it('should delete a project', async () => {
      mockProjectService.remove.mockResolvedValue(undefined);

      await controller.remove('proj-1');

      expect(mockProjectService.remove).toHaveBeenCalledWith('proj-1');
    });
  });

  describe('recalculateHealthScore', () => {
    it('should recalculate health score for a project', async () => {
      const score = { healthScore: 85 };
      mockHealthScoreService.updateProjectHealthScore.mockResolvedValue(score);

      const result = await controller.recalculateHealthScore('proj-1');

      expect(result).toEqual(score);
    });
  });

  describe('getHealthBreakdown', () => {
    it('should return health score breakdown', async () => {
      const breakdown = { onTime: 50, completion: 30, budget: 20 };
      mockHealthScoreService.calculateHealthScore.mockResolvedValue(breakdown);

      const result = await controller.getHealthBreakdown('proj-1');

      expect(result).toEqual(breakdown);
    });
  });

  describe('getProjectTasks', () => {
    it('should return tasks for a project', async () => {
      const tasks = [{ id: 'task-1', title: 'Task 1' }];
      mockTaskService.findAll.mockResolvedValue(tasks);

      const result = await controller.getProjectTasks('proj-1', {} as any);

      expect(result).toEqual(tasks);
      expect(mockTaskService.findAll).toHaveBeenCalledWith({ projectId: 'proj-1' });
    });
  });

  describe('createProjectTask', () => {
    it('should create a task under a project', async () => {
      const createDto = { title: 'New Task' };
      const task = { id: 'task-1', ...createDto };
      mockTaskService.create.mockResolvedValue(task);

      const result = await controller.createProjectTask('proj-1', createDto as any, 'user-1');

      expect(result).toEqual(task);
      expect(mockTaskService.create).toHaveBeenCalledWith(
        { ...createDto, projectId: 'proj-1' },
        'user-1',
      );
    });
  });
});
