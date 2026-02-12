import { Test, TestingModule } from '@nestjs/testing';
import { ReminderController } from './reminder.controller';
import { ReminderService } from './reminder.service';

describe('ReminderController', () => {
  let controller: ReminderController;

  const mockReminder = {
    id: 'reminder-uuid-1',
    type: 'task_due',
    message: 'Task is due tomorrow',
    isRead: false,
  };

  const mockReminderService = {
    create: jest.fn(),
    findAll: jest.fn(),
    getReminderStatistics: jest.fn(),
    getUserReminders: jest.fn(),
    getUnreadCount: jest.fn(),
    markAllAsRead: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    markAsRead: jest.fn(),
    cancel: jest.fn(),
    remove: jest.fn(),
    createTaskDueReminders: jest.fn(),
    createOverdueTaskReminders: jest.fn(),
    createProjectDeadlineReminders: jest.fn(),
    createStagnantProjectReminders: jest.fn(),
    processReminders: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReminderController],
      providers: [
        { provide: ReminderService, useValue: mockReminderService },
      ],
    }).compile();

    controller = module.get<ReminderController>(ReminderController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a reminder', async () => {
      const createDto = { type: 'task_due', message: 'Due soon' };
      mockReminderService.create.mockResolvedValue(mockReminder);

      const result = await controller.create(createDto as any, 'user-1');

      expect(result).toEqual(mockReminder);
      expect(mockReminderService.create).toHaveBeenCalledWith(createDto, 'user-1');
    });
  });

  describe('findAll', () => {
    it('should return paginated reminders', async () => {
      const expected = { data: [mockReminder], total: 1 };
      mockReminderService.findAll.mockResolvedValue(expected);

      const result = await controller.findAll({} as any, 'org-1');

      expect(result).toEqual(expected);
    });
  });

  describe('getStatistics', () => {
    it('should return reminder statistics', async () => {
      const stats = { total: 50, sent: 40, pending: 10 };
      mockReminderService.getReminderStatistics.mockResolvedValue(stats);

      const result = await controller.getStatistics('org-1');

      expect(result).toEqual(stats);
    });
  });

  describe('getMyReminders', () => {
    it('should return user reminders', async () => {
      mockReminderService.getUserReminders.mockResolvedValue([mockReminder]);

      const result = await controller.getMyReminders('user-1', undefined);

      expect(result).toEqual([mockReminder]);
      expect(mockReminderService.getUserReminders).toHaveBeenCalledWith('user-1', false);
    });

    it('should filter unread only when specified', async () => {
      mockReminderService.getUserReminders.mockResolvedValue([mockReminder]);

      await controller.getMyReminders('user-1', true);

      expect(mockReminderService.getUserReminders).toHaveBeenCalledWith('user-1', true);
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      mockReminderService.getUnreadCount.mockResolvedValue(3);

      const result = await controller.getUnreadCount('user-1');

      expect(result).toEqual({ count: 3 });
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all reminders as read', async () => {
      mockReminderService.markAllAsRead.mockResolvedValue(undefined);

      const result = await controller.markAllAsRead('user-1');

      expect(result).toEqual({ message: 'すべてのリマインダーを既読にしました' });
      expect(mockReminderService.markAllAsRead).toHaveBeenCalledWith('user-1');
    });
  });

  describe('getUserReminders', () => {
    it('should return reminders for a specific user', async () => {
      mockReminderService.getUserReminders.mockResolvedValue([mockReminder]);

      const result = await controller.getUserReminders('user-2', undefined, 'org-1');

      expect(result).toEqual([mockReminder]);
      expect(mockReminderService.getUserReminders).toHaveBeenCalledWith('user-2', false, 'org-1');
    });
  });

  describe('findOne', () => {
    it('should return a reminder by id', async () => {
      mockReminderService.findOne.mockResolvedValue(mockReminder);

      const result = await controller.findOne('reminder-1', 'org-1');

      expect(result).toEqual(mockReminder);
    });

    it('should propagate not found errors', async () => {
      mockReminderService.findOne.mockRejectedValue(new Error('Not found'));

      await expect(controller.findOne('invalid', 'org-1')).rejects.toThrow('Not found');
    });
  });

  describe('update', () => {
    it('should update a reminder', async () => {
      const updateDto = { message: 'Updated message' };
      mockReminderService.update.mockResolvedValue({ ...mockReminder, ...updateDto });

      mockReminderService.findOne.mockResolvedValue(mockReminder);
      const result = await controller.update('reminder-1', updateDto as any, 'org-1');

      expect(result.message).toBe('Updated message');
    });
  });

  describe('markAsRead', () => {
    it('should mark a reminder as read', async () => {
      mockReminderService.markAsRead.mockResolvedValue({ ...mockReminder, isRead: true });

      mockReminderService.findOne.mockResolvedValue(mockReminder);
      const result = await controller.markAsRead('reminder-1', 'org-1');

      expect(mockReminderService.markAsRead).toHaveBeenCalledWith('reminder-1');
    });
  });

  describe('cancel', () => {
    it('should cancel a reminder', async () => {
      mockReminderService.cancel.mockResolvedValue({ ...mockReminder, status: 'cancelled' });

      mockReminderService.findOne.mockResolvedValue(mockReminder);
      const result = await controller.cancel('reminder-1', 'org-1');

      expect(mockReminderService.cancel).toHaveBeenCalledWith('reminder-1');
    });
  });

  describe('remove', () => {
    it('should delete a reminder', async () => {
      mockReminderService.remove.mockResolvedValue(undefined);

      mockReminderService.findOne.mockResolvedValue(mockReminder);
      await controller.remove('reminder-1', 'org-1');

      expect(mockReminderService.remove).toHaveBeenCalledWith('reminder-1');
    });
  });

  describe('triggerGenerate', () => {
    it('should trigger all reminder generators and return results', async () => {
      mockReminderService.createTaskDueReminders.mockResolvedValue(undefined);
      mockReminderService.createOverdueTaskReminders.mockResolvedValue(undefined);
      mockReminderService.createProjectDeadlineReminders.mockResolvedValue(undefined);
      mockReminderService.createStagnantProjectReminders.mockResolvedValue(undefined);

      const result = await controller.triggerGenerate();

      expect(result.message).toBe('リマインダー自動生成を実行しました');
      expect(result.results.taskDue).toBe('OK');
      expect(result.results.taskOverdue).toBe('OK');
      expect(result.results.projectDeadline).toBe('OK');
      expect(result.results.projectStagnant).toBe('OK');
    });

    it('should handle errors in individual generators', async () => {
      mockReminderService.createTaskDueReminders.mockRejectedValue(new Error('DB error'));
      mockReminderService.createOverdueTaskReminders.mockResolvedValue(undefined);
      mockReminderService.createProjectDeadlineReminders.mockResolvedValue(undefined);
      mockReminderService.createStagnantProjectReminders.mockResolvedValue(undefined);

      const result = await controller.triggerGenerate();

      expect(result.results.taskDue).toBe('ERROR: DB error');
      expect(result.results.taskOverdue).toBe('OK');
    });
  });

  describe('triggerProcess', () => {
    it('should trigger reminder processing', async () => {
      mockReminderService.processReminders.mockResolvedValue(undefined);

      const result = await controller.triggerProcess();

      expect(result).toEqual({ message: 'リマインダー処理を実行しました' });
      expect(mockReminderService.processReminders).toHaveBeenCalled();
    });
  });
});
