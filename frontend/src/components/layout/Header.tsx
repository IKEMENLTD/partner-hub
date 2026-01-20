import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Search, LogOut, User, ChevronDown } from 'lucide-react';
import { useAuthStore, useUIStore } from '@/store';
import { getUserDisplayName, Alert } from '@/types';
import { useLogout, useAlerts } from '@/hooks';
import { Avatar, Badge } from '@/components/common';
import clsx from 'clsx';

export function Header() {
  const { user } = useAuthStore();
  const { sidebarOpen } = useUIStore();
  const { mutate: logout } = useLogout();
  const { data: alertsData } = useAlerts();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const alerts: Alert[] = alertsData || [];
  const unreadCount = alerts.filter((a) => !a.isRead).length;

  const handleLogout = () => {
    logout();
  };

  return (
    <header
      className={clsx(
        'fixed top-0 z-20 flex h-16 items-center justify-between border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 transition-all duration-300',
        sidebarOpen ? 'left-64' : 'left-16',
        'right-0'
      )}
    >
      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          <input
            type="search"
            placeholder="検索..."
            className="w-full rounded-lg border border-gray-300 bg-gray-50 py-2 pl-10 pr-4 text-sm placeholder:text-gray-400 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100 dark:placeholder:text-gray-400 dark:focus:bg-slate-800"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setIsNotificationOpen(!isNotificationOpen)}
            className="relative rounded-lg p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800"
            aria-label="通知"
            aria-expanded={isNotificationOpen}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {isNotificationOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsNotificationOpen(false)}
              />
              <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg">
                <div className="border-b border-gray-200 dark:border-slate-700 px-4 py-3">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">通知</h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {alerts.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                      通知はありません
                    </p>
                  ) : (
                    <ul>
                      {alerts.slice(0, 5).map((alert) => (
                        <li
                          key={alert.id}
                          className={clsx(
                            'border-b border-gray-100 px-4 py-3 last:border-b-0',
                            !alert.isRead && 'bg-blue-50'
                          )}
                        >
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {alert.title}
                          </p>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {alert.message}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {alerts.length > 0 && (
                  <div className="border-t border-gray-200 dark:border-slate-700 px-4 py-3">
                    <Link
                      to="/notifications"
                      className="text-sm font-medium text-primary-600 hover:text-primary-700"
                      onClick={() => setIsNotificationOpen(false)}
                    >
                      すべての通知を見る
                    </Link>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Profile dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800"
            aria-expanded={isProfileOpen}
            aria-haspopup="true"
          >
            <Avatar name={getUserDisplayName(user) || 'User'} src={user?.avatarUrl} size="sm" />
            <span className="hidden text-sm font-medium text-gray-700 dark:text-gray-300 md:block">
              {getUserDisplayName(user)}
            </span>
            <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          </button>

          {isProfileOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsProfileOpen(false)}
              />
              <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-1 shadow-lg">
                <div className="border-b border-gray-200 dark:border-slate-700 px-4 py-3">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{getUserDisplayName(user)}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                  <Badge variant="primary" size="sm" className="mt-2">
                    {user?.role === 'admin'
                      ? '管理者'
                      : user?.role === 'manager'
                      ? 'マネージャー'
                      : user?.role === 'partner'
                      ? 'パートナー'
                      : 'メンバー'}
                  </Badge>
                </div>
                <Link
                  to="/profile"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800"
                  onClick={() => setIsProfileOpen(false)}
                >
                  <User className="h-4 w-4" />
                  プロフィール
                </Link>
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    handleLogout();
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-slate-800"
                >
                  <LogOut className="h-4 w-4" />
                  ログアウト
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
