import { Link, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import {
  Home,
  FolderKanban,
  Users,
  MessageSquare,
  LayoutDashboard,
  Settings,
  ChevronLeft,
  ChevronRight,
  FileText,
} from 'lucide-react';
import { useAuthStore, useUIStore } from '@/store';

// 全ユーザー共通（admin + member）
const commonNavItems = [
  { icon: Home, label: 'ダッシュボード', path: '/today' },
  { icon: FolderKanban, label: '案件一覧', path: '/projects' },
  { icon: Users, label: 'パートナー', path: '/partners' },
  { icon: MessageSquare, label: 'パートナー報告', path: '/partner-reports' },
];

// ADMIN のみ
const adminNavItems = [
  { icon: LayoutDashboard, label: 'マネージャー', path: '/manager' },
  { icon: FileText, label: '自動レポート', path: '/reports' },
];

export function Sidebar() {
  const location = useLocation();
  const { user } = useAuthStore();
  const { sidebarOpen, toggleSidebar, isMobile, mobileMenuOpen, closeMobileMenu } = useUIStore();

  const isAdmin = user?.role === 'admin';

  const handleNavClick = () => {
    if (isMobile) {
      closeMobileMenu();
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isMobile && mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 transition-opacity lg:hidden"
          onClick={closeMobileMenu}
        />
      )}

      <aside
        className={clsx(
          'fixed left-0 top-0 flex h-screen flex-col border-r border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900',
          isMobile
            ? clsx(
                'w-64 z-40 transition-transform duration-300',
                mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
              )
            : clsx(
                'z-30 transition-all duration-300',
                sidebarOpen ? 'w-64' : 'w-16'
              )
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-gray-200 dark:border-slate-700 px-4">
          {(isMobile || sidebarOpen) && (
            <Link to="/today" className="text-lg font-bold text-primary-600" onClick={handleNavClick}>
              Partner Hub
            </Link>
          )}
          {!isMobile && (
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
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3">
          {/* 全ユーザー共通 */}
          <ul className="space-y-1">
            {commonNavItems.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={handleNavClick}
                    className={clsx(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                    )}
                    title={!isMobile && !sidebarOpen ? item.label : undefined}
                  >
                    <item.icon
                      className={clsx('h-5 w-5 flex-shrink-0', isActive && 'text-primary-600')}
                    />
                    {(isMobile || sidebarOpen) && <span>{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* ADMIN のみ */}
          {isAdmin && (
            <>
              <div className="my-4 border-t border-gray-200 dark:border-slate-700" />
              <ul className="space-y-1">
                {adminNavItems.map((item) => {
                  const isActive = location.pathname.startsWith(item.path);
                  return (
                    <li key={item.path}>
                      <Link
                        to={item.path}
                        onClick={handleNavClick}
                        className={clsx(
                          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                        )}
                        title={!isMobile && !sidebarOpen ? item.label : undefined}
                      >
                        <item.icon
                          className={clsx('h-5 w-5 flex-shrink-0', isActive && 'text-primary-600')}
                        />
                        {(isMobile || sidebarOpen) && <span>{item.label}</span>}
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
            onClick={handleNavClick}
            className={clsx(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-100 dark:hover:bg-slate-800'
            )}
            title={!isMobile && !sidebarOpen ? '設定' : undefined}
          >
            <Settings className="h-5 w-5 flex-shrink-0" />
            {(isMobile || sidebarOpen) && <span>設定</span>}
          </Link>
        </div>
      </aside>
    </>
  );
}
