// Shared types for Partner Portal
export type ProgressStatus = 'on_track' | 'slightly_delayed' | 'has_issues';
export type TabType = 'dashboard' | 'report';

export interface PartnerInfo {
  id: string;
  name: string;
  email: string;
  companyName?: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  status: string;
  description?: string;
  startDate?: string;
  endDate?: string;
}

export interface TaskSummary {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: string;
  projectName?: string;
}

export interface ReportSummary {
  id: string;
  reportType: string;
  progressStatus?: string;
  projectName?: string;
  createdAt: string;
  content?: string;
  weeklyAccomplishments?: string;
}

export interface DashboardData {
  partner: PartnerInfo;
  tokenInfo: {
    expiresAt: string;
    projectRestriction: boolean;
  };
  stats: {
    projects: number;
    tasks: {
      total: number;
      completed: number;
      inProgress: number;
      todo: number;
      overdue: number;
    };
    reportsThisMonth: number;
  };
  projects: ProjectSummary[];
  upcomingTasks: TaskSummary[];
  recentReports: ReportSummary[];
}

// Labels
export const statusLabels: Record<string, string> = {
  planning: '計画中',
  in_progress: '進行中',
  review: 'レビュー中',
  completed: '完了',
  on_hold: '保留',
};

export const taskStatusLabels: Record<string, string> = {
  todo: '未着手',
  in_progress: '進行中',
  review: 'レビュー中',
  done: '完了',
};

export const progressStatusLabels: Record<string, { label: string; color: string }> = {
  on_track: { label: '順調', color: 'green' },
  slightly_delayed: { label: 'やや遅れ', color: 'yellow' },
  has_issues: { label: '問題あり', color: 'red' },
};
