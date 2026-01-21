import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import {
  NotificationChannelType,
  NotificationStatus,
  NotificationType,
} from '../enums/notification-channel-type.enum';
import { UserProfile } from '../../auth/entities/user-profile.entity';
import { NotificationChannel } from './notification-channel.entity';

@Entity('notification_logs')
export class NotificationLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
    default: NotificationType.SYSTEM,
  })
  type: NotificationType;

  @Column({
    type: 'enum',
    enum: NotificationChannelType,
  })
  channelType: NotificationChannelType;

  @Column({
    type: 'enum',
    enum: NotificationStatus,
    default: NotificationStatus.PENDING,
  })
  status: NotificationStatus;

  @Column({ name: 'recipient_id', nullable: true })
  recipientId: string;

  @ManyToOne(() => UserProfile)
  @JoinColumn({ name: 'recipient_id' })
  recipient: UserProfile;

  @Column({ name: 'channel_id', nullable: true })
  channelId: string;

  @ManyToOne(() => NotificationChannel)
  @JoinColumn({ name: 'channel_id' })
  channel: NotificationChannel;

  @Column()
  subject: string;

  @Column({ type: 'text', nullable: true })
  message: string;

  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, any>; // Full message payload (Slack blocks, email HTML, etc.)

  @Column({ name: 'external_id', nullable: true })
  externalId: string; // Slack message ts, email message ID, etc.

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  @Column({ name: 'retry_count', type: 'int', default: 0 })
  retryCount: number;

  @Column({ name: 'sent_at', type: 'timestamp', nullable: true })
  sentAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
