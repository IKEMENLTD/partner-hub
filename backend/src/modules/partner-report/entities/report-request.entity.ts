import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Partner } from '../../partner/entities/partner.entity';
import { Project } from '../../project/entities/project.entity';
import { ReportSchedule } from './report-schedule.entity';
import { PartnerReport } from './partner-report.entity';

export enum RequestStatus {
  PENDING = 'pending',
  SUBMITTED = 'submitted',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}

@Entity('report_requests')
export class ReportRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId: string | null;

  @Column({ name: 'schedule_id', type: 'uuid', nullable: true })
  scheduleId: string | null;

  @ManyToOne(() => ReportSchedule, (schedule) => schedule.requests, { nullable: true })
  @JoinColumn({ name: 'schedule_id' })
  schedule: ReportSchedule;

  @Column({ name: 'partner_id', type: 'uuid' })
  partnerId: string;

  @ManyToOne(() => Partner)
  @JoinColumn({ name: 'partner_id' })
  partner: Partner;

  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  projectId: string | null;

  @ManyToOne(() => Project, { nullable: true })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ name: 'requested_at', type: 'timestamptz', default: () => 'now()' })
  requestedAt: Date;

  @Column({ name: 'deadline_at', type: 'timestamptz' })
  deadlineAt: Date;

  @Column({
    type: 'varchar',
    length: 20,
    enum: RequestStatus,
    default: RequestStatus.PENDING,
  })
  status: RequestStatus;

  @Column({ name: 'report_id', type: 'uuid', nullable: true })
  reportId: string | null;

  @ManyToOne(() => PartnerReport, { nullable: true })
  @JoinColumn({ name: 'report_id' })
  report: PartnerReport;

  @Column({ name: 'reminder_count', type: 'int', default: 0 })
  reminderCount: number;

  @Column({ name: 'last_reminder_at', type: 'timestamptz', nullable: true })
  lastReminderAt: Date | null;

  @Column({ name: 'escalation_level', type: 'int', default: 0 })
  escalationLevel: number; // 0=none, 1=1day, 2=3days, 3=7days, 4=14days

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
