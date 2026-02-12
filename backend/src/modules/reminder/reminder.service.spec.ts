import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, In, LessThanOrEqual } from 'typeorm';
import { ReminderService } from './reminder.service';
import { Reminder } from './entities/reminder.entity';
import { Task } from '../task/entities/task.entity';
import { Project } from '../project/entities/project.entity';
import { ReminderType, ReminderStatus, ReminderChannel } from './enums/reminder-type.enum';
import { TaskStatus } from '../task/enums/task-status.enum';
import { ProjectStatus } from '../project/enums/project-status.enum';
import { ResourceNotFoundException } from '../../common/exceptions/resource-not-found.exception';
import { NotificationService } from '../notification/services/notification.service';

// Helper type for partial repository mocks with jest mock methods
type MockRepo<T = any> = Record<string, jest.Mock>;

describe('ReminderService', () => {
  let service: ReminderService;
  let reminderRepository: MockRepo<Reminder>;
  let taskRepository: MockRepo<Task>;
  let projectRepository: MockRepo<Project>;
  let notificationService: MockRepo<NotificationService>;

  const mockReminder: Partial<Reminder> = {
    id: 'reminder-1',
    title: 'Test Reminder',
    message: 'Test message',
    type: ReminderType.TASK_DUE,
    status: ReminderStatus.PENDING,
    channel: ReminderChannel.IN_APP,
    userId: 'user-1',
    scheduledAt: new Date(),
    isRead: false,
    retryCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Helper: create a query builder mock with chainable methods
  const createQueryBuilderMock = (overrides: Record<string, any> = {}) => ({
    leftJoin: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    getMany: jest.fn().mockResolvedValue([]),
    getCount: jest.fn().mockResolvedValue(0),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([]),
    ...overrides,
  });

  beforeEach(async () => {
    const mockReminderRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      remove: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(() => createQueryBuilderMock()),
    };

    const mockTaskRepo = {
      createQueryBuilder: jest.fn(() => createQueryBuilderMock()),
    };

    const mockProjectRepo = {
      createQueryBuilder: jest.fn(() => createQueryBuilderMock()),
    };

    const mockNotificationService = {
      sendReminderNotification: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReminderService,
        { provide: getRepositoryToken(Reminder), useValue: mockReminderRepo },
        { provide: getRepositoryToken(Task), useValue: mockTaskRepo },
        { provide: getRepositoryToken(Project), useValue: mockProjectRepo },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compile();

    service = module.get<ReminderService>(ReminderService);
    reminderRepository = module.get(getRepositoryToken(Reminder));
    taskRepository = module.get(getRepositoryToken(Task));
    projectRepository = module.get(getRepositoryToken(Project));
    notificationService = module.get(NotificationService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // =============================================
  // CRUD Operations
  // =============================================

  describe('create', () => {
    it('should create a reminder and return it with relations', async () => {
      const createDto = { title: 'New', userId: 'user-1', scheduledAt: '2026-12-31T09:00:00Z' };
      reminderRepository.create.mockReturnValue({ ...mockReminder, ...createDto });
      reminderRepository.save.mockResolvedValue({ ...mockReminder, ...createDto });
      reminderRepository.findOne.mockResolvedValue({ ...mockReminder, ...createDto });

      const result = await service.create(createDto as any, 'creator-1');

      expect(reminderRepository.create).toHaveBeenCalledWith({ ...createDto, createdById: 'creator-1' });
      expect(reminderRepository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('findOne', () => {
    it('should return reminder when found', async () => {
      reminderRepository.findOne.mockResolvedValue(mockReminder as Reminder);
      const result = await service.findOne('reminder-1');
      expect(result).toEqual(mockReminder);
    });

    it('should throw ResourceNotFoundException when not found', async () => {
      reminderRepository.findOne.mockResolvedValue(null);
      await expect(service.findOne('nonexistent')).rejects.toThrow(ResourceNotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return paginated reminders', async () => {
      const qb = createQueryBuilderMock({ getManyAndCount: jest.fn().mockResolvedValue([[mockReminder], 1]) });
      reminderRepository.createQueryBuilder.mockReturnValue(qb as any);

      const result = await service.findAll({ page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });

    it('should apply all filters when provided', async () => {
      const qb = createQueryBuilderMock({ getManyAndCount: jest.fn().mockResolvedValue([[], 0]) });
      reminderRepository.createQueryBuilder.mockReturnValue(qb as any);

      await service.findAll({
        page: 1,
        limit: 5,
        type: ReminderType.TASK_DUE,
        status: ReminderStatus.PENDING,
        userId: 'user-1',
        taskId: 'task-1',
        projectId: 'project-1',
        scheduledFrom: '2026-01-01',
        scheduledTo: '2026-12-31',
        isRead: false,
      } as any);

      // type, status, userId, taskId, projectId, scheduledFrom, scheduledTo, isRead = 8 filters
      expect(qb.andWhere).toHaveBeenCalledTimes(8);
    });
  });

  describe('markAsRead', () => {
    it('should set isRead to true', async () => {
      reminderRepository.findOne.mockResolvedValue({ ...mockReminder, isRead: false } as Reminder);
      reminderRepository.save.mockImplementation((r) => Promise.resolve(r as Reminder));

      const result = await service.markAsRead('reminder-1');
      expect(result.isRead).toBe(true);
    });
  });

  describe('markAllAsRead', () => {
    it('should bulk update unread reminders for user', async () => {
      await service.markAllAsRead('user-1');
      expect(reminderRepository.update).toHaveBeenCalledWith(
        { userId: 'user-1', isRead: false },
        { isRead: true },
      );
    });
  });

  describe('cancel', () => {
    it('should set status to CANCELLED', async () => {
      reminderRepository.findOne.mockResolvedValue({ ...mockReminder } as Reminder);
      reminderRepository.save.mockImplementation((r) => Promise.resolve(r as Reminder));

      const result = await service.cancel('reminder-1');
      expect(result.status).toBe(ReminderStatus.CANCELLED);
    });
  });

  describe('remove', () => {
    it('should delete the reminder', async () => {
      reminderRepository.findOne.mockResolvedValue(mockReminder as Reminder);
      await service.remove('reminder-1');
      expect(reminderRepository.remove).toHaveBeenCalledWith(mockReminder);
    });
  });

  describe('getUnreadCount', () => {
    it('should return count of unread reminders', async () => {
      reminderRepository.count.mockResolvedValue(5);
      const result = await service.getUnreadCount('user-1');
      expect(result).toBe(5);
      expect(reminderRepository.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false },
      });
    });
  });

  describe('getUserReminders', () => {
    it('should return all reminders for user', async () => {
      const qb = createQueryBuilderMock({ getMany: jest.fn().mockResolvedValue([mockReminder]) });
      reminderRepository.createQueryBuilder.mockReturnValue(qb as any);

      const result = await service.getUserReminders('user-1');
      expect(result).toHaveLength(1);
      expect(qb.where).toHaveBeenCalledWith('reminder.userId = :userId', { userId: 'user-1' });
      expect(qb.orderBy).toHaveBeenCalledWith('reminder.scheduledAt', 'DESC');
    });

    it('should filter unread only when flag is true', async () => {
      const qb = createQueryBuilderMock({ getMany: jest.fn().mockResolvedValue([]) });
      reminderRepository.createQueryBuilder.mockReturnValue(qb as any);

      await service.getUserReminders('user-1', true);
      expect(qb.andWhere).toHaveBeenCalledWith('reminder.isRead = :isRead', { isRead: false });
    });
  });

  // =============================================
  // processReminders - Retry mechanism
  // =============================================

  describe('processReminders', () => {
    it('should mark sent reminders as SENT with sentAt timestamp', async () => {
      const pending = { ...mockReminder, status: ReminderStatus.PENDING, retryCount: 0 } as Reminder;
      reminderRepository.find.mockResolvedValue([pending]);
      notificationService.sendReminderNotification.mockResolvedValue(true);
      reminderRepository.save.mockImplementation((r) => Promise.resolve(r as Reminder));

      await service.processReminders();

      expect(reminderRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ReminderStatus.SENT,
          sentAt: expect.any(Date),
        }),
      );
    });

    it('should increment retryCount on failure', async () => {
      const pending = { ...mockReminder, status: ReminderStatus.PENDING, retryCount: 0 } as Reminder;
      reminderRepository.find.mockResolvedValue([pending]);
      notificationService.sendReminderNotification.mockResolvedValue(false);
      reminderRepository.save.mockImplementation((r) => Promise.resolve(r as Reminder));

      await service.processReminders();

      expect(reminderRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ retryCount: 1 }),
      );
    });

    it('should mark as FAILED after 3 retries', async () => {
      const pending = { ...mockReminder, status: ReminderStatus.PENDING, retryCount: 2 } as Reminder;
      reminderRepository.find.mockResolvedValue([pending]);
      notificationService.sendReminderNotification.mockResolvedValue(false);
      reminderRepository.save.mockImplementation((r) => Promise.resolve(r as Reminder));

      await service.processReminders();

      expect(reminderRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ReminderStatus.FAILED,
          retryCount: 3,
        }),
      );
    });

    it('should process multiple reminders independently', async () => {
      const success = { ...mockReminder, id: 'r-1', retryCount: 0 } as Reminder;
      const fail = { ...mockReminder, id: 'r-2', retryCount: 0, task: null } as any;
      reminderRepository.find.mockResolvedValue([success, fail]);
      notificationService.sendReminderNotification
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      reminderRepository.save.mockImplementation((r) => Promise.resolve(r as Reminder));

      await service.processReminders();

      expect(reminderRepository.save).toHaveBeenCalledTimes(2);
    });

    it('should do nothing when no pending reminders', async () => {
      reminderRepository.find.mockResolvedValue([]);

      await service.processReminders();

      expect(reminderRepository.save).not.toHaveBeenCalled();
    });
  });

  // =============================================
  // createTaskDueReminders - Daily cron
  // =============================================

  describe('createTaskDueReminders', () => {
    it('should create reminders for tasks due tomorrow with assignees', async () => {
      const task = {
        id: 'task-1',
        title: 'Important Task',
        assigneeId: 'user-1',
        projectId: 'project-1',
        status: TaskStatus.IN_PROGRESS,
        dueDate: new Date(Date.now() + 86400000), // tomorrow
      };

      const qb = createQueryBuilderMock({ getMany: jest.fn().mockResolvedValue([task]) });
      taskRepository.createQueryBuilder.mockReturnValue(qb as any);
      reminderRepository.find.mockResolvedValue([]); // no existing reminders
      reminderRepository.save.mockResolvedValue([]);

      await service.createTaskDueReminders();

      expect(reminderRepository.save).toHaveBeenCalledWith([
        expect.objectContaining({
          title: '期限間近: Important Task',
          type: ReminderType.TASK_DUE,
          channel: ReminderChannel.IN_APP,
          userId: 'user-1',
          taskId: 'task-1',
        }),
      ]);
    });

    it('should skip tasks without assignees', async () => {
      const task = { id: 'task-1', title: 'Unassigned', assigneeId: null, status: TaskStatus.TODO };
      const qb = createQueryBuilderMock({ getMany: jest.fn().mockResolvedValue([task]) });
      taskRepository.createQueryBuilder.mockReturnValue(qb as any);

      await service.createTaskDueReminders();

      expect(reminderRepository.save).not.toHaveBeenCalled();
    });

    it('should not create duplicate reminders for already-reminded tasks', async () => {
      const task = { id: 'task-1', title: 'Task', assigneeId: 'user-1', projectId: 'p-1' };
      const qb = createQueryBuilderMock({ getMany: jest.fn().mockResolvedValue([task]) });
      taskRepository.createQueryBuilder.mockReturnValue(qb as any);

      // Existing pending reminder for this task
      reminderRepository.find.mockResolvedValue([{ taskId: 'task-1' }] as Reminder[]);

      await service.createTaskDueReminders();

      expect(reminderRepository.save).not.toHaveBeenCalled();
    });

    it('should batch create reminders for multiple tasks', async () => {
      const tasks = [
        { id: 't-1', title: 'Task 1', assigneeId: 'u-1', projectId: 'p-1' },
        { id: 't-2', title: 'Task 2', assigneeId: 'u-2', projectId: 'p-1' },
        { id: 't-3', title: 'Task 3', assigneeId: 'u-1', projectId: 'p-2' },
      ];
      const qb = createQueryBuilderMock({ getMany: jest.fn().mockResolvedValue(tasks) });
      taskRepository.createQueryBuilder.mockReturnValue(qb as any);
      reminderRepository.find.mockResolvedValue([]);
      reminderRepository.save.mockResolvedValue([]);

      await service.createTaskDueReminders();

      expect(reminderRepository.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ taskId: 't-1' }),
          expect.objectContaining({ taskId: 't-2' }),
          expect.objectContaining({ taskId: 't-3' }),
        ]),
      );
    });

    it('should do nothing when no tasks are due', async () => {
      const qb = createQueryBuilderMock({ getMany: jest.fn().mockResolvedValue([]) });
      taskRepository.createQueryBuilder.mockReturnValue(qb as any);

      await service.createTaskDueReminders();

      expect(reminderRepository.save).not.toHaveBeenCalled();
    });
  });

  // =============================================
  // createOverdueTaskReminders - Daily cron
  // =============================================

  describe('createOverdueTaskReminders', () => {
    it('should create reminders for overdue tasks', async () => {
      const task = {
        id: 'task-1',
        title: 'Late Task',
        assigneeId: 'user-1',
        projectId: 'p-1',
        dueDate: new Date(Date.now() - 86400000 * 3), // 3 days ago
      };

      const qb = createQueryBuilderMock({ getMany: jest.fn().mockResolvedValue([task]) });
      taskRepository.createQueryBuilder.mockReturnValue(qb as any);
      reminderRepository.find.mockResolvedValue([]);
      reminderRepository.save.mockResolvedValue([]);

      await service.createOverdueTaskReminders();

      expect(reminderRepository.save).toHaveBeenCalledWith([
        expect.objectContaining({
          title: '期限超過: Late Task',
          type: ReminderType.TASK_OVERDUE,
          userId: 'user-1',
          taskId: 'task-1',
        }),
      ]);
    });

    it('should skip tasks already reminded today', async () => {
      const task = { id: 'task-1', title: 'Task', assigneeId: 'user-1' };
      const qb = createQueryBuilderMock({ getMany: jest.fn().mockResolvedValue([task]) });
      taskRepository.createQueryBuilder.mockReturnValue(qb as any);

      reminderRepository.find.mockResolvedValue([{ taskId: 'task-1' }] as Reminder[]);

      await service.createOverdueTaskReminders();

      expect(reminderRepository.save).not.toHaveBeenCalled();
    });
  });

  // =============================================
  // createProjectDeadlineReminders - Daily cron
  // =============================================

  describe('createProjectDeadlineReminders', () => {
    it('should create reminders for projects approaching deadline within 7 days', async () => {
      const project = {
        id: 'p-1',
        name: 'Big Project',
        managerId: 'manager-1',
        endDate: new Date(Date.now() + 86400000 * 5), // 5 days
        status: ProjectStatus.IN_PROGRESS,
      };

      const qb = createQueryBuilderMock({ getMany: jest.fn().mockResolvedValue([project]) });
      projectRepository.createQueryBuilder.mockReturnValue(qb as any);
      reminderRepository.find.mockResolvedValue([]);
      reminderRepository.save.mockResolvedValue([]);

      await service.createProjectDeadlineReminders();

      expect(reminderRepository.save).toHaveBeenCalledWith([
        expect.objectContaining({
          title: '案件期限間近: Big Project',
          type: ReminderType.PROJECT_DEADLINE,
          userId: 'manager-1',
          projectId: 'p-1',
        }),
      ]);
    });

    it('should skip projects without managers', async () => {
      const project = { id: 'p-1', name: 'No Manager', managerId: null };
      const qb = createQueryBuilderMock({ getMany: jest.fn().mockResolvedValue([project]) });
      projectRepository.createQueryBuilder.mockReturnValue(qb as any);

      await service.createProjectDeadlineReminders();

      expect(reminderRepository.save).not.toHaveBeenCalled();
    });

    it('should skip projects that already have pending deadline reminders', async () => {
      const project = { id: 'p-1', name: 'Project', managerId: 'manager-1' };
      const qb = createQueryBuilderMock({ getMany: jest.fn().mockResolvedValue([project]) });
      projectRepository.createQueryBuilder.mockReturnValue(qb as any);
      reminderRepository.find.mockResolvedValue([{ projectId: 'p-1' }] as Reminder[]);

      await service.createProjectDeadlineReminders();

      expect(reminderRepository.save).not.toHaveBeenCalled();
    });
  });

  // =============================================
  // createStagnantProjectReminders - Daily cron
  // =============================================

  describe('createStagnantProjectReminders', () => {
    it('should create reminders for projects with no updates in 7+ days', async () => {
      const project = {
        id: 'p-1',
        name: 'Stagnant Project',
        managerId: 'manager-1',
        ownerId: 'owner-1',
        updatedAt: new Date(Date.now() - 86400000 * 10), // 10 days ago
        status: ProjectStatus.IN_PROGRESS,
      };

      const qb = createQueryBuilderMock({ getMany: jest.fn().mockResolvedValue([project]) });
      projectRepository.createQueryBuilder.mockReturnValue(qb as any);
      reminderRepository.find.mockResolvedValue([]);
      reminderRepository.save.mockResolvedValue([]);

      await service.createStagnantProjectReminders();

      expect(reminderRepository.save).toHaveBeenCalledWith([
        expect.objectContaining({
          title: expect.stringContaining('案件が停滞しています'),
          type: ReminderType.PROJECT_STAGNANT,
          userId: 'manager-1',
          projectId: 'p-1',
        }),
      ]);
    });

    it('should fall back to ownerId when managerId is absent', async () => {
      const project = {
        id: 'p-1',
        name: 'Ownerless',
        managerId: null,
        ownerId: 'owner-1',
        updatedAt: new Date(Date.now() - 86400000 * 14),
      };

      const qb = createQueryBuilderMock({ getMany: jest.fn().mockResolvedValue([project]) });
      projectRepository.createQueryBuilder.mockReturnValue(qb as any);
      reminderRepository.find.mockResolvedValue([]);
      reminderRepository.save.mockResolvedValue([]);

      await service.createStagnantProjectReminders();

      expect(reminderRepository.save).toHaveBeenCalledWith([
        expect.objectContaining({ userId: 'owner-1' }),
      ]);
    });

    it('should skip projects with neither manager nor owner', async () => {
      const project = { id: 'p-1', managerId: null, ownerId: null, updatedAt: new Date(0) };
      const qb = createQueryBuilderMock({ getMany: jest.fn().mockResolvedValue([project]) });
      projectRepository.createQueryBuilder.mockReturnValue(qb as any);

      await service.createStagnantProjectReminders();

      expect(reminderRepository.save).not.toHaveBeenCalled();
    });

    it('should not re-remind within 7 days', async () => {
      const project = { id: 'p-1', managerId: 'm-1', ownerId: 'o-1', updatedAt: new Date(0) };
      const qb = createQueryBuilderMock({ getMany: jest.fn().mockResolvedValue([project]) });
      projectRepository.createQueryBuilder.mockReturnValue(qb as any);
      reminderRepository.find.mockResolvedValue([{ projectId: 'p-1' }] as Reminder[]);

      await service.createStagnantProjectReminders();

      expect(reminderRepository.save).not.toHaveBeenCalled();
    });
  });

  // =============================================
  // getReminderStatistics
  // =============================================

  describe('getReminderStatistics', () => {
    it('should aggregate statistics correctly', async () => {
      // The service now creates multiple query builders via baseQb().
      // Each call to createQueryBuilder returns a fresh mock.
      let callCount = 0;
      reminderRepository.createQueryBuilder.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // total count
          return createQueryBuilderMock({ getCount: jest.fn().mockResolvedValue(100) }) as any;
        } else if (callCount === 2) {
          // statusCounts
          return createQueryBuilderMock({
            getRawMany: jest.fn().mockResolvedValue([
              { status: 'pending', count: '25' },
              { status: 'sent', count: '70' },
              { status: 'failed', count: '5' },
            ]),
          }) as any;
        } else if (callCount === 3) {
          // typeCounts
          return createQueryBuilderMock({
            getRawMany: jest.fn().mockResolvedValue([
              { type: 'task_due', count: '40' },
              { type: 'task_overdue', count: '30' },
            ]),
          }) as any;
        } else if (callCount === 4) {
          // pendingCount
          return createQueryBuilderMock({ getCount: jest.fn().mockResolvedValue(25) }) as any;
        } else {
          // sentToday
          return createQueryBuilderMock({ getCount: jest.fn().mockResolvedValue(10) }) as any;
        }
      });

      const result = await service.getReminderStatistics();

      expect(result.total).toBe(100);
      expect(result.pendingCount).toBe(25);
      expect(result.byStatus).toEqual({ pending: 25, sent: 70, failed: 5 });
      expect(result.byType).toEqual({ task_due: 40, task_overdue: 30 });
      expect(result.sentToday).toBe(10);
    });
  });
});
