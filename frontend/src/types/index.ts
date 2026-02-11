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
  preferredChannel?: 'email';
  smsPhoneNumber?: string;
  contactSetupCompleted?: boolean;
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
  | 'completed'
  | 'on_hold'
  | 'cancelled';

export type ProjectType = 'subsidy' | 'asp' | 'development' | 'service' | 'maintenance' | 'support' | 'other' | 'joint_development' | 'sales_partnership' | 'technology_license' | 'reseller_agreement' | 'consulting';

export type CompanyRole = 'orderer' | 'prime_contractor' | 'sales_lead' | 'service_provider' | 'prime' | 'subcontractor' | 'partner' | 'client';

export type Priority = 'low' | 'medium' | 'high' | 'urgent' | 'critical';

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
  progress?: number;
  tags: string[];
  subtasks: Subtask[];
  comments: Comment[];
  reminderConfig?: ReminderConfig;
  createdAt: string;
  updatedAt: string;
}

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'waiting' | 'completed' | 'cancelled';

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

export interface ProjectStakeholderInput {
  partnerId: string;
  tier: StakeholderTier;
  roleDescription?: string;
  isPrimary?: boolean;
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
  stakeholders?: ProjectStakeholderInput[];
  tags?: string[];
  metadata?: Record<string, unknown>;
  templateId?: string;
}

// プロジェクトテンプレート関連の型定義
export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  projectType: string;
  phases: TemplatePhase[];
  isActive: boolean;
}

export interface TemplatePhase {
  name: string;
  order: number;
  estimatedDays: number;
  tasks: TemplateTask[];
}

export interface TemplateTask {
  name: string;
  description: string;
  estimatedDays: number;
  order: number;
}

export interface TaskInput {
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  projectId: string;
  assigneeId?: string;
  partnerId?: string;
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
export type FileCategory = 'document' | 'image' | 'spreadsheet' | 'presentation' | 'archive' | 'other';

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
  | 'reminder'        // リマインダー通知
  | 'escalation'      // エスカレーション通知
  | 'task_update'     // タスク更新通知
  | 'project_update'  // プロジェクト更新通知
  | 'system';         // システム通知

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
  inAppNotification: boolean;
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
  inAppNotification?: boolean;
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

// カスタムフィールド関連の型定義

export type CustomFieldType = 'text' | 'number' | 'date' | 'select';

// カスタムフィールド定義（テンプレート用）
export interface CustomFieldDefinition {
  id: string;
  name: string;
  type: CustomFieldType;
  required: boolean;
  order: number;
  options?: string[];
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
}

// カスタムフィールド値（案件保存用）
export interface CustomFieldValue {
  fieldId: string;
  name: string;
  type: CustomFieldType;
  value: string | number | null;
}

// カスタムフィールドテンプレート
export interface CustomFieldTemplate {
  id: string;
  name: string;
  description?: string;
  fields: CustomFieldDefinition[];
  isActive: boolean;
  usageCount: number;
  createdById?: string;
  createdBy?: User;
  createdAt: string;
  updatedAt: string;
}

// テンプレート作成入力
export interface CustomFieldTemplateInput {
  name: string;
  description?: string;
  fields: Omit<CustomFieldDefinition, 'id'>[];
}

// テンプレートクエリパラメータ
export interface CustomFieldTemplateFilter {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  sortBy?: 'name' | 'usageCount' | 'createdAt';
  sortOrder?: 'ASC' | 'DESC';
}

// パートナー報告関連の型定義

export type ReportType = 'progress' | 'issue' | 'completion' | 'general';

export type ReportSource = 'web_form' | 'email' | 'teams' | 'api';

// パートナー報告
export interface PartnerReport {
  id: string;
  partnerId: string;
  partner?: Partner;
  projectId?: string;
  project?: Project;
  taskId?: string;
  task?: Task;
  reportType: ReportType;
  content: string;
  attachments: string[];
  source: ReportSource;
  sourceReference?: string;
  metadata?: Record<string, unknown>;
  isRead: boolean;
  readAt?: string;
  readById?: string;
  readBy?: User;
  createdAt: string;
  organizationId?: string;
}

// 報告用トークン
export interface PartnerReportToken {
  id: string;
  partnerId: string;
  projectId?: string;
  token: string;
  expiresAt?: string;
  isActive: boolean;
  lastUsedAt?: string;
  createdAt: string;
}

// 報告フォーム情報（公開API用）
export interface ReportFormInfo {
  partner: {
    id: string;
    name: string;
    email: string;
    companyName?: string;
  };
  projects: Array<{
    id: string;
    name: string;
    status: ProjectStatus;
  }>;
  reportTypes: Array<{
    value: ReportType;
    label: string;
  }>;
  tokenInfo: {
    expiresAt?: string;
    projectRestriction: boolean;
  };
}

// 報告入力
export interface ReportInput {
  projectId?: string;
  taskId?: string;
  reportType: ReportType;
  content: string;
  attachments?: string[];
  metadata?: Record<string, unknown>;
}

// 報告クエリパラメータ
export interface PartnerReportFilter {
  page?: number;
  limit?: number;
  partnerId?: string;
  projectId?: string;
  reportType?: ReportType;
  source?: ReportSource;
  unreadOnly?: boolean;
}
