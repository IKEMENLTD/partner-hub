import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Partner } from './partner.entity';
import { UserProfile } from '../../auth/entities/user-profile.entity';

@Entity('partner_invitations')
export class PartnerInvitation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'partner_id' })
  partnerId: string;

  @ManyToOne(() => Partner, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'partner_id' })
  partner: Partner;

  @Column({ unique: true })
  token: string;

  @Column()
  email: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'used_at', type: 'timestamptz', nullable: true })
  usedAt: Date | null;

  @Column({ name: 'created_by', nullable: true })
  createdById: string;

  @ManyToOne(() => UserProfile, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: UserProfile;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /**
   * Check if the invitation is still valid
   */
  isValid(): boolean {
    return !this.usedAt && new Date() < this.expiresAt;
  }
}
