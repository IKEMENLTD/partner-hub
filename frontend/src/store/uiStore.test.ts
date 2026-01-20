import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from './uiStore';

describe('uiStore', () => {
  beforeEach(() => {
    // Reset store before each test
    const store = useUIStore.getState();
    store.setSidebarOpen(true);
    store.setProjectListView('list');
    store.setTheme('light');
    store.clearNotifications();
  });

  describe('Initial State', () => {
    it('should have initial state', () => {
      const store = useUIStore.getState();

      expect(store.sidebarOpen).toBe(true);
      expect(store.projectListView).toBe('list');
      expect(store.theme).toBe('light');
      expect(store.notifications).toEqual([]);
    });
  });

  describe('Sidebar actions', () => {
    it('should toggle sidebar', () => {
      const store = useUIStore.getState();

      expect(useUIStore.getState().sidebarOpen).toBe(true);

      store.toggleSidebar();
      expect(useUIStore.getState().sidebarOpen).toBe(false);

      store.toggleSidebar();
      expect(useUIStore.getState().sidebarOpen).toBe(true);
    });

    it('should set sidebar open state', () => {
      const store = useUIStore.getState();

      store.setSidebarOpen(false);
      expect(useUIStore.getState().sidebarOpen).toBe(false);

      store.setSidebarOpen(true);
      expect(useUIStore.getState().sidebarOpen).toBe(true);
    });
  });

  describe('Project list view actions', () => {
    it('should set project list view to list', () => {
      const store = useUIStore.getState();

      store.setProjectListView('list');

      expect(useUIStore.getState().projectListView).toBe('list');
    });

    it('should set project list view to grid', () => {
      const store = useUIStore.getState();

      store.setProjectListView('grid');

      expect(useUIStore.getState().projectListView).toBe('grid');
    });

    it('should set project list view to kanban', () => {
      const store = useUIStore.getState();

      store.setProjectListView('kanban');

      expect(useUIStore.getState().projectListView).toBe('kanban');
    });
  });

  describe('Theme actions', () => {
    it('should set theme to light', () => {
      const store = useUIStore.getState();

      store.setTheme('light');

      expect(useUIStore.getState().theme).toBe('light');
    });

    it('should set theme to dark', () => {
      const store = useUIStore.getState();

      store.setTheme('dark');

      expect(useUIStore.getState().theme).toBe('dark');
    });

    it('should set theme to system', () => {
      const store = useUIStore.getState();

      store.setTheme('system');

      expect(useUIStore.getState().theme).toBe('system');
    });
  });

  describe('Notification actions', () => {
    it('should add a notification', () => {
      const store = useUIStore.getState();
      const notification = {
        type: 'success' as const,
        title: 'Success',
        message: 'Operation completed',
      };

      store.addNotification(notification);

      const state = useUIStore.getState();
      expect(state.notifications).toHaveLength(1);
      expect(state.notifications[0]).toMatchObject(notification);
      expect(state.notifications[0].id).toBeDefined();
    });

    it('should add multiple notifications', () => {
      const store = useUIStore.getState();

      store.addNotification({
        type: 'success',
        title: 'Success 1',
      });
      store.addNotification({
        type: 'error',
        title: 'Error 1',
      });
      store.addNotification({
        type: 'warning',
        title: 'Warning 1',
      });

      const state = useUIStore.getState();
      expect(state.notifications).toHaveLength(3);
    });

    it('should generate unique IDs for notifications', () => {
      const store = useUIStore.getState();

      store.addNotification({ type: 'success', title: 'Test 1' });
      store.addNotification({ type: 'success', title: 'Test 2' });

      const state = useUIStore.getState();
      const ids = state.notifications.map((n) => n.id);
      expect(ids[0]).not.toBe(ids[1]);
    });

    it('should remove a notification by ID', () => {
      const store = useUIStore.getState();

      store.addNotification({ type: 'success', title: 'Test' });

      const notification = useUIStore.getState().notifications[0];
      const notificationId = notification.id;

      store.removeNotification(notificationId);

      const state = useUIStore.getState();
      expect(state.notifications).toHaveLength(0);
    });

    it('should not error when removing non-existent notification', () => {
      const store = useUIStore.getState();

      store.addNotification({ type: 'success', title: 'Test' });

      expect(() => {
        store.removeNotification('non-existent-id');
      }).not.toThrow();

      expect(useUIStore.getState().notifications).toHaveLength(1);
    });

    it('should clear all notifications', () => {
      const store = useUIStore.getState();

      store.addNotification({ type: 'success', title: 'Test 1' });
      store.addNotification({ type: 'error', title: 'Test 2' });
      store.addNotification({ type: 'warning', title: 'Test 3' });

      expect(useUIStore.getState().notifications).toHaveLength(3);

      store.clearNotifications();

      expect(useUIStore.getState().notifications).toHaveLength(0);
    });

    it('should handle notification with all properties', () => {
      const store = useUIStore.getState();
      const notification = {
        type: 'info' as const,
        title: 'Information',
        message: 'This is a detailed message',
        duration: 5000,
      };

      store.addNotification(notification);

      const state = useUIStore.getState();
      expect(state.notifications[0]).toMatchObject(notification);
    });

    it('should handle different notification types', () => {
      const store = useUIStore.getState();
      const types = ['success', 'error', 'warning', 'info'] as const;

      types.forEach((type) => {
        store.clearNotifications();
        store.addNotification({ type, title: `${type} notification` });

        const state = useUIStore.getState();
        expect(state.notifications[0].type).toBe(type);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple rapid toggles', () => {
      const store = useUIStore.getState();
      const initialState = store.sidebarOpen;

      for (let i = 0; i < 10; i++) {
        store.toggleSidebar();
      }

      // After 10 toggles (even number), should be back to initial state
      expect(useUIStore.getState().sidebarOpen).toBe(initialState);
    });

    it('should handle empty notification title', () => {
      const store = useUIStore.getState();

      store.addNotification({ type: 'success', title: '' });

      const state = useUIStore.getState();
      expect(state.notifications[0].title).toBe('');
    });

    it('should handle very long notification messages', () => {
      const store = useUIStore.getState();
      const longMessage = 'a'.repeat(1000);

      store.addNotification({
        type: 'info',
        title: 'Test',
        message: longMessage,
      });

      const state = useUIStore.getState();
      expect(state.notifications[0].message).toBe(longMessage);
    });

    it('should handle zero duration', () => {
      const store = useUIStore.getState();

      store.addNotification({
        type: 'success',
        title: 'Test',
        duration: 0,
      });

      const state = useUIStore.getState();
      expect(state.notifications[0].duration).toBe(0);
    });

    it('should handle negative duration', () => {
      const store = useUIStore.getState();

      store.addNotification({
        type: 'success',
        title: 'Test',
        duration: -1,
      });

      const state = useUIStore.getState();
      expect(state.notifications[0].duration).toBe(-1);
    });

    it('should maintain notification order', () => {
      const store = useUIStore.getState();

      store.addNotification({ type: 'success', title: 'First' });
      store.addNotification({ type: 'error', title: 'Second' });
      store.addNotification({ type: 'warning', title: 'Third' });

      const state = useUIStore.getState();
      expect(state.notifications[0].title).toBe('First');
      expect(state.notifications[1].title).toBe('Second');
      expect(state.notifications[2].title).toBe('Third');
    });

    it('should handle removing middle notification', () => {
      const store = useUIStore.getState();

      store.addNotification({ type: 'success', title: 'First' });
      store.addNotification({ type: 'error', title: 'Second' });
      store.addNotification({ type: 'warning', title: 'Third' });

      const notifications = useUIStore.getState().notifications;
      const middleId = notifications[1].id;

      store.removeNotification(middleId);

      const state = useUIStore.getState();
      expect(state.notifications).toHaveLength(2);
      expect(state.notifications[0].title).toBe('First');
      expect(state.notifications[1].title).toBe('Third');
    });
  });

  describe('State Persistence', () => {
    it('should maintain state across multiple operations', () => {
      const store = useUIStore.getState();

      store.setSidebarOpen(false);
      store.setProjectListView('grid');
      store.setTheme('dark');
      store.addNotification({ type: 'success', title: 'Test' });

      const state = useUIStore.getState();
      expect(state.sidebarOpen).toBe(false);
      expect(state.projectListView).toBe('grid');
      expect(state.theme).toBe('dark');
      expect(state.notifications).toHaveLength(1);
    });
  });

  describe('State Selectors', () => {
    it('should allow selecting specific state slices', () => {
      const state = useUIStore.getState();
      const sidebarOpen = state.sidebarOpen;
      const theme = state.theme;

      expect(typeof sidebarOpen).toBe('boolean');
      expect(typeof theme).toBe('string');
    });
  });
});
