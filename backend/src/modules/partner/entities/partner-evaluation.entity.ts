import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Partner } from './partner.entity';
import { UserProfile } from '../../auth/entities/user-profile.entity';

@Entity('partner_evaluations')
export class PartnerEvaluation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'partner_id' })
  partnerId: string;

  @ManyToOne(() => Partner, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'partner_id' })
  partner: Partner;

  @Column({ name: 'evaluator_id' })
  evaluatorId: string;

  @ManyToOne(() => UserProfile)
  @JoinColumn({ name: 'evaluator_id' })
  evaluator: UserProfile;

  // Manual evaluation scores (1-5)
  @Column({ type: 'int', default: 0 })
  communication: number;

  @Column({ name: 'deliverable_quality', type: 'int', default: 0 })
  deliverableQuality: number;

  @Column({ name: 'response_speed', type: 'int', default: 0 })
  responseSpeed: number;

  @Column({ type: 'int', default: 0 })
  reliability: number;

  @Column({ type: 'text', nullable: true })
  comment: string;

  @Column({ name: 'evaluation_period_start', type: 'date', nullable: true })
  evaluationPeriodStart: Date;

  @Column({ name: 'evaluation_period_end', type: 'date', nullable: true })
  evaluationPeriodEnd: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
