import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { UserProfile } from '../../auth/entities/user-profile.entity';

export enum InAppNotificationType {
  DEADLINE = 'deadline',
  MENTION = 'mention',
  ASSIGNED = 'assigned',
  SYSTEM = 'system',
}

@Entity('in_app_notifications')
@Index(['userId', 'isRead'])
@Index(['userId', 'createdAt'])
export class InAppNotification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => UserProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserProfile;

  @Column({
    type: 'enum',
    enum: InAppNotificationType,
    default: InAppNotificationType.SYSTEM,
  })
  type: InAppNotificationType;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  message: string;

  @Column({ name: 'is_read', default: false })
  isRead: boolean;

  @Column({ name: 'link_url', nullable: true })
  linkUrl: string;

  @Column({ name: 'task_id', nullable: true })
  taskId: string;

  @Column({ name: 'project_id', nullable: true })
  projectId: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
