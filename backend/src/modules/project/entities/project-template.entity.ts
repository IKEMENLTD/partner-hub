import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('project_templates')
export class ProjectTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'project_type', nullable: true })
  projectType: string;

  @Column({ type: 'jsonb', default: '[]' })
  phases: Array<{
    name: string;
    order: number;
    estimatedDays: number;
    tasks: Array<{
      name: string;
      description: string;
      estimatedDays: number;
      order: number;
    }>;
  }>;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
