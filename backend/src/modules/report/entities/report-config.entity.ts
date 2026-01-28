import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserProfile } from '../../auth/entities/user-profile.entity';

export enum ReportPeriod {
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

export enum ReportStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  DELETED = 'deleted',
}

@Entity('report_configs')
export class ReportConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ReportPeriod,
    default: ReportPeriod.WEEKLY,
  })
  period: ReportPeriod;

  @Column({
    type: 'enum',
    enum: ReportStatus,
    default: ReportStatus.ACTIVE,
  })
  status: ReportStatus;

  // Cron expression for scheduling (e.g., "0 9 * * 1" for every Monday at 9 AM)
  @Column({ name: 'schedule_cron', nullable: true })
  scheduleCron: string;

  // Day of week for weekly reports (0=Sunday, 1=Monday, etc.)
  @Column({ name: 'day_of_week', type: 'int', default: 1 })
  dayOfWeek: number;

  // Day of month for monthly reports (1-28)
  @Column({ name: 'day_of_month', type: 'int', default: 1 })
  dayOfMonth: number;

  // Time of day to send (HH:mm format)
  @Column({ name: 'send_time', default: '09:00' })
  sendTime: string;

  // Recipients (array of email addresses)
  @Column({ type: 'text', array: true, default: '{}' })
  recipients: string[];

  // Include specific sections in the report
  @Column({ name: 'include_project_summary', default: true })
  includeProjectSummary: boolean;

  @Column({ name: 'include_task_summary', default: true })
  includeTaskSummary: boolean;

  @Column({ name: 'include_partner_performance', default: true })
  includePartnerPerformance: boolean;

  @Column({ name: 'include_highlights', default: true })
  includeHighlights: boolean;

  // Filter settings
  @Column({ name: 'project_ids', type: 'text', array: true, nullable: true })
  projectIds: string[];

  @Column({ name: 'partner_ids', type: 'text', array: true, nullable: true })
  partnerIds: string[];

  // Last time the report was generated
  @Column({ name: 'last_generated_at', type: 'timestamp', nullable: true })
  lastGeneratedAt: Date;

  // Next scheduled run time
  @Column({ name: 'next_run_at', type: 'timestamp', nullable: true })
  nextRunAt: Date;

  @Column({ name: 'created_by', nullable: true })
  createdById: string;

  @ManyToOne(() => UserProfile)
  @JoinColumn({ name: 'created_by' })
  createdBy: UserProfile;

  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt?: Date;
}
