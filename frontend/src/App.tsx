import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout';
import { useUIStore, useAuthStore } from '@/store';
import { useAuthListener } from '@/hooks';
import {
  LoginPage,
  RegisterPage,
  ForgotPasswordPage,
  ResetPasswordPage,
  MyTodayPage,
  ProjectListPage,
  ProjectDetailPage,
  ProjectCreatePage,
  TaskDetailPage,
  TaskCreatePage,
  PartnerListPage,
  PartnerDetailPage,
  PartnerCreatePage,
  ManagerDashboardPage,
  SettingsPage,
  ProfilePage,
  NotificationsPage,
  ProgressReportPage,
} from '@/pages';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
    mutations: {
      retry: 0,
    },
  },
});

// 認証初期化コンポーネント
function AuthProvider({ children }: { children: React.ReactNode }) {
  useAuthListener();

  const isInitialized = useAuthStore((state) => state.isInitialized);

  if (!isInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function App() {
  const initTheme = useUIStore((state) => state.initTheme);

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/progress-report/:token" element={<ProgressReportPage />} />

          {/* Protected routes */}
          <Route element={<MainLayout />}>
            <Route path="/" element={<Navigate to="/today" replace />} />
            <Route path="/today" element={<MyTodayPage />} />

            {/* Project routes */}
            <Route path="/projects" element={<ProjectListPage />} />
            <Route path="/projects/new" element={<ProjectCreatePage />} />
            <Route path="/projects/:id" element={<ProjectDetailPage />} />
            <Route path="/projects/:id/edit" element={<ProjectCreatePage />} />

            {/* Task routes */}
            <Route path="/projects/:id/tasks/new" element={<TaskCreatePage />} />
            <Route path="/projects/:id/tasks/:taskId" element={<TaskDetailPage />} />
            <Route path="/projects/:id/tasks/:taskId/edit" element={<TaskCreatePage />} />

            {/* Partner routes */}
            <Route path="/partners" element={<PartnerListPage />} />
            <Route path="/partners/new" element={<PartnerCreatePage />} />
            <Route path="/partners/:id" element={<PartnerDetailPage />} />
            <Route path="/partners/:id/edit" element={<PartnerCreatePage />} />

            {/* Manager routes */}
            <Route path="/manager" element={<ManagerDashboardPage />} />

            {/* User routes */}
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/notifications" element={<NotificationsPage />} />

            {/* Catch all - redirect to today */}
            <Route path="*" element={<Navigate to="/today" replace />} />
          </Route>
        </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
