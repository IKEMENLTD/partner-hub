import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import {
  EscalationAction,
  EscalationTriggerType,
  EscalationRuleStatus,
} from '../enums/escalation.enum';
import { Project } from '../../project/entities/project.entity';
import { UserProfile } from '../../auth/entities/user-profile.entity';

@Entity('escalation_rules')
export class EscalationRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'project_id', nullable: true })
  projectId: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({
    name: 'trigger_type',
    type: 'enum',
    enum: EscalationTriggerType,
    default: EscalationTriggerType.DAYS_AFTER_DUE,
  })
  triggerType: EscalationTriggerType;

  @Column({ name: 'trigger_value', type: 'int', default: 1 })
  triggerValue: number;

  @Column({
    type: 'enum',
    enum: EscalationAction,
    default: EscalationAction.NOTIFY_OWNER,
  })
  action: EscalationAction;

  @Column({
    type: 'enum',
    enum: EscalationRuleStatus,
    default: EscalationRuleStatus.ACTIVE,
  })
  status: EscalationRuleStatus;

  @Column({ type: 'int', default: 1 })
  priority: number;

  @Column({ name: 'notify_emails', type: 'simple-array', nullable: true })
  notifyEmails: string[];

  @Column({ name: 'escalate_to_user_id', nullable: true })
  escalateToUserId: string;

  @ManyToOne(() => UserProfile)
  @JoinColumn({ name: 'escalate_to_user_id' })
  escalateToUser: UserProfile;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ name: 'created_by', nullable: true })
  createdById: string;

  @ManyToOne(() => UserProfile)
  @JoinColumn({ name: 'created_by' })
  createdBy: UserProfile;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
