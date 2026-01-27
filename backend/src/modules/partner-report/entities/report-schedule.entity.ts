import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Partner } from '../../partner/entities/partner.entity';
import { Project } from '../../project/entities/project.entity';
import { UserProfile } from '../../auth/entities/user-profile.entity';
import { ReportRequest } from './report-request.entity';

export enum ScheduleFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  MONTHLY = 'monthly',
}

@Entity('report_schedules')
export class ReportSchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId: string | null;

  @Column({ name: 'partner_id', type: 'uuid', nullable: true })
  partnerId: string | null;

  @ManyToOne(() => Partner, { nullable: true })
  @JoinColumn({ name: 'partner_id' })
  partner: Partner;

  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  projectId: string | null;

  @ManyToOne(() => Project, { nullable: true })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({
    type: 'varchar',
    length: 20,
    enum: ScheduleFrequency,
  })
  frequency: ScheduleFrequency;

  @Column({ name: 'day_of_week', type: 'int', nullable: true })
  dayOfWeek: number | null; // 0=Sunday, 6=Saturday

  @Column({ name: 'day_of_month', type: 'int', nullable: true })
  dayOfMonth: number | null;

  @Column({ name: 'time_of_day', type: 'time', default: '09:00:00' })
  timeOfDay: string;

  @Column({ name: 'deadline_days', type: 'int', default: 3 })
  deadlineDays: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'last_sent_at', type: 'timestamptz', nullable: true })
  lastSentAt: Date | null;

  @Column({ name: 'next_send_at', type: 'timestamptz', nullable: true })
  nextSendAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @ManyToOne(() => UserProfile, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator: UserProfile;

  @OneToMany(() => ReportRequest, (request) => request.schedule)
  requests: ReportRequest[];
}
