import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ProjectFile } from './entities/project-file.entity';
import { Project } from '../project/entities/project.entity';
import { FileCategory } from './enums/file-category.enum';
import { SupabaseService } from '../supabase/supabase.service';
import { ResourceNotFoundException } from '../../common/exceptions/resource-not-found.exception';
import { BusinessException } from '../../common/exceptions/business.exception';

const BUCKET_NAME = 'project-files';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg', 'gif'];

const DOCUMENT_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx'];
const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif'];

/**
 * Extension to allowed MIME types mapping
 * Used to verify that the file content matches the declared extension
 */
const EXTENSION_MIME_MAP: Record<string, string[]> = {
  pdf: ['application/pdf'],
  doc: ['application/msword'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  xls: ['application/vnd.ms-excel'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  png: ['image/png'],
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  gif: ['image/gif'],
};

/**
 * Magic bytes signatures for file type verification
 * Checks the actual file content to prevent extension spoofing
 */
const MAGIC_BYTES: Array<{ extensions: string[]; bytes: number[]; offset?: number }> = [
  { extensions: ['pdf'], bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  { extensions: ['png'], bytes: [0x89, 0x50, 0x4e, 0x47] }, // .PNG
  { extensions: ['jpg', 'jpeg'], bytes: [0xff, 0xd8, 0xff] }, // JPEG SOI
  { extensions: ['gif'], bytes: [0x47, 0x49, 0x46, 0x38] }, // GIF8
  { extensions: ['docx', 'xlsx'], bytes: [0x50, 0x4b, 0x03, 0x04] }, // PK (ZIP)
  { extensions: ['doc', 'xls'], bytes: [0xd0, 0xcf, 0x11, 0xe0] }, // OLE2 compound
];

@Injectable()
export class FileStorageService {
  private readonly logger = new Logger(FileStorageService.name);

  constructor(
    @InjectRepository(ProjectFile)
    private readonly projectFileRepository: Repository<ProjectFile>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    private readonly supabaseService: SupabaseService,
  ) {}

  /**
   * Validate that a project belongs to the given organization
   */
  private async validateProjectOrganization(
    projectId: string,
    organizationId: string,
  ): Promise<void> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      select: ['id', 'organizationId'],
    });

    if (!project || project.organizationId !== organizationId) {
      throw ResourceNotFoundException.forProject(projectId);
    }
  }

  /**
   * Validate that a file belongs to a project within the given organization
   */
  private async validateFileOrganization(
    file: ProjectFile,
    organizationId: string,
  ): Promise<void> {
    await this.validateProjectOrganization(file.projectId, organizationId);
  }

  /**
   * Upload a file to Supabase Storage
   */
  async uploadFile(
    file: Express.Multer.File,
    projectId: string,
    uploaderId: string,
    taskId?: string,
    category?: FileCategory,
    organizationId?: string,
  ): Promise<ProjectFile> {
    // Validate project belongs to the user's organization
    if (organizationId) {
      await this.validateProjectOrganization(projectId, organizationId);
    }
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new BusinessException('FILE_003', {
        message: 'ファイルサイズが上限を超えています',
        userMessage: 'ファイルサイズが上限（10MB）を超えています',
        details: { maxSize: MAX_FILE_SIZE, actualSize: file.size },
      });
    }

    // Validate file extension
    const extension = this.getFileExtension(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      throw new BusinessException('FILE_004', {
        message: '許可されていないファイル形式です',
        userMessage: `許可されていないファイル形式です。許可される形式: ${ALLOWED_EXTENSIONS.join(', ')}`,
        details: { allowedExtensions: ALLOWED_EXTENSIONS, actualExtension: extension },
      });
    }

    // Validate MIME type matches extension
    this.validateMimeType(extension, file.mimetype);

    // Validate file content via magic bytes
    this.validateMagicBytes(extension, file.buffer);

    // Determine category if not provided
    const fileCategory = category || this.determineCategory(extension);

    // Generate unique file name
    const uniqueFileName = `${uuidv4()}.${extension}`;
    const storagePath = `${projectId}/${uniqueFileName}`;

    // Upload to Supabase Storage
    const supabaseAdmin = this.supabaseService.admin;
    if (!supabaseAdmin) {
      throw new BusinessException('SYSTEM_001', {
        message: 'Supabase Storageが設定されていません',
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
        message: `ファイルのアップロードに失敗しました: ${error.message}`,
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
  async getFilesByProject(projectId: string, organizationId?: string): Promise<ProjectFile[]> {
    // Validate project belongs to the user's organization
    if (organizationId) {
      await this.validateProjectOrganization(projectId, organizationId);
    }

    return this.projectFileRepository.find({
      where: { projectId },
      relations: ['uploader'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get all files for a task
   */
  async getFilesByTask(taskId: string, organizationId?: string): Promise<ProjectFile[]> {
    const files = await this.projectFileRepository.find({
      where: { taskId },
      relations: ['uploader'],
      order: { createdAt: 'DESC' },
    });

    // Validate org via the project if files exist
    if (organizationId && files.length > 0) {
      await this.validateProjectOrganization(files[0].projectId, organizationId);
    }

    return files;
  }

  /**
   * Get a file by ID
   */
  async getFileById(fileId: string, organizationId?: string): Promise<ProjectFile> {
    const file = await this.projectFileRepository.findOne({
      where: { id: fileId },
      relations: ['uploader'],
    });

    if (!file) {
      throw ResourceNotFoundException.forFile(fileId);
    }

    // Validate file belongs to a project in the user's organization
    if (organizationId) {
      await this.validateFileOrganization(file, organizationId);
    }

    return file;
  }

  /**
   * Delete a file from storage and database
   */
  async deleteFile(fileId: string, organizationId?: string): Promise<void> {
    const file = await this.getFileById(fileId, organizationId);

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
    organizationId?: string,
  ): Promise<{ signedUrl: string; expiresIn: number }> {
    const file = await this.getFileById(fileId, organizationId);

    const supabaseAdmin = this.supabaseService.admin;
    if (!supabaseAdmin) {
      throw new BusinessException('SYSTEM_001', {
        message: 'Supabase Storageが設定されていません',
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
   * Validate MIME type matches the expected types for the extension
   */
  private validateMimeType(extension: string, mimetype: string): void {
    const allowedMimes = EXTENSION_MIME_MAP[extension];
    if (allowedMimes && !allowedMimes.includes(mimetype)) {
      this.logger.warn(
        `MIME type mismatch: extension="${extension}", mimetype="${mimetype}", expected=${allowedMimes.join('|')}`,
      );
      throw new BusinessException('FILE_005', {
        message: 'ファイルの内容が拡張子と一致しません',
        userMessage: 'ファイルの内容が拡張子と一致しません。正しいファイルを選択してください。',
        details: { extension, mimetype },
      });
    }
  }

  /**
   * Validate file content via magic bytes to prevent extension spoofing
   */
  private validateMagicBytes(extension: string, buffer: Buffer): void {
    if (!buffer || buffer.length < 4) {
      throw new BusinessException('FILE_006', {
        message: 'ファイルが空または破損しています',
        userMessage: 'ファイルが空または破損しています。',
      });
    }

    const signature = MAGIC_BYTES.find((sig) => sig.extensions.includes(extension));
    if (!signature) {
      return; // No magic bytes check available for this extension
    }

    const offset = signature.offset || 0;
    const matches = signature.bytes.every(
      (byte, i) => buffer.length > offset + i && buffer[offset + i] === byte,
    );

    if (!matches) {
      this.logger.warn(
        `Magic bytes mismatch for extension="${extension}": ` +
          `expected=[${signature.bytes.map((b) => '0x' + b.toString(16)).join(',')}], ` +
          `actual=[${Array.from(buffer.slice(offset, offset + signature.bytes.length)).map((b) => '0x' + b.toString(16)).join(',')}]`,
      );
      throw new BusinessException('FILE_005', {
        message: 'ファイルの内容が拡張子と一致しません',
        userMessage: 'ファイルの内容が拡張子と一致しません。正しいファイルを選択してください。',
        details: { extension },
      });
    }
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
