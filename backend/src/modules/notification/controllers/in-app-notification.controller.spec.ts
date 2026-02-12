import { Test, TestingModule } from '@nestjs/testing';
import { InAppNotificationController } from './in-app-notification.controller';
import { InAppNotificationService } from '../services/in-app-notification.service';

describe('InAppNotificationController', () => {
  let controller: InAppNotificationController;

  const mockNotificationService = {
    getByUserId: jest.fn(),
    getUnreadCount: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
    delete: jest.fn(),
    deleteAllRead: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InAppNotificationController],
      providers: [
        { provide: InAppNotificationService, useValue: mockNotificationService },
      ],
    }).compile();

    controller = module.get<InAppNotificationController>(InAppNotificationController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getNotifications', () => {
    it('should return notifications with default params', async () => {
      const notifications = { data: [], total: 0 };
      mockNotificationService.getByUserId.mockResolvedValue(notifications);

      const result = await controller.getNotifications('user-1');

      expect(result).toEqual(notifications);
      expect(mockNotificationService.getByUserId).toHaveBeenCalledWith('user-1', {
        limit: 20,
        offset: 0,
        unreadOnly: false,
      });
    });

    it('should parse query parameters correctly', async () => {
      mockNotificationService.getByUserId.mockResolvedValue({ data: [], total: 0 });

      await controller.getNotifications('user-1', '50', '10', 'true');

      expect(mockNotificationService.getByUserId).toHaveBeenCalledWith('user-1', {
        limit: 50,
        offset: 10,
        unreadOnly: true,
      });
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread notification count', async () => {
      mockNotificationService.getUnreadCount.mockResolvedValue(5);

      const result = await controller.getUnreadCount('user-1');

      expect(result).toEqual({ count: 5 });
      expect(mockNotificationService.getUnreadCount).toHaveBeenCalledWith('user-1');
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read', async () => {
      mockNotificationService.markAsRead.mockResolvedValue(true);

      const result = await controller.markAsRead('notif-1', 'user-1');

      expect(result).toEqual({ success: true });
      expect(mockNotificationService.markAsRead).toHaveBeenCalledWith('notif-1', 'user-1');
    });

    it('should return false when notification not found', async () => {
      mockNotificationService.markAsRead.mockResolvedValue(false);

      const result = await controller.markAsRead('invalid', 'user-1');

      expect(result).toEqual({ success: false });
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      mockNotificationService.markAllAsRead.mockResolvedValue(10);

      const result = await controller.markAllAsRead('user-1');

      expect(result).toEqual({ success: true, count: 10 });
      expect(mockNotificationService.markAllAsRead).toHaveBeenCalledWith('user-1');
    });
  });

  describe('deleteNotification', () => {
    it('should delete a notification', async () => {
      mockNotificationService.delete.mockResolvedValue(true);

      const result = await controller.deleteNotification('notif-1', 'user-1');

      expect(result).toEqual({ success: true });
      expect(mockNotificationService.delete).toHaveBeenCalledWith('notif-1', 'user-1');
    });
  });

  describe('deleteAllRead', () => {
    it('should delete all read notifications', async () => {
      mockNotificationService.deleteAllRead.mockResolvedValue(5);

      const result = await controller.deleteAllRead('user-1');

      expect(result).toEqual({ success: true, count: 5 });
      expect(mockNotificationService.deleteAllRead).toHaveBeenCalledWith('user-1');
    });
  });
});
