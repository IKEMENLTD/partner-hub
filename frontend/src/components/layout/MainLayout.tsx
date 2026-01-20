import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore, useUIStore } from '@/store';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import clsx from 'clsx';

export function MainLayout() {
  const { isAuthenticated } = useAuthStore();
  const { sidebarOpen } = useUIStore();

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
          sidebarOpen ? 'ml-64' : 'ml-16'
        )}
      >
        <div className="min-h-[calc(100vh-4rem)] p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
