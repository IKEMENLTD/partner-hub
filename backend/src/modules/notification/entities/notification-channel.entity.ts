import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { NotificationChannelType } from '../enums/notification-channel-type.enum';
import { UserProfile } from '../../auth/entities/user-profile.entity';
import { Project } from '../../project/entities/project.entity';

@Entity('notification_channels')
export class NotificationChannel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: NotificationChannelType,
    default: NotificationChannelType.IN_APP,
  })
  type: NotificationChannelType;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'channel_id', nullable: true })
  channelId: string; // Slack channel ID, email address, webhook URL, etc.

  @Column({ name: 'project_id', nullable: true })
  projectId: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ name: 'user_id', nullable: true })
  userId: string;

  @ManyToOne(() => UserProfile)
  @JoinColumn({ name: 'user_id' })
  user: UserProfile;

  @Column({ type: 'jsonb', nullable: true })
  config: Record<string, any>; // Additional configuration (e.g., Slack workspace info)

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
