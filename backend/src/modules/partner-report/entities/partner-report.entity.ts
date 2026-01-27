import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Partner } from '../../partner/entities/partner.entity';
import { Project } from '../../project/entities/project.entity';
import { Task } from '../../task/entities/task.entity';
import { UserProfile } from '../../auth/entities/user-profile.entity';

export enum ReportType {
  PROGRESS = 'progress',
  ISSUE = 'issue',
  COMPLETION = 'completion',
  GENERAL = 'general',
}

export enum ReportSource {
  WEB_FORM = 'web_form',
  EMAIL = 'email',
  LINE = 'line',
  TEAMS = 'teams',
  API = 'api',
}

@Entity('partner_reports')
export class PartnerReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'partner_id' })
  partnerId: string;

  @ManyToOne(() => Partner, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'partner_id' })
  partner: Partner;

  @Column({ name: 'project_id', nullable: true })
  projectId: string | null;

  @ManyToOne(() => Project, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'project_id' })
  project: Project | null;

  @Column({ name: 'task_id', nullable: true })
  taskId: string | null;

  @ManyToOne(() => Task, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'task_id' })
  task: Task | null;

  @Column({
    name: 'report_type',
    type: 'varchar',
    length: 50,
  })
  reportType: ReportType;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'jsonb', default: [] })
  attachments: string[];

  @Column({
    type: 'varchar',
    length: 50,
  })
  source: ReportSource;

  @Column({ name: 'source_reference', length: 255, nullable: true })
  sourceReference: string | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @Column({ name: 'is_read', default: false })
  isRead: boolean;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt: Date | null;

  @Column({ name: 'read_by', nullable: true })
  readById: string | null;

  @ManyToOne(() => UserProfile, { nullable: true })
  @JoinColumn({ name: 'read_by' })
  readBy: UserProfile | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId: string | null;
}
