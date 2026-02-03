import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PartnerStatus, PartnerType } from '../enums/partner-status.enum';
import { PreferredChannel } from '../enums/preferred-channel.enum';
import { UserProfile } from '../../auth/entities/user-profile.entity';

@Entity('partners')
export class Partner {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  // 連絡先設定（初回セットアップで設定）
  @Column({
    name: 'preferred_channel',
    type: 'enum',
    enum: PreferredChannel,
    default: PreferredChannel.EMAIL,
  })
  preferredChannel: PreferredChannel;

  @Column({ name: 'line_user_id', nullable: true })
  lineUserId: string;

  @Column({ name: 'sms_phone_number', nullable: true })
  smsPhoneNumber: string;

  @Column({ name: 'contact_setup_completed', default: false })
  contactSetupCompleted: boolean;

  @Column({ name: 'contact_setup_token', type: 'varchar', nullable: true })
  contactSetupToken: string | null;

  @Column({ name: 'contact_setup_token_expires_at', type: 'timestamptz', nullable: true })
  contactSetupTokenExpiresAt: Date | null;

  @Column({ name: 'company_name', nullable: true })
  companyName: string;

  @Column({
    type: 'enum',
    enum: PartnerType,
    default: PartnerType.INDIVIDUAL,
  })
  type: PartnerType;

  @Column({
    type: 'enum',
    enum: PartnerStatus,
    default: PartnerStatus.PENDING,
  })
  status: PartnerStatus;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', array: true, nullable: true, default: '{}' })
  skills: string[];

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating: number;

  @Column({ name: 'total_projects', default: 0 })
  totalProjects: number;

  @Column({ name: 'completed_projects', default: 0 })
  completedProjects: number;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true })
  timezone: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ name: 'user_id', nullable: true })
  userId: string;

  @ManyToOne(() => UserProfile, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: UserProfile;

  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId: string;

  @Column({ name: 'login_enabled', default: false })
  loginEnabled: boolean;

  @Column({ name: 'created_by', nullable: true })
  createdById: string;

  @ManyToOne(() => UserProfile)
  @JoinColumn({ name: 'created_by' })
  createdBy: UserProfile;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt?: Date;
}
