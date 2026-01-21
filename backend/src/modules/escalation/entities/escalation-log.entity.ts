import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { EscalationAction, EscalationLogStatus } from '../enums/escalation.enum';
import { EscalationRule } from './escalation-rule.entity';
import { Task } from '../../task/entities/task.entity';
import { Project } from '../../project/entities/project.entity';
import { UserProfile } from '../../auth/entities/user-profile.entity';

@Entity('escalation_logs')
export class EscalationLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'rule_id', nullable: true })
  ruleId: string;

  @ManyToOne(() => EscalationRule, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'rule_id' })
  rule: EscalationRule;

  @Column({ name: 'task_id', nullable: true })
  taskId: string;

  @ManyToOne(() => Task, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @Column({ name: 'project_id', nullable: true })
  projectId: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({
    type: 'enum',
    enum: EscalationAction,
  })
  action: EscalationAction;

  @Column({
    type: 'enum',
    enum: EscalationLogStatus,
    default: EscalationLogStatus.PENDING,
  })
  status: EscalationLogStatus;

  @Column({ name: 'action_detail', type: 'text', nullable: true })
  actionDetail: string;

  @Column({ name: 'notified_users', type: 'simple-array', nullable: true })
  notifiedUsers: string[];

  @Column({ name: 'escalated_to_user_id', nullable: true })
  escalatedToUserId: string;

  @ManyToOne(() => UserProfile)
  @JoinColumn({ name: 'escalated_to_user_id' })
  escalatedToUser: UserProfile;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  @Column({ name: 'executed_at', type: 'timestamp', nullable: true })
  executedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
