import { useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore, useUIStore } from '@/store';
import { useResponsive } from '@/hooks';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import clsx from 'clsx';

export function MainLayout() {
  const { isAuthenticated } = useAuthStore();
  const { sidebarOpen, isMobile, closeMobileMenu, setIsMobile } = useUIStore();
  const { isMobile: responsiveIsMobile } = useResponsive();
  const location = useLocation();

  // Sync responsive state to store
  useEffect(() => {
    setIsMobile(responsiveIsMobile);
  }, [responsiveIsMobile, setIsMobile]);

  // Close mobile menu on route change
  useEffect(() => {
    closeMobileMenu();
  }, [location.pathname, closeMobileMenu]);

  // パスワードリカバリーモード中は保護されたページにアクセスできない
  // localStorage を使用して全タブで共有する
  const isInRecoveryMode = localStorage.getItem('password_recovery_mode') === 'true';
  if (isInRecoveryMode) {
    return <Navigate to="/reset-password" replace />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <Sidebar />
      <Header />
      <main
        className={clsx(
          'pt-16 transition-all duration-300',
          isMobile ? 'ml-0' : (sidebarOpen ? 'ml-64' : 'ml-16')
        )}
      >
        <div className="min-h-[calc(100vh-4rem)] main-content">
          <div className="page-container">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
