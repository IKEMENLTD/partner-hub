import { create } from 'zustand';
import type { ViewType } from '@/types';

// localStorage キー
const THEME_STORAGE_KEY = 'partner-hub-theme';

// テーマをDOMに適用する関数
const applyTheme = (theme: 'light' | 'dark' | 'system') => {
  const root = document.documentElement;

  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', prefersDark);
  } else {
    root.classList.toggle('dark', theme === 'dark');
  }
};

interface UIState {
  sidebarOpen: boolean;
  isMobile: boolean;
  mobileMenuOpen: boolean;
  projectListView: ViewType;
  theme: 'light' | 'dark' | 'system';
  notifications: Notification[];
}

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

interface UIActions {
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setIsMobile: (v: boolean) => void;
  openMobileMenu: () => void;
  closeMobileMenu: () => void;
  setProjectListView: (view: ViewType) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  initTheme: () => void;
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

type UIStore = UIState & UIActions;

export const useUIStore = create<UIStore>()((set) => ({
  // State
  sidebarOpen: true,
  isMobile: false,
  mobileMenuOpen: false,
  projectListView: 'list',
  theme: 'light',
  notifications: [],

  // Actions
  toggleSidebar: () =>
    set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  setIsMobile: (v) =>
    set(() =>
      v
        ? { isMobile: true, sidebarOpen: false, mobileMenuOpen: false }
        : { isMobile: false, mobileMenuOpen: false }
    ),

  openMobileMenu: () => set({ mobileMenuOpen: true }),

  closeMobileMenu: () => set({ mobileMenuOpen: false }),

  setProjectListView: (view) => set({ projectListView: view }),

  setTheme: (theme) => {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    applyTheme(theme);
    set({ theme });
  },

  initTheme: () => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as 'light' | 'dark' | 'system' | null;
    const theme = saved || 'light';
    applyTheme(theme);
    set({ theme });
  },

  addNotification: (notification) =>
    set((state) => ({
      notifications: [
        ...state.notifications,
        { ...notification, id: crypto.randomUUID() },
      ],
    })),

  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  clearNotifications: () => set({ notifications: [] }),
}));
