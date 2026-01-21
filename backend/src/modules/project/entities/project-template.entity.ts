import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProjectType } from '../enums/project-type.enum';

@Entity('project_templates')
export class ProjectTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ProjectType,
    nullable: true,
  })
  projectType: ProjectType;

  @Column({ type: 'jsonb', nullable: true })
  phases: TemplatePhase[];

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

// JSON内で使用する型定義
export interface TemplatePhase {
  name: string;
  order: number;
  estimatedDays?: number;
  tasks: TemplateTask[];
}

export interface TemplateTask {
  name: string;
  description?: string;
  estimatedDays?: number;
  order: number;
}
