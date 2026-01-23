// ユーザー関連の型定義
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  avatarUrl?: string;
  departmentId?: string;
  createdAt: string;
  updatedAt?: string;
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
  onTimeRate?: number;
  completionRate?: number;
  budgetHealth?: number;
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
  userId?: string;
  user?: User;
  tier: StakeholderTier;
  parentStakeholderId?: string;
  parentStakeholder?: ProjectStakeholder;
  children?: ProjectStakeholder[];
  roleDescription?: string;
  responsibilities?: string;
  contractAmount?: number;
  isPrimary: boolean;
  isKeyPerson?: boolean;
  contactInfo?: {
    email?: string;
    phone?: string;
  };
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ステークホルダーのティア
export type StakeholderTier = 1 | 2 | 3;

// ステークホルダーツリーノード
export interface StakeholderTreeNode extends ProjectStakeholder {
  children: StakeholderTreeNode[];
}

// ステークホルダー入力型
export interface StakeholderInput {
  projectId: string;
  partnerId?: string;
  userId?: string;
  tier: StakeholderTier;
  parentStakeholderId?: string;
  roleDescription?: string;
  responsibilities?: string;
  contractAmount?: number;
  isPrimary?: boolean;
  isKeyPerson?: boolean;
  contactInfo?: {
    email?: string;
    phone?: string;
  };
  notes?: string;
}

// ステークホルダーフィルター
export interface StakeholderFilter {
  tier?: StakeholderTier;
  isPrimary?: boolean;
  isKeyPerson?: boolean;
  search?: string;
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
  | 'task_due'
  | 'task_overdue'
  | 'project_deadline'
  | 'project_overdue'
  | 'project_stagnant'
  | 'status_update_request'
  | 'partner_activity'
  | 'custom'
  // Legacy types for backward compatibility
  | 'deadline_approaching'
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
  upcomingProjectDeadlines: Project[];
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

// パートナー評価関連の型定義

// 自動計算指標
export interface PartnerAutoMetrics {
  deadlineComplianceRate: number;
  reportSubmissionRate: number;
  averageResponseTime: number;
  totalTasks: number;
  completedOnTime: number;
  totalReportsRequested: number;
  totalReportsSubmitted: number;
}

// 手動評価
export interface PartnerEvaluation {
  id: string;
  partnerId: string;
  evaluatorId: string;
  evaluator?: User;
  communication: number;
  deliverableQuality: number;
  responseSpeed: number;
  reliability: number;
  comment?: string;
  evaluationPeriodStart?: string;
  evaluationPeriodEnd?: string;
  createdAt: string;
}

// 手動評価の平均値
export interface ManualEvaluationSummary {
  communication: number;
  deliverableQuality: number;
  responseSpeed: number;
  reliability: number;
  averageManualScore: number;
}

// 評価サマリー
export interface PartnerEvaluationSummary {
  partnerId: string;
  partnerName: string;
  autoMetrics: PartnerAutoMetrics;
  manualEvaluation: ManualEvaluationSummary;
  overallScore: number;
  evaluationCount: number;
  lastEvaluationDate: string | null;
}

// 評価入力
export interface PartnerEvaluationInput {
  communication: number;
  deliverableQuality: number;
  responseSpeed: number;
  reliability: number;
  comment?: string;
  evaluationPeriodStart?: string;
  evaluationPeriodEnd?: string;
}

// 評価履歴クエリパラメータ
export interface PartnerEvaluationFilter {
  page?: number;
  pageSize?: number;
  fromDate?: string;
  toDate?: string;
}

// ファイル関連の型定義
export type FileCategory = 'document' | 'image' | 'other';

export interface ProjectFile {
  id: string;
  projectId: string;
  taskId?: string;
  uploaderId: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  storagePath: string;
  publicUrl?: string;
  category: FileCategory;
  createdAt: string;
  uploader?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface FileUploadInput {
  projectId: string;
  taskId?: string;
  category?: FileCategory;
}

export interface SignedUrlResponse {
  signedUrl: string;
  expiresIn: number;
}

// 通知設定関連の型定義

// 通知の種別
export type NotificationType =
  | 'deadline'        // 期限通知
  | 'assignee_change' // 担当者変更通知
  | 'mention'         // メンション通知
  | 'status_change';  // ステータス変更通知

// ダイジェスト配信時間の選択肢（24時間対応）
export type DigestTime =
  | '00:00'
  | '01:00'
  | '02:00'
  | '03:00'
  | '04:00'
  | '05:00'
  | '06:00'
  | '07:00'
  | '08:00'
  | '09:00'
  | '10:00'
  | '11:00'
  | '12:00'
  | '13:00'
  | '14:00'
  | '15:00'
  | '16:00'
  | '17:00'
  | '18:00'
  | '19:00'
  | '20:00'
  | '21:00'
  | '22:00'
  | '23:00';

// 通知設定
export interface NotificationSettings {
  id: string;
  userId: string;
  // ダイジェスト配信設定
  digestEnabled: boolean;
  digestTime: DigestTime;
  // 通知種別ごとの設定
  deadlineNotification: boolean;
  assigneeChangeNotification: boolean;
  mentionNotification: boolean;
  statusChangeNotification: boolean;
  // リマインド上限設定
  reminderMaxCount: number; // 1-10
  // 基本通知設定
  emailNotification: boolean;
  pushNotification: boolean;
  createdAt: string;
  updatedAt: string;
}

// 通知設定の更新入力
export interface NotificationSettingsInput {
  digestEnabled?: boolean;
  digestTime?: DigestTime;
  deadlineNotification?: boolean;
  assigneeChangeNotification?: boolean;
  mentionNotification?: boolean;
  statusChangeNotification?: boolean;
  reminderMaxCount?: number;
  emailNotification?: boolean;
  pushNotification?: boolean;
}

// アプリ内通知の型定義
export type InAppNotificationType = 'deadline' | 'mention' | 'assigned' | 'system';

export interface InAppNotification {
  id: string;
  userId: string;
  type: InAppNotificationType;
  title: string;
  message?: string;
  isRead: boolean;
  linkUrl?: string;
  taskId?: string;
  projectId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface InAppNotificationResponse {
  notifications: InAppNotification[];
  total: number;
  unreadCount: number;
}
