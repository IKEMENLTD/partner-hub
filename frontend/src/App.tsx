import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout';
import { useUIStore } from '@/store';
import {
  LoginPage,
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

function App() {
  const initTheme = useUIStore((state) => state.initTheme);

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />

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
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
