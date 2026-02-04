import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReminderService } from './reminder.service';
import { Reminder } from './entities/reminder.entity';
import { Task } from '../task/entities/task.entity';
import { Project } from '../project/entities/project.entity';
import { ReminderType, ReminderStatus, ReminderChannel } from './enums/reminder-type.enum';
import { ResourceNotFoundException } from '../../common/exceptions/resource-not-found.exception';

describe('ReminderService', () => {
  let service: ReminderService;
  let reminderRepository: Repository<Reminder>;

  const mockReminder: Partial<Reminder> = {
    id: 'test-reminder-uuid',
    title: 'Test Reminder',
    message: 'Test message',
    type: ReminderType.TASK_DUE,
    status: ReminderStatus.PENDING,
    channel: ReminderChannel.IN_APP,
    userId: 'user-uuid',
    scheduledAt: new Date(),
    isRead: false,
    retryCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockReminderRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[mockReminder], 1]),
      getMany: jest.fn().mockResolvedValue([mockReminder]),
      getCount: jest.fn().mockResolvedValue(5),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    })),
  };

  const mockTaskRepository = {
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    })),
  };

  const mockProjectRepository = {
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReminderService,
        {
          provide: getRepositoryToken(Reminder),
          useValue: mockReminderRepository,
        },
        {
          provide: getRepositoryToken(Task),
          useValue: mockTaskRepository,
        },
        {
          provide: getRepositoryToken(Project),
          useValue: mockProjectRepository,
        },
      ],
    }).compile();

    service = module.get<ReminderService>(ReminderService);
    reminderRepository = module.get<Repository<Reminder>>(getRepositoryToken(Reminder));

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto = {
      title: 'New Reminder',
      message: 'New message',
      userId: 'user-uuid',
      scheduledAt: '2024-12-31T09:00:00Z',
    };

    it('should create a reminder successfully', async () => {
      mockReminderRepository.create.mockReturnValue({ ...mockReminder, ...createDto });
      mockReminderRepository.save.mockResolvedValue({ ...mockReminder, ...createDto });
      mockReminderRepository.findOne.mockResolvedValue({ ...mockReminder, ...createDto });

      const result = await service.create(createDto, 'creator-uuid');

      expect(result).toBeDefined();
      expect(mockReminderRepository.create).toHaveBeenCalled();
      expect(mockReminderRepository.save).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a reminder when found', async () => {
      mockReminderRepository.findOne.mockResolvedValue(mockReminder);

      const result = await service.findOne('test-reminder-uuid');

      expect(result).toEqual(mockReminder);
    });

    it('should throw ResourceNotFoundException when reminder not found', async () => {
      mockReminderRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent-uuid')).rejects.toThrow(ResourceNotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return paginated reminders', async () => {
      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });
  });

  describe('markAsRead', () => {
    it('should mark reminder as read', async () => {
      mockReminderRepository.findOne.mockResolvedValue({ ...mockReminder });
      mockReminderRepository.save.mockImplementation((r) => Promise.resolve(r));

      const result = await service.markAsRead('test-reminder-uuid');

      expect(result.isRead).toBe(true);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all reminders as read for user', async () => {
      await service.markAllAsRead('user-uuid');

      expect(mockReminderRepository.update).toHaveBeenCalledWith(
        { userId: 'user-uuid', isRead: false },
        { isRead: true },
      );
    });
  });

  describe('cancel', () => {
    it('should cancel a reminder', async () => {
      mockReminderRepository.findOne.mockResolvedValue({ ...mockReminder });
      mockReminderRepository.save.mockImplementation((r) => Promise.resolve(r));

      const result = await service.cancel('test-reminder-uuid');

      expect(result.status).toBe(ReminderStatus.CANCELLED);
    });
  });

  describe('remove', () => {
    it('should delete a reminder', async () => {
      mockReminderRepository.findOne.mockResolvedValue(mockReminder);

      await service.remove('test-reminder-uuid');

      expect(mockReminderRepository.remove).toHaveBeenCalledWith(mockReminder);
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count for user', async () => {
      mockReminderRepository.count.mockResolvedValue(5);

      const result = await service.getUnreadCount('user-uuid');

      expect(result).toBe(5);
      expect(mockReminderRepository.count).toHaveBeenCalledWith({
        where: { userId: 'user-uuid', isRead: false },
      });
    });
  });
});
