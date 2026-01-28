import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserProfile } from '../../auth/entities/user-profile.entity';
import { ReportConfig, ReportPeriod } from './report-config.entity';

export enum GeneratedReportStatus {
  PENDING = 'pending',
  GENERATED = 'generated',
  SENT = 'sent',
  FAILED = 'failed',
}

// Report data structure stored as JSON
export interface ReportData {
  period: ReportPeriod;
  dateRange: {
    start: string;
    end: string;
  };
  projectSummary: {
    total: number;
    active: number;
    completed: number;
    delayed: number;
    byStatus: Record<string, number>;
  };
  taskSummary: {
    total: number;
    completed: number;
    inProgress: number;
    overdue: number;
    completionRate: number;
    byPriority: Record<string, number>;
  };
  partnerPerformance: Array<{
    partnerId: string;
    partnerName: string;
    activeProjects: number;
    tasksCompleted: number;
    tasksTotal: number;
    onTimeDeliveryRate: number;
    rating: number;
  }>;
  highlights: {
    keyAchievements: string[];
    issues: string[];
    upcomingDeadlines: Array<{
      type: 'project' | 'task';
      id: string;
      name: string;
      dueDate: string;
      daysRemaining: number;
    }>;
  };
  healthScoreStats?: {
    averageScore: number;
    projectsAtRisk: number;
    totalProjects: number;
  };
}

@Entity('generated_reports')
export class GeneratedReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'report_config_id', nullable: true })
  reportConfigId: string;

  @ManyToOne(() => ReportConfig, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'report_config_id' })
  reportConfig: ReportConfig;

  @Column()
  title: string;

  @Column({
    type: 'enum',
    enum: ReportPeriod,
  })
  period: ReportPeriod;

  @Column({ name: 'date_range_start', type: 'date' })
  dateRangeStart: Date;

  @Column({ name: 'date_range_end', type: 'date' })
  dateRangeEnd: Date;

  @Column({
    type: 'enum',
    enum: GeneratedReportStatus,
    default: GeneratedReportStatus.PENDING,
  })
  status: GeneratedReportStatus;

  // JSON data containing all report information
  @Column({ name: 'report_data', type: 'jsonb' })
  reportData: ReportData;

  // Recipients this report was sent to
  @Column({ name: 'sent_to', type: 'text', array: true, default: '{}' })
  sentTo: string[];

  @Column({ name: 'sent_at', type: 'timestamp', nullable: true })
  sentAt: Date;

  // Error message if generation/sending failed
  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  // Whether this was manually triggered
  @Column({ name: 'is_manual', default: false })
  isManual: boolean;

  @Column({ name: 'generated_by', nullable: true })
  generatedById: string;

  @ManyToOne(() => UserProfile)
  @JoinColumn({ name: 'generated_by' })
  generatedBy: UserProfile;

  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
