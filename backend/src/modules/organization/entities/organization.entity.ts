import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 500 })
  name: string;

  @Column({ length: 100, unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'logo_url', nullable: true, length: 500 })
  logoUrl?: string;

  @Column({ type: 'jsonb', default: '{}' })
  settings: Record<string, any>;

  @Column({ length: 50, default: 'free' })
  plan: string;

  @Column({ name: 'max_members', default: 5 })
  maxMembers: number;

  @Column({ name: 'max_partners', default: 50 })
  maxPartners: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'owner_id', type: 'uuid', nullable: true })
  ownerId?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
