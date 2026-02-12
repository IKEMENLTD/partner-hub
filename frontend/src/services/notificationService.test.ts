import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { inAppNotificationService } from './inAppNotificationService';
import { notificationSettingsService } from './notificationSettingsService';
import { api, extractData } from './api';

// Mock api module
vi.mock('./api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  transformPaginatedResponse: vi.fn((response) => {
    const { pagination } = response.data;
    const page = Math.floor(pagination.offset / pagination.limit) + 1;
    const totalPages = Math.ceil(pagination.total / pagination.limit);
    return {
      data: response.data.data,
      total: pagination.total,
      page,
      pageSize: pagination.limit,
      totalPages,
    };
  }),
  extractData: vi.fn((response) => response.data),
}));

describe('inAppNotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getNotifications', () => {
    it('should fetch notifications without params', async () => {
      const mockNotifications = {
        notifications: [
          {
            id: 'notif-1',
            type: 'task_assigned',
            title: 'タスクが割り当てられました',
            message: 'タスクAが割り当てられました',
            isRead: false,
            createdAt: '2024-06-15T10:00:00Z',
          },
          {
            id: 'notif-2',
            type: 'project_update',
            title: 'プロジェクト更新',
            message: 'プロジェクトBが更新されました',
            isRead: true,
            createdAt: '2024-06-14T09:00:00Z',
          },
        ],
        total: 2,
        unreadCount: 1,
      };

      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: mockNotifications,
      });

      const result = await inAppNotificationService.getNotifications();

      expect(api.get).toHaveBeenCalledWith('/notifications');
      expect(result.notifications).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.unreadCount).toBe(1);
    });

    it('should fetch notifications with limit param', async () => {
      const mockNotifications = {
        notifications: [{ id: 'notif-1', title: 'Test' }],
        total: 50,
        unreadCount: 5,
      };

      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: mockNotifications,
      });

      const result = await inAppNotificationService.getNotifications({ limit: 10 });

      expect(api.get).toHaveBeenCalledWith('/notifications?limit=10');
      expect(result.total).toBe(50);
    });

    it('should fetch notifications with offset param', async () => {
      const mockNotifications = {
        notifications: [],
        total: 50,
        unreadCount: 5,
      };

      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: mockNotifications,
      });

      await inAppNotificationService.getNotifications({ offset: 20 });

      expect(api.get).toHaveBeenCalledWith('/notifications?offset=20');
    });

    it('should fetch notifications with unreadOnly param', async () => {
      const mockNotifications = {
        notifications: [{ id: 'notif-1', isRead: false }],
        total: 5,
        unreadCount: 5,
      };

      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: mockNotifications,
      });

      await inAppNotificationService.getNotifications({ unreadOnly: true });

      expect(api.get).toHaveBeenCalledWith('/notifications?unreadOnly=true');
    });

    it('should fetch notifications with all params combined', async () => {
      const mockNotifications = {
        notifications: [],
        total: 100,
        unreadCount: 20,
      };

      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: mockNotifications,
      });

      await inAppNotificationService.getNotifications({
        limit: 10,
        offset: 30,
        unreadOnly: true,
      });

      expect(api.get).toHaveBeenCalledWith('/notifications?limit=10&offset=30&unreadOnly=true');
    });

    it('should skip falsy params', async () => {
      const mockNotifications = {
        notifications: [],
        total: 0,
        unreadCount: 0,
      };

      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: mockNotifications,
      });

      await inAppNotificationService.getNotifications({
        limit: 0,
        offset: 0,
        unreadOnly: false,
      });

      // limit=0, offset=0, unreadOnly=false are all falsy, so no query params
      expect(api.get).toHaveBeenCalledWith('/notifications');
    });

    it('should handle empty notifications list', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: {
          notifications: [],
          total: 0,
          unreadCount: 0,
        },
      });

      const result = await inAppNotificationService.getNotifications();

      expect(result.notifications).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.unreadCount).toBe(0);
    });

    it('should handle API error', async () => {
      vi.mocked(api.get).mockRejectedValueOnce(new Error('Network error'));

      await expect(inAppNotificationService.getNotifications()).rejects.toThrow('Network error');
    });

    it('should handle unauthorized error', async () => {
      vi.mocked(api.get).mockRejectedValueOnce(new Error('Unauthorized'));

      await expect(inAppNotificationService.getNotifications()).rejects.toThrow('Unauthorized');
    });
  });

  describe('getUnreadCount', () => {
    it('should fetch unread notification count', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: { count: 15 },
      });

      const result = await inAppNotificationService.getUnreadCount();

      expect(api.get).toHaveBeenCalledWith('/notifications/unread-count');
      expect(result).toBe(15);
    });

    it('should return zero when no unread notifications', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: { count: 0 },
      });

      const result = await inAppNotificationService.getUnreadCount();

      expect(result).toBe(0);
    });

    it('should handle large unread count', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: { count: 9999 },
      });

      const result = await inAppNotificationService.getUnreadCount();

      expect(result).toBe(9999);
    });

    it('should handle API error', async () => {
      vi.mocked(api.get).mockRejectedValueOnce(new Error('Server error'));

      await expect(inAppNotificationService.getUnreadCount()).rejects.toThrow('Server error');
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({
        success: true,
        data: { success: true },
      });

      const result = await inAppNotificationService.markAsRead('notif-1');

      expect(api.post).toHaveBeenCalledWith('/notifications/notif-1/read');
      expect(result).toBe(true);
    });

    it('should handle marking already read notification', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({
        success: true,
        data: { success: true },
      });

      const result = await inAppNotificationService.markAsRead('notif-already-read');

      expect(api.post).toHaveBeenCalledWith('/notifications/notif-already-read/read');
      expect(result).toBe(true);
    });

    it('should handle marking nonexistent notification', async () => {
      vi.mocked(api.post).mockRejectedValueOnce(new Error('Notification not found'));

      await expect(
        inAppNotificationService.markAsRead('nonexistent')
      ).rejects.toThrow('Notification not found');
    });

    it('should handle API error when marking as read', async () => {
      vi.mocked(api.post).mockRejectedValueOnce(new Error('Internal server error'));

      await expect(
        inAppNotificationService.markAsRead('notif-1')
      ).rejects.toThrow('Internal server error');
    });

    it('should handle UUID format id', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({
        success: true,
        data: { success: true },
      });

      await inAppNotificationService.markAsRead('550e8400-e29b-41d4-a716-446655440000');

      expect(api.post).toHaveBeenCalledWith(
        '/notifications/550e8400-e29b-41d4-a716-446655440000/read'
      );
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({
        success: true,
        data: { success: true, count: 10 },
      });

      const result = await inAppNotificationService.markAllAsRead();

      expect(api.post).toHaveBeenCalledWith('/notifications/read-all');
      expect(result).toBe(10);
    });

    it('should return zero when no unread notifications exist', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({
        success: true,
        data: { success: true, count: 0 },
      });

      const result = await inAppNotificationService.markAllAsRead();

      expect(result).toBe(0);
    });

    it('should handle large count of marked notifications', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({
        success: true,
        data: { success: true, count: 500 },
      });

      const result = await inAppNotificationService.markAllAsRead();

      expect(result).toBe(500);
    });

    it('should handle API error when marking all as read', async () => {
      vi.mocked(api.post).mockRejectedValueOnce(new Error('Server error'));

      await expect(inAppNotificationService.markAllAsRead()).rejects.toThrow('Server error');
    });
  });

  describe('deleteNotification', () => {
    it('should delete a notification', async () => {
      vi.mocked(api.delete).mockResolvedValueOnce({
        success: true,
        data: { success: true },
      });

      const result = await inAppNotificationService.deleteNotification('notif-1');

      expect(api.delete).toHaveBeenCalledWith('/notifications/notif-1');
      expect(result).toBe(true);
    });

    it('should handle deleting nonexistent notification', async () => {
      vi.mocked(api.delete).mockRejectedValueOnce(new Error('Notification not found'));

      await expect(
        inAppNotificationService.deleteNotification('nonexistent')
      ).rejects.toThrow('Notification not found');
    });

    it('should handle API error when deleting', async () => {
      vi.mocked(api.delete).mockRejectedValueOnce(new Error('Forbidden'));

      await expect(
        inAppNotificationService.deleteNotification('notif-1')
      ).rejects.toThrow('Forbidden');
    });

    it('should handle UUID format id for delete', async () => {
      vi.mocked(api.delete).mockResolvedValueOnce({
        success: true,
        data: { success: true },
      });

      await inAppNotificationService.deleteNotification('550e8400-e29b-41d4-a716-446655440000');

      expect(api.delete).toHaveBeenCalledWith(
        '/notifications/550e8400-e29b-41d4-a716-446655440000'
      );
    });
  });

  describe('Edge cases', () => {
    it('should handle notification with special characters in id', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({
        success: true,
        data: { success: true },
      });

      await inAppNotificationService.markAsRead('notif-abc-123-def');

      expect(api.post).toHaveBeenCalledWith('/notifications/notif-abc-123-def/read');
    });

    it('should handle concurrent getNotifications and getUnreadCount calls', async () => {
      vi.mocked(api.get)
        .mockResolvedValueOnce({
          success: true,
          data: { notifications: [], total: 0, unreadCount: 0 },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { count: 5 },
        });

      const [notifications, count] = await Promise.all([
        inAppNotificationService.getNotifications(),
        inAppNotificationService.getUnreadCount(),
      ]);

      expect(api.get).toHaveBeenCalledTimes(2);
      expect(notifications.total).toBe(0);
      expect(count).toBe(5);
    });

    it('should handle getNotifications with only unreadOnly=false (not appended)', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: { notifications: [], total: 0, unreadCount: 0 },
      });

      await inAppNotificationService.getNotifications({ unreadOnly: false });

      // unreadOnly=false is falsy, so it should not be appended
      expect(api.get).toHaveBeenCalledWith('/notifications');
    });
  });

  describe('Boundary values', () => {
    it('should handle limit=1 for single notification fetch', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: {
          notifications: [{ id: 'notif-1', title: 'Only one' }],
          total: 100,
          unreadCount: 50,
        },
      });

      const result = await inAppNotificationService.getNotifications({ limit: 1 });

      expect(api.get).toHaveBeenCalledWith('/notifications?limit=1');
      expect(result.notifications).toHaveLength(1);
    });

    it('should handle very large offset', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: { notifications: [], total: 100, unreadCount: 0 },
      });

      await inAppNotificationService.getNotifications({ offset: 99999 });

      expect(api.get).toHaveBeenCalledWith('/notifications?offset=99999');
    });

    it('should handle very large limit', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: { notifications: [], total: 0, unreadCount: 0 },
      });

      await inAppNotificationService.getNotifications({ limit: 1000 });

      expect(api.get).toHaveBeenCalledWith('/notifications?limit=1000');
    });
  });
});

