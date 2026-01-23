import { Link, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import {
  Home,
  FolderKanban,
  Users,
  LayoutDashboard,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuthStore, useUIStore } from '@/store';

const mainNavItems = [
  { icon: Home, label: 'ダッシュボード', path: '/today' },
  { icon: FolderKanban, label: '案件一覧', path: '/projects' },
  { icon: Users, label: 'パートナー', path: '/partners' },
];

const managerNavItems = [
  { icon: LayoutDashboard, label: 'マネージャー', path: '/manager' },
];

export function Sidebar() {
  const location = useLocation();
  const { user } = useAuthStore();
  const { sidebarOpen, toggleSidebar } = useUIStore();

  const isManager = user?.role === 'admin' || user?.role === 'manager';

  return (
    <aside
      className={clsx(
        'fixed left-0 top-0 z-30 flex h-screen flex-col border-r border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 transition-all duration-300',
        sidebarOpen ? 'w-64' : 'w-16'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-gray-200 dark:border-slate-700 px-4">
        {sidebarOpen && (
          <Link to="/today" className="text-lg font-bold text-primary-600">
            Partner Hub
          </Link>
        )}
        <button
          onClick={toggleSidebar}
          className="rounded-lg p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800"
          aria-label={sidebarOpen ? 'サイドバーを閉じる' : 'サイドバーを開く'}
        >
          {sidebarOpen ? (
            <ChevronLeft className="h-5 w-5" />
          ) : (
            <ChevronRight className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {mainNavItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={clsx(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                  )}
                  title={!sidebarOpen ? item.label : undefined}
                >
                  <item.icon
                    className={clsx('h-5 w-5 flex-shrink-0', isActive && 'text-primary-600')}
                  />
                  {sidebarOpen && <span>{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>

        {isManager && (
          <>
            <div className="my-4 border-t border-gray-200 dark:border-slate-700" />
            <ul className="space-y-1">
              {managerNavItems.map((item) => {
                const isActive = location.pathname.startsWith(item.path);
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={clsx(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                      )}
                      title={!sidebarOpen ? item.label : undefined}
                    >
                      <item.icon
                        className={clsx('h-5 w-5 flex-shrink-0', isActive && 'text-primary-600')}
                      />
                      {sidebarOpen && <span>{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </nav>

      {/* Settings */}
      <div className="border-t border-gray-200 dark:border-slate-700 p-3">
        <Link
          to="/settings"
          className={clsx(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-100 dark:hover:bg-slate-800'
          )}
          title={!sidebarOpen ? '設定' : undefined}
        >
          <Settings className="h-5 w-5 flex-shrink-0" />
          {sidebarOpen && <span>設定</span>}
        </Link>
      </div>
    </aside>
  );
}
