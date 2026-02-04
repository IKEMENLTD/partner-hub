import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ProjectFile } from './entities/project-file.entity';
import { FileCategory } from './enums/file-category.enum';
import { SupabaseService } from '../supabase/supabase.service';
import { ResourceNotFoundException } from '../../common/exceptions/resource-not-found.exception';
import { BusinessException } from '../../common/exceptions/business.exception';

const BUCKET_NAME = 'project-files';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg', 'gif'];

const DOCUMENT_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx'];
const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif'];

@Injectable()
export class FileStorageService {
  private readonly logger = new Logger(FileStorageService.name);

  constructor(
    @InjectRepository(ProjectFile)
    private readonly projectFileRepository: Repository<ProjectFile>,
    private readonly supabaseService: SupabaseService,
  ) {}

  /**
   * Upload a file to Supabase Storage
   */
  async uploadFile(
    file: Express.Multer.File,
    projectId: string,
    uploaderId: string,
    taskId?: string,
    category?: FileCategory,
  ): Promise<ProjectFile> {
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new BusinessException('FILE_003', {
        message: 'File size exceeds limit',
        userMessage: 'ファイルサイズが上限（10MB）を超えています',
        details: { maxSize: MAX_FILE_SIZE, actualSize: file.size },
      });
    }

    // Validate file extension
    const extension = this.getFileExtension(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      throw new BusinessException('FILE_004', {
        message: 'File type not allowed',
        userMessage: `許可されていないファイル形式です。許可される形式: ${ALLOWED_EXTENSIONS.join(', ')}`,
        details: { allowedExtensions: ALLOWED_EXTENSIONS, actualExtension: extension },
      });
    }

    // Determine category if not provided
    const fileCategory = category || this.determineCategory(extension);

    // Generate unique file name
    const uniqueFileName = `${uuidv4()}.${extension}`;
    const storagePath = `${projectId}/${uniqueFileName}`;

    // Upload to Supabase Storage
    const supabaseAdmin = this.supabaseService.admin;
    if (!supabaseAdmin) {
      throw new BusinessException('SYSTEM_001', {
        message: 'Supabase Storage is not configured',
        userMessage: 'ストレージサービスが利用できません',
      });
    }

    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      this.logger.error(`Failed to upload file to Supabase: ${error.message}`);
      throw new BusinessException('FILE_002', {
        message: `Failed to upload file: ${error.message}`,
        userMessage: 'ファイルのアップロードに失敗しました',
      });
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(storagePath);

    // Save file metadata to database
    const projectFile = new ProjectFile();
    projectFile.projectId = projectId;
    projectFile.taskId = taskId || null;
    projectFile.uploaderId = uploaderId;
    projectFile.fileName = uniqueFileName;
    projectFile.originalName = file.originalname;
    projectFile.mimeType = file.mimetype;
    projectFile.fileSize = file.size;
    projectFile.storagePath = storagePath;
    projectFile.publicUrl = urlData?.publicUrl || null;
    projectFile.category = fileCategory;

    const savedFile = await this.projectFileRepository.save(projectFile);

    this.logger.log(`File uploaded successfully: ${savedFile.id} (${file.originalname})`);

    return savedFile;
  }

  /**
   * Get all files for a project
   */
  async getFilesByProject(projectId: string): Promise<ProjectFile[]> {
    return this.projectFileRepository.find({
      where: { projectId },
      relations: ['uploader'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get all files for a task
   */
  async getFilesByTask(taskId: string): Promise<ProjectFile[]> {
    return this.projectFileRepository.find({
      where: { taskId },
      relations: ['uploader'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get a file by ID
   */
  async getFileById(fileId: string): Promise<ProjectFile> {
    const file = await this.projectFileRepository.findOne({
      where: { id: fileId },
      relations: ['uploader'],
    });

    if (!file) {
      throw ResourceNotFoundException.forFile(fileId);
    }

    return file;
  }

  /**
   * Delete a file from storage and database
   */
  async deleteFile(fileId: string): Promise<void> {
    const file = await this.getFileById(fileId);

    // Delete from Supabase Storage
    const supabaseAdmin = this.supabaseService.admin;
    if (supabaseAdmin) {
      const { error } = await supabaseAdmin.storage.from(BUCKET_NAME).remove([file.storagePath]);

      if (error) {
        this.logger.warn(`Failed to delete file from Supabase Storage: ${error.message}`);
      }
    }

    // Delete from database
    await this.projectFileRepository.delete(fileId);

    this.logger.log(`File deleted successfully: ${fileId}`);
  }

  /**
   * Generate a signed URL for file download
   */
  async generateSignedUrl(
    fileId: string,
    expiresIn: number = 3600,
  ): Promise<{ signedUrl: string; expiresIn: number }> {
    const file = await this.getFileById(fileId);

    const supabaseAdmin = this.supabaseService.admin;
    if (!supabaseAdmin) {
      throw new BusinessException('SYSTEM_001', {
        message: 'Supabase Storage is not configured',
        userMessage: 'ストレージサービスが利用できません',
      });
    }

    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .createSignedUrl(file.storagePath, expiresIn);

    if (error) {
      this.logger.error(`Failed to generate signed URL: ${error.message}`);
      throw new BusinessException('FILE_002', {
        message: `Failed to generate signed URL: ${error.message}`,
        userMessage: '署名付きURLの生成に失敗しました',
      });
    }

    return {
      signedUrl: data.signedUrl,
      expiresIn,
    };
  }

  /**
   * Get file extension from filename
   */
  private getFileExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1] : '';
  }

  /**
   * Determine file category based on extension
   */
  private determineCategory(extension: string): FileCategory {
    const ext = extension.toLowerCase();
    if (DOCUMENT_EXTENSIONS.includes(ext)) {
      return FileCategory.DOCUMENT;
    }
    if (IMAGE_EXTENSIONS.includes(ext)) {
      return FileCategory.IMAGE;
    }
    return FileCategory.OTHER;
  }
}
