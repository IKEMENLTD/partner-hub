import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinTable,
  JoinColumn,
} from 'typeorm';
import { ProjectStatus, ProjectPriority } from '../enums/project-status.enum';
import { ProjectType } from '../enums/project-type.enum';
import { CompanyRole } from '../enums/company-role.enum';
import { UserProfile } from '../../auth/entities/user-profile.entity';
import { Partner } from '../../partner/entities/partner.entity';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ProjectStatus,
    default: ProjectStatus.DRAFT,
  })
  status: ProjectStatus;

  @Column({
    type: 'enum',
    enum: ProjectPriority,
    default: ProjectPriority.MEDIUM,
  })
  priority: ProjectPriority;

  @Column({
    name: 'project_type',
    type: 'enum',
    enum: ProjectType,
    nullable: true,
    default: ProjectType.OTHER,
  })
  projectType: ProjectType;

  @Column({
    name: 'company_role',
    type: 'enum',
    enum: CompanyRole,
    nullable: true,
  })
  companyRole: CompanyRole;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate: Date;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: Date;

  @Column({ name: 'actual_end_date', type: 'date', nullable: true })
  actualEndDate: Date;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  budget: number;

  @Column({ name: 'actual_cost', type: 'decimal', precision: 15, scale: 2, default: 0 })
  actualCost: number;

  @Column({ type: 'int', default: 0 })
  progress: number;

  @Column({ name: 'health_score', type: 'int', default: 100 })
  healthScore: number;

  @Column({ name: 'owner_id' })
  ownerId: string;

  @ManyToOne(() => UserProfile, { nullable: false })
  @JoinColumn({ name: 'owner_id' })
  owner: UserProfile;

  @Column({ name: 'manager_id', nullable: true })
  managerId: string;

  @ManyToOne(() => UserProfile)
  @JoinColumn({ name: 'manager_id' })
  manager: UserProfile;

  @ManyToMany(() => Partner)
  @JoinTable({
    name: 'project_partners',
    joinColumn: { name: 'project_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'partner_id', referencedColumnName: 'id' },
  })
  partners: Partner[];

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

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
