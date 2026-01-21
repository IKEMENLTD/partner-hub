import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { FileCategory } from '../enums/file-category.enum';
import { UserProfile } from '../../auth/entities/user-profile.entity';
import { Project } from '../../project/entities/project.entity';
import { Task } from '../../task/entities/task.entity';

@Entity('project_files')
export class ProjectFile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id' })
  projectId: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ name: 'task_id', nullable: true })
  taskId: string | null;

  @ManyToOne(() => Task, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @Column({ name: 'uploader_id' })
  uploaderId: string;

  @ManyToOne(() => UserProfile)
  @JoinColumn({ name: 'uploader_id' })
  uploader: UserProfile;

  @Column({ name: 'file_name' })
  fileName: string;

  @Column({ name: 'original_name' })
  originalName: string;

  @Column({ name: 'mime_type' })
  mimeType: string;

  @Column({ name: 'file_size', type: 'bigint' })
  fileSize: number;

  @Column({ name: 'storage_path' })
  storagePath: string;

  @Column({ name: 'public_url', type: 'text', nullable: true })
  publicUrl: string | null;

  @Column({
    type: 'enum',
    enum: FileCategory,
    default: FileCategory.OTHER,
  })
  category: FileCategory;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
