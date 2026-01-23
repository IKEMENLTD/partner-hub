import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { UserProfile } from '../../auth/entities/user-profile.entity';

export enum DigestTime {
  ZERO = '00:00',
  ONE = '01:00',
  TWO = '02:00',
  THREE = '03:00',
  FOUR = '04:00',
  FIVE = '05:00',
  SIX = '06:00',
  SEVEN = '07:00',
  EIGHT = '08:00',
  NINE = '09:00',
  TEN = '10:00',
  ELEVEN = '11:00',
  TWELVE = '12:00',
  THIRTEEN = '13:00',
  FOURTEEN = '14:00',
  FIFTEEN = '15:00',
  SIXTEEN = '16:00',
  SEVENTEEN = '17:00',
  EIGHTEEN = '18:00',
  NINETEEN = '19:00',
  TWENTY = '20:00',
  TWENTYONE = '21:00',
  TWENTYTWO = '22:00',
  TWENTYTHREE = '23:00',
}

@Entity('notification_settings')
export class NotificationSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', unique: true })
  userId: string;

  @OneToOne(() => UserProfile)
  @JoinColumn({ name: 'user_id' })
  user: UserProfile;

  // ダイジェスト配信設定
  @Column({ name: 'digest_enabled', default: true })
  digestEnabled: boolean;

  @Column({
    name: 'digest_time',
    type: 'varchar',
    length: 5,
    default: DigestTime.SEVEN,
  })
  digestTime: DigestTime;

  // 通知種別ごとの設定
  @Column({ name: 'deadline_notification', default: true })
  deadlineNotification: boolean;

  @Column({ name: 'assignee_change_notification', default: true })
  assigneeChangeNotification: boolean;

  @Column({ name: 'mention_notification', default: true })
  mentionNotification: boolean;

  @Column({ name: 'status_change_notification', default: true })
  statusChangeNotification: boolean;

  // リマインド上限設定 (1-10)
  @Column({ name: 'reminder_max_count', type: 'int', default: 3 })
  reminderMaxCount: number;

  // 基本通知設定
  @Column({ name: 'email_notification', default: true })
  emailNotification: boolean;

  @Column({ name: 'push_notification', default: true })
  pushNotification: boolean;

  @Column({ name: 'in_app_notification', default: true })
  inAppNotification: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
