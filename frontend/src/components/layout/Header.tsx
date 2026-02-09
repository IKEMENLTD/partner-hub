import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogOut, User, ChevronDown, Menu } from 'lucide-react';
import { useAuthStore, useUIStore } from '@/store';
import { getUserDisplayName } from '@/types';
import { useLogout } from '@/hooks';
import { Avatar, Badge } from '@/components/common';
import { NotificationBell } from '@/components/notifications';
import { SearchBar } from './SearchBar';
import clsx from 'clsx';

export function Header() {
  const location = useLocation();
  const { user } = useAuthStore();
  const { sidebarOpen, isMobile, openMobileMenu } = useUIStore();
  const { mutate: logout } = useLogout();

  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Close dropdown on route change
  useEffect(() => {
    setIsProfileOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
  };

  return (
    <header
      className={clsx(
        'fixed top-0 z-20 flex h-16 items-center justify-between border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 transition-all duration-300',
        isMobile ? 'left-0' : (sidebarOpen ? 'left-64' : 'left-16'),
        'right-0'
      )}
    >
      {/* Left: Hamburger + Search */}
      <div className="flex items-center gap-2 flex-1">
        {isMobile && (
          <button
            onClick={openMobileMenu}
            className="rounded-lg p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 lg:hidden"
            aria-label="メニューを開く"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <div className="flex-1 max-w-[180px] sm:max-w-md">
          <SearchBar />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <NotificationBell />

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
