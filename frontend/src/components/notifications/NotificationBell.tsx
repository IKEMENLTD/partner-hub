import { useState, useRef, useEffect } from 'react';
import { Bell, Check, CheckCheck, Clock, AtSign, UserPlus, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useInAppNotifications } from '@/hooks/useInAppNotifications';
import type { InAppNotification, InAppNotificationType } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';

function getNotificationIcon(type: InAppNotificationType) {
  switch (type) {
    case 'deadline':
      return <Clock className="h-4 w-4 text-orange-500" />;
    case 'mention':
      return <AtSign className="h-4 w-4 text-blue-500" />;
    case 'assigned':
      return <UserPlus className="h-4 w-4 text-green-500" />;
    default:
      return <Info className="h-4 w-4 text-gray-500" />;
  }
}

function NotificationItem({
  notification,
  onMarkAsRead,
  onClick,
}: {
  notification: InAppNotification;
  onMarkAsRead: (id: string) => void;
  onClick: (notification: InAppNotification) => void;
}) {
  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), {
    addSuffix: true,
    locale: ja,
  });

  return (
    <div
      className={`flex items-start gap-3 p-3 hover:bg-gray-50 cursor-pointer transition-colors ${
        !notification.isRead ? 'bg-blue-50/50' : ''
      }`}
      onClick={() => onClick(notification)}
    >
      <div className="flex-shrink-0 mt-0.5">
        {getNotificationIcon(notification.type)}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${!notification.isRead ? 'font-medium' : 'text-gray-700'}`}>
          {notification.title}
        </p>
        {notification.message && (
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
            {notification.message}
          </p>
        )}
        <p className="text-xs text-gray-400 mt-1">{timeAgo}</p>
      </div>
      {!notification.isRead && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMarkAsRead(notification.id);
          }}
          className="flex-shrink-0 p-1 hover:bg-gray-200 rounded transition-colors"
          title="既読にする"
        >
          <Check className="h-4 w-4 text-gray-400" />
        </button>
      )}
    </div>
  );
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
  } = useInAppNotifications();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = (notification: InAppNotification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }

    if (notification.linkUrl) {
      navigate(notification.linkUrl);
      setIsOpen(false);
    } else if (notification.taskId) {
      navigate(`/tasks/${notification.taskId}`);
      setIsOpen(false);
    } else if (notification.projectId) {
      navigate(`/projects/${notification.projectId}`);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="通知"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed left-4 right-4 top-16 sm:absolute sm:left-auto sm:top-auto sm:right-0 mt-2 sm:w-[calc(100vw-2rem)] md:w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">通知</h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                すべて既読
              </button>
            )}
          </div>

          {/* Notification List */}
          <div>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                <Bell className="h-8 w-8 mb-2 text-gray-300" />
                <p className="text-sm">通知はありません</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.slice(0, 3).map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={markAsRead}
                    onClick={handleNotificationClick}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-gray-100 px-4 py-2">
              <button
                onClick={() => {
                  navigate('/notifications');
                  setIsOpen(false);
                }}
                className="w-full text-center text-sm text-primary-600 hover:text-primary-700 py-1"
              >
                すべての通知を見る
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
