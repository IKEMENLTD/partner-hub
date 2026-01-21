import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Task } from '../../task/entities/task.entity';
import { UserProfile } from '../../auth/entities/user-profile.entity';
import { ProgressReportStatus } from '../enums/progress-report-status.enum';

@Entity('progress_reports')
export class ProgressReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'task_id' })
  taskId: string;

  @ManyToOne(() => Task, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @Column({ name: 'reporter_name' })
  reporterName: string;

  @Column({ name: 'reporter_email' })
  reporterEmail: string;

  @Column({ type: 'int', default: 0 })
  progress: number;

  @Column({
    type: 'enum',
    enum: ProgressReportStatus,
    default: ProgressReportStatus.PENDING,
  })
  status: ProgressReportStatus;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @Column({ name: 'attachment_urls', type: 'jsonb', nullable: true })
  attachmentUrls: string[] | null;

  @Column({ name: 'report_token', unique: true })
  reportToken: string;

  @Column({ name: 'token_expires_at', type: 'timestamp' })
  tokenExpiresAt: Date;

  @Column({ name: 'is_submitted', default: false })
  isSubmitted: boolean;

  @Column({ name: 'reviewer_id', nullable: true })
  reviewerId: string | null;

  @ManyToOne(() => UserProfile, { nullable: true })
  @JoinColumn({ name: 'reviewer_id' })
  reviewer: UserProfile | null;

  @Column({ name: 'reviewer_comment', type: 'text', nullable: true })
  reviewerComment: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
  reviewedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
