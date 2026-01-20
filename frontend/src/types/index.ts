// ユーザー関連の型定義
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  avatarUrl?: string;
  departmentId?: string;
  createdAt: string;
  updatedAt: string;
}

// ユーザー名表示用ユーティリティ関数
export function getUserDisplayName(user: User | null | undefined): string {
  if (!user) return '';
  return `${user.lastName} ${user.firstName}`.trim();
}

export type UserRole = 'admin' | 'manager' | 'member' | 'partner';

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

// パートナー関連の型定義
export type PartnerType = 'individual' | 'company';

export interface Partner {
  id: string;
  name: string;
  email: string;
  phone?: string;
  companyName?: string;
  type: PartnerType;
  status: PartnerStatus;
  description?: string;
  skills?: string[];
  rating: number;
  totalProjects: number;
  completedProjects: number;
  address?: string;
  country?: string;
  timezone?: string;
  metadata?: Record<string, unknown>;
  userId?: string;
  createdById?: string;
  createdAt: string;
  updatedAt: string;
}

// パートナー表示名取得用ユーティリティ関数
export function getPartnerDisplayName(partner: Partner | null | undefined): string {
  if (!partner) return '';
  return partner.companyName || partner.name;
}

export type PartnerStatus = 'active' | 'inactive' | 'pending' | 'suspended';

// 案件関連の型定義
export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  priority: Priority;
  projectType?: ProjectType;
  companyRole?: CompanyRole;
  startDate: string;
  endDate?: string;
  actualEndDate?: string;
  budget?: number;
  actualCost?: number;
  progress?: number;
  healthScore?: number;
  ownerId?: string;
  owner?: User;
  managerId?: string;
  manager?: User;
  partners?: Partner[];
  tags?: string[];
  metadata?: Record<string, unknown>;
  createdById?: string;
  createdBy?: User;
  createdAt: string;
  updatedAt: string;
}

export type ProjectStatus =
  | 'draft'
  | 'planning'
  | 'in_progress'
  | 'review'
  | 'completed'
  | 'on_hold'
  | 'cancelled';

export type ProjectType = 'subsidy' | 'asp' | 'development' | 'service' | 'other';

export type CompanyRole = 'orderer' | 'prime_contractor' | 'sales_lead' | 'service_provider';

export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export interface ProjectMember {
  id: string;
  userId: string;
  user: User;
  projectId: string;
  role: ProjectMemberRole;
  joinedAt: string;
}

export type ProjectMemberRole = 'owner' | 'manager' | 'member' | 'viewer';

// 案件関係者の型定義
export interface ProjectStakeholder {
  id: string;
  projectId: string;
  partnerId?: string;
  partner?: Partner;
  tier: number;
  parentStakeholderId?: string;
  roleDescription?: string;
  contractAmount?: number;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

// リマインド設定の型定義
export interface ReminderConfig {
  advanceReminderDays?: number;
  dueDayReminder?: boolean;
  escalation?: {
    enabled: boolean;
    daysAfterDue: number;
    escalateTo?: string[];
  };
}

// タスク関連の型定義
export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  projectId: string;
  assigneeId?: string;
  assignee?: User;
  dueDate?: string;
  estimatedHours?: number;
  actualHours?: number;
  tags: string[];
  subtasks: Subtask[];
  comments: Comment[];
  reminderConfig?: ReminderConfig;
  createdAt: string;
  updatedAt: string;
}

export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'completed' | 'blocked' | 'cancelled';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  taskId: string;
}

export interface Comment {
  id: string;
  content: string;
  authorId: string;
  author: User;
  taskId: string;
  createdAt: string;
  updatedAt: string;
}

// タイムライン関連の型定義
export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  title: string;
  description?: string;
  projectId: string;
  userId: string;
  user: User;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export type TimelineEventType =
  | 'project_created'
  | 'project_updated'
  | 'task_created'
  | 'task_completed'
  | 'member_added'
  | 'member_removed'
  | 'comment_added'
  | 'status_changed';

// アラート関連の型定義
export interface Alert {
  id: string;
  type: AlertType;
  title: string;
  message: string;
  severity: AlertSeverity;
  projectId?: string;
  taskId?: string;
  userId: string;
  isRead: boolean;
  createdAt: string;
}

export type AlertType =
  | 'deadline_approaching'
  | 'task_overdue'
  | 'mention'
  | 'assignment'
  | 'status_change'
  | 'comment';

export type AlertSeverity = 'info' | 'warning' | 'error' | 'success';

// ダッシュボード関連の型定義
export interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  totalPartners: number;
  activePartners: number;
}

export interface TodayStats {
  tasksForToday: Task[];
  upcomingDeadlines: Task[];
  recentAlerts: Alert[];
  recentActivity: TimelineEvent[];
  totalProjects: number;
  totalPartners: number;
}

// API レスポンス型
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// フィルター/ソート型
export interface ProjectFilter {
  status?: ProjectStatus[];
  priority?: Priority[];
  managerId?: string;
  partnerId?: string;
  startDateFrom?: string;
  startDateTo?: string;
  search?: string;
}

export interface TaskFilter {
  status?: TaskStatus[];
  priority?: Priority[];
  assigneeId?: string;
  projectId?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  search?: string;
}

export interface PartnerFilter {
  status?: PartnerStatus;
  type?: PartnerType;
  skills?: string[];
  country?: string;
  search?: string;
}

export type SortOrder = 'asc' | 'desc';

export interface SortConfig {
  field: string;
  order: SortOrder;
}

// フォーム入力型
export interface LoginInput {
  email: string;
  password: string;
}

export interface ProjectInput {
  name: string;
  description?: string;
  status?: ProjectStatus;
  priority?: Priority;
  projectType?: ProjectType;
  companyRole?: CompanyRole;
  startDate?: string;
  endDate?: string;
  budget?: number;
  ownerId?: string;
  managerId?: string;
  partnerIds?: string[];
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface TaskInput {
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  projectId: string;
  assigneeId?: string;
  dueDate?: string;
  estimatedHours?: number;
  tags: string[];
  reminderConfig?: ReminderConfig;
}

export interface PartnerInput {
  name: string;
  email: string;
  phone?: string;
  companyName?: string;
  type?: PartnerType;
  status?: PartnerStatus;
  description?: string;
  skills?: string[];
  address?: string;
  country?: string;
  timezone?: string;
  metadata?: Record<string, unknown>;
}

// ビュータイプ
export type ViewType = 'list' | 'kanban' | 'calendar';

// タブタイプ
export type ProjectDetailTab = 'overview' | 'members' | 'tasks' | 'timeline' | 'files';

// テンプレート関連の型定義
export interface TemplatePhase {
  name: string;
  order: number;
  tasks: TemplateTask[];
}

export interface TemplateTask {
  name: string;
  description?: string;
  estimatedDays?: number;
  order: number;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description?: string;
  projectType?: ProjectType;
  phases?: TemplatePhase[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
