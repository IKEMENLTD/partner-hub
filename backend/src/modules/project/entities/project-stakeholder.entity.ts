import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Project } from './project.entity';
import { Partner } from '../../partner/entities/partner.entity';

@Entity('project_stakeholders')
export class ProjectStakeholder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ name: 'project_id' })
  projectId: string;

  @ManyToOne(() => Partner, { nullable: true })
  @JoinColumn({ name: 'partner_id' })
  partner: Partner;

  @Column({ name: 'partner_id', nullable: true })
  partnerId: string;

  @Column({ type: 'int', default: 1 })
  tier: number;

  @ManyToOne(() => ProjectStakeholder, { nullable: true })
  @JoinColumn({ name: 'parent_stakeholder_id' })
  parentStakeholder: ProjectStakeholder;

  @Column({ name: 'parent_stakeholder_id', nullable: true })
  parentStakeholderId: string;

  @Column({ name: 'role_description', nullable: true })
  roleDescription: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  contractAmount: number;

  @Column({ name: 'is_primary', default: false })
  isPrimary: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
