import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout';
import { ToastProvider, ErrorBoundary, RoleGuard } from '@/components/common';
import { useUIStore, useAuthStore } from '@/store';
import { useAuthListener } from '@/hooks';
import { isSupabaseConfigured } from '@/lib/supabase';
import { queryClient } from '@/lib/queryClient';
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
  RemindersPage,
  ProgressReportPage,
  PartnerPortalPage,
  PartnerReportsListPage,
  ReportsPage,
  AdminSettingsPage,
  EscalationRulesPage,
  PartnerContactSetupPage,
  TrashPage,
} from '@/pages';

// 認証初期化コンポーネント
function AuthProvider({ children }: { children: React.ReactNode }) {
  useAuthListener();

  const isInitialized = useAuthStore((state) => state.isInitialized);

  // Supabase環境変数が未設定の場合
  if (!isSupabaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center max-w-md p-8 bg-white rounded-lg shadow-lg">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">設定エラー</h1>
          <p className="text-gray-600 mb-4">
            Supabase環境変数が設定されていません。
          </p>
          <div className="text-left bg-gray-100 p-4 rounded text-sm font-mono">
            <p>VITE_SUPABASE_URL</p>
            <p>VITE_SUPABASE_ANON_KEY</p>
          </div>
          <p className="text-gray-500 text-sm mt-4">
            Render Dashboardで環境変数を設定後、再デプロイしてください。
          </p>
        </div>
      </div>
    );
  }

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

// admin限定ルート用
const ADMIN_ONLY: ('admin')[] = ['admin'];

function App() {
  const initTheme = useUIStore((state) => state.initTheme);

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  return (
    <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <AuthProvider>
            <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/progress-report/:token" element={<ProgressReportPage />} />
          <Route path="/partner/:token" element={<PartnerPortalPage />} />
          <Route path="/partner-setup/:token" element={<PartnerContactSetupPage />} />
          {/* Legacy routes - redirect to new combined portal */}
          <Route path="/report/:token" element={<PartnerPortalPage />} />
          <Route path="/dashboard/:token" element={<PartnerPortalPage />} />

          {/* Protected routes */}
          <Route element={<MainLayout />}>
            {/* All authenticated users */}
            <Route path="/" element={<Navigate to="/today" replace />} />
            <Route path="/today" element={<MyTodayPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/reminders" element={<RemindersPage />} />

            {/* All authenticated users (admin + member) */}
            <Route path="/projects" element={<ProjectListPage />} />
            <Route path="/projects/:id" element={<ProjectDetailPage />} />
            <Route path="/projects/:id/tasks/:taskId" element={<TaskDetailPage />} />
            <Route path="/projects/new" element={<ProjectCreatePage />} />
            <Route path="/projects/:id/edit" element={<ProjectCreatePage />} />
            <Route path="/projects/:id/tasks/new" element={<TaskCreatePage />} />
            <Route path="/projects/:id/tasks/:taskId/edit" element={<TaskCreatePage />} />

            <Route path="/partners" element={<PartnerListPage />} />
            <Route path="/partners/:id" element={<PartnerDetailPage />} />
            <Route path="/partner-reports" element={<PartnerReportsListPage />} />

            {/* ADMIN only */}
            <Route path="/partners/new" element={<RoleGuard allowedRoles={ADMIN_ONLY}><PartnerCreatePage /></RoleGuard>} />
            <Route path="/partners/:id/edit" element={<RoleGuard allowedRoles={ADMIN_ONLY}><PartnerCreatePage /></RoleGuard>} />
            <Route path="/manager" element={<RoleGuard allowedRoles={ADMIN_ONLY}><ManagerDashboardPage /></RoleGuard>} />
            <Route path="/reports" element={<RoleGuard allowedRoles={ADMIN_ONLY}><ReportsPage /></RoleGuard>} />
            <Route path="/admin/settings" element={<RoleGuard allowedRoles={ADMIN_ONLY}><AdminSettingsPage /></RoleGuard>} />
            <Route path="/admin/escalations" element={<RoleGuard allowedRoles={ADMIN_ONLY}><EscalationRulesPage /></RoleGuard>} />
            <Route path="/trash" element={<RoleGuard allowedRoles={ADMIN_ONLY}><TrashPage /></RoleGuard>} />

            {/* Catch all - redirect to today */}
            <Route path="*" element={<Navigate to="/today" replace />} />
          </Route>
          </Routes>
          </AuthProvider>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
