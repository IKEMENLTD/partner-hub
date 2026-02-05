import { useEffect, useState, useCallback, useRef } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { inAppNotificationService } from '@/services/inAppNotificationService';
import { useAuthStore } from '@/store';
import type { InAppNotification } from '@/types';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000';

interface NotificationsData {
  notifications: InAppNotification[];
  total: number;
  unreadCount: number;
}

export function useInAppNotifications() {
  const { user, isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Fetch notifications
  const {
    data: notificationsData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['in-app-notifications'],
    queryFn: () => inAppNotificationService.getNotifications({ limit: 50 }),
    enabled: isAuthenticated,
    staleTime: 30000,
  });

  // Fetch unread count separately for badge
  const { data: unreadCountData } = useQuery({
    queryKey: ['in-app-notifications-unread-count'],
    queryFn: () => inAppNotificationService.getUnreadCount(),
    enabled: isAuthenticated,
    staleTime: 10000,
    refetchInterval: 60000, // Refresh every minute as fallback
  });

  const notifications = notificationsData?.notifications || [];
  const unreadCount = unreadCountData ?? notificationsData?.unreadCount ?? 0;

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => inAppNotificationService.markAsRead(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['in-app-notifications'] });

      const previousData = queryClient.getQueryData(['in-app-notifications']);

      queryClient.setQueryData(['in-app-notifications'], (old: NotificationsData | undefined) => {
        if (!old) return old;
        return {
          ...old,
          notifications: old.notifications.map((n: InAppNotification) =>
            n.id === id ? { ...n, isRead: true } : n
          ),
          unreadCount: Math.max(0, old.unreadCount - 1),
        };
      });

      queryClient.setQueryData(['in-app-notifications-unread-count'], (old: number) =>
        Math.max(0, (old ?? 0) - 1)
      );

      return { previousData };
    },
    onError: (_err, _id, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['in-app-notifications'], context.previousData);
      }
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: () => inAppNotificationService.markAllAsRead(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['in-app-notifications'] });

      const previousData = queryClient.getQueryData(['in-app-notifications']);

      queryClient.setQueryData(['in-app-notifications'], (old: NotificationsData | undefined) => {
        if (!old) return old;
        return {
          ...old,
          notifications: old.notifications.map((n: InAppNotification) => ({
            ...n,
            isRead: true,
          })),
          unreadCount: 0,
        };
      });

      queryClient.setQueryData(['in-app-notifications-unread-count'], 0);

      return { previousData };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['in-app-notifications'], context.previousData);
      }
    },
  });

  // WebSocket connection
  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    const token = useAuthStore.getState().session?.access_token;

    const socket = io(`${SOCKET_URL}/notifications`, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      auth: { token },
    });

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('subscribe', user.id);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('notification', (notification: InAppNotification) => {
      // Add new notification to the list
      queryClient.setQueryData(['in-app-notifications'], (old: NotificationsData | undefined) => {
        if (!old) return old;
        return {
          ...old,
          notifications: [notification, ...old.notifications],
          total: old.total + 1,
          unreadCount: old.unreadCount + 1,
        };
      });

      queryClient.setQueryData(['in-app-notifications-unread-count'], (old: number) =>
        (old ?? 0) + 1
      );
    });

    socket.on('unreadCount', ({ count }: { count: number }) => {
      queryClient.setQueryData(['in-app-notifications-unread-count'], count);
    });

    socketRef.current = socket;

    return () => {
      if (user?.id) {
        socket.emit('unsubscribe', user.id);
      }
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [isAuthenticated, user?.id, queryClient]);

  const markAsRead = useCallback(
    (id: string) => {
      markAsReadMutation.mutate(id);
    },
    [markAsReadMutation]
  );

  const markAllAsRead = useCallback(() => {
    markAllAsReadMutation.mutate();
  }, [markAllAsReadMutation]);

  return {
    notifications,
    unreadCount,
    isLoading,
    isConnected,
    markAsRead,
    markAllAsRead,
    refetch,
  };
}
