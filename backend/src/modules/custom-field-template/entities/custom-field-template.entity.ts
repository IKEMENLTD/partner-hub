import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserProfile } from '../../auth/entities/user-profile.entity';

export type CustomFieldType = 'text' | 'number' | 'date' | 'select';

export interface CustomFieldDefinition {
  id: string;
  name: string;
  type: CustomFieldType;
  required: boolean;
  order: number;
  options?: string[];
}

@Entity('custom_field_templates')
export class CustomFieldTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb', default: '[]' })
  fields: CustomFieldDefinition[];

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'usage_count', default: 0 })
  usageCount: number;

  @Column({ name: 'created_by', nullable: true })
  createdById: string;

  @ManyToOne(() => UserProfile, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: UserProfile;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