describe('notificationSettingsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getSettings', () => {
    it('should fetch notification settings', async () => {
      const mockSettings = {
        id: 'settings-1',
        userId: 'user-1',
        digestEnabled: true,
        digestTime: '07:00',
        deadlineNotification: true,
        assigneeChangeNotification: true,
        mentionNotification: true,
        escalationNotification: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-06-01T00:00:00Z',
      };

      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: mockSettings,
      });

      const result = await notificationSettingsService.getSettings();

      expect(api.get).toHaveBeenCalledWith('/users/me/notification-settings');
      expect(extractData).toHaveBeenCalled();
      expect(result).toEqual(mockSettings);
    });

    it('should handle default settings for new user', async () => {
      const mockDefaultSettings = {
        id: 'settings-new',
        userId: 'user-new',
        digestEnabled: false,
        digestTime: '07:00',
        deadlineNotification: true,
        assigneeChangeNotification: true,
        mentionNotification: true,
        escalationNotification: true,
        createdAt: '2024-06-15T00:00:00Z',
        updatedAt: '2024-06-15T00:00:00Z',
      };

      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: mockDefaultSettings,
      });

      const result = await notificationSettingsService.getSettings();

      expect(result.digestEnabled).toBe(false);
    });

    it('should handle API error when fetching settings', async () => {
      vi.mocked(api.get).mockRejectedValueOnce(new Error('Unauthorized'));

      await expect(notificationSettingsService.getSettings()).rejects.toThrow('Unauthorized');
    });

    it('should handle server error', async () => {
      vi.mocked(api.get).mockRejectedValueOnce(new Error('Internal server error'));

      await expect(notificationSettingsService.getSettings()).rejects.toThrow(
        'Internal server error'
      );
    });
  });

  describe('updateSettings', () => {
    it('should update notification settings with full data', async () => {
      const updateData = {
        digestEnabled: true,
        digestTime: '09:00' as const,
        deadlineNotification: false,
        assigneeChangeNotification: true,
        mentionNotification: false,
        escalationNotification: true,
      };

      const updatedSettings = {
        id: 'settings-1',
        userId: 'user-1',
        ...updateData,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-06-15T12:00:00Z',
      };

      vi.mocked(api.patch).mockResolvedValueOnce({
        success: true,
        data: updatedSettings,
      });

      const result = await notificationSettingsService.updateSettings(updateData);

      expect(api.patch).toHaveBeenCalledWith('/users/me/notification-settings', updateData);
      expect(extractData).toHaveBeenCalled();
      expect(result).toEqual(updatedSettings);
    });

    it('should update only digest settings', async () => {
      const updateData = {
        digestEnabled: false,
      };

      const updatedSettings = {
        id: 'settings-1',
        userId: 'user-1',
        digestEnabled: false,
        digestTime: '07:00',
        deadlineNotification: true,
        assigneeChangeNotification: true,
        mentionNotification: true,
        escalationNotification: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-06-15T12:00:00Z',
      };

      vi.mocked(api.patch).mockResolvedValueOnce({
        success: true,
        data: updatedSettings,
      });

      const result = await notificationSettingsService.updateSettings(updateData);

      expect(api.patch).toHaveBeenCalledWith('/users/me/notification-settings', updateData);
      expect(result.digestEnabled).toBe(false);
    });

    it('should update only deadline notification setting', async () => {
      const updateData = {
        deadlineNotification: false,
      };

      vi.mocked(api.patch).mockResolvedValueOnce({
        success: true,
        data: { id: 'settings-1', ...updateData },
      });

      await notificationSettingsService.updateSettings(updateData);

      expect(api.patch).toHaveBeenCalledWith('/users/me/notification-settings', updateData);
    });

    it('should update digest time', async () => {
      const updateData = {
        digestTime: '21:00' as const,
      };

      vi.mocked(api.patch).mockResolvedValueOnce({
        success: true,
        data: { id: 'settings-1', digestTime: '21:00' },
      });

      const result = await notificationSettingsService.updateSettings(updateData);

      expect(api.patch).toHaveBeenCalledWith('/users/me/notification-settings', updateData);
      expect(result.digestTime).toBe('21:00');
    });

    it('should handle validation error on update', async () => {
      vi.mocked(api.patch).mockRejectedValueOnce(new Error('Validation error'));

      await expect(
        notificationSettingsService.updateSettings({ digestTime: 'invalid' as any })
      ).rejects.toThrow('Validation error');
    });

    it('should handle unauthorized error on update', async () => {
      vi.mocked(api.patch).mockRejectedValueOnce(new Error('Unauthorized'));

      await expect(
        notificationSettingsService.updateSettings({ digestEnabled: true })
      ).rejects.toThrow('Unauthorized');
    });

    it('should handle empty update data', async () => {
      vi.mocked(api.patch).mockResolvedValueOnce({
        success: true,
        data: { id: 'settings-1' },
      });

      await notificationSettingsService.updateSettings({});

      expect(api.patch).toHaveBeenCalledWith('/users/me/notification-settings', {});
    });
  });

  describe('Edge cases', () => {
    it('should handle all notification toggles disabled', async () => {
      const updateData = {
        digestEnabled: false,
        deadlineNotification: false,
        assigneeChangeNotification: false,
        mentionNotification: false,
        escalationNotification: false,
      };

      vi.mocked(api.patch).mockResolvedValueOnce({
        success: true,
        data: { id: 'settings-1', ...updateData },
      });

      const result = await notificationSettingsService.updateSettings(updateData);

      expect(result.digestEnabled).toBe(false);
      expect(result.deadlineNotification).toBe(false);
      expect(result.assigneeChangeNotification).toBe(false);
      expect(result.mentionNotification).toBe(false);
      expect(result.escalationNotification).toBe(false);
    });

    it('should handle all notification toggles enabled', async () => {
      const updateData = {
        digestEnabled: true,
        deadlineNotification: true,
        assigneeChangeNotification: true,
        mentionNotification: true,
        escalationNotification: true,
      };

      vi.mocked(api.patch).mockResolvedValueOnce({
        success: true,
        data: { id: 'settings-1', ...updateData },
      });

      const result = await notificationSettingsService.updateSettings(updateData);

      expect(result.digestEnabled).toBe(true);
      expect(result.deadlineNotification).toBe(true);
      expect(result.assigneeChangeNotification).toBe(true);
      expect(result.mentionNotification).toBe(true);
      expect(result.escalationNotification).toBe(true);
    });

    it('should handle rapid sequential settings updates', async () => {
      vi.mocked(api.patch)
        .mockResolvedValueOnce({
          success: true,
          data: { id: 'settings-1', digestEnabled: true },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { id: 'settings-1', digestEnabled: false },
        });

      const result1 = await notificationSettingsService.updateSettings({ digestEnabled: true });
      const result2 = await notificationSettingsService.updateSettings({ digestEnabled: false });

      expect(api.patch).toHaveBeenCalledTimes(2);
      expect(result1.digestEnabled).toBe(true);
      expect(result2.digestEnabled).toBe(false);
    });
  });

  describe('Boundary values', () => {
    it('should handle earliest digest time', async () => {
      const updateData = { digestTime: '00:00' as const };

      vi.mocked(api.patch).mockResolvedValueOnce({
        success: true,
        data: { id: 'settings-1', digestTime: '00:00' },
      });

      const result = await notificationSettingsService.updateSettings(updateData);

      expect(result.digestTime).toBe('00:00');
    });

    it('should handle latest digest time', async () => {
      const updateData = { digestTime: '23:00' as const };

      vi.mocked(api.patch).mockResolvedValueOnce({
        success: true,
        data: { id: 'settings-1', digestTime: '23:00' },
      });

      const result = await notificationSettingsService.updateSettings(updateData);

      expect(result.digestTime).toBe('23:00');
    });
  });
});
