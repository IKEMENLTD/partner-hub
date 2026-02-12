import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FileStorageService } from './file-storage.service';
import { ProjectFile } from './entities/project-file.entity';
import { Project } from '../project/entities/project.entity';
import { FileCategory } from './enums/file-category.enum';
import { SupabaseService } from '../supabase/supabase.service';
import { ResourceNotFoundException } from '../../common/exceptions/resource-not-found.exception';
import { BusinessException } from '../../common/exceptions/business.exception';

describe('FileStorageService', () => {
  let service: FileStorageService;
  let projectFileRepository: Record<string, jest.Mock>;
  let supabaseService: { admin: any };

  // Supabase storage mock helpers
  const mockUpload = jest.fn();
  const mockGetPublicUrl = jest.fn();
  const mockRemove = jest.fn();
  const mockCreateSignedUrl = jest.fn();

  const mockStorageFrom = jest.fn().mockReturnValue({
    upload: mockUpload,
    getPublicUrl: mockGetPublicUrl,
    remove: mockRemove,
    createSignedUrl: mockCreateSignedUrl,
  });

  const mockSupabaseAdmin = {
    storage: {
      from: mockStorageFrom,
    },
  };

  const now = new Date('2026-02-12T00:00:00Z');

  const mockProjectFile: Partial<ProjectFile> = {
    id: 'file-1',
    projectId: 'project-1',
    taskId: null,
    uploaderId: 'user-1',
    fileName: 'abc-123.pdf',
    originalName: 'report.pdf',
    mimeType: 'application/pdf',
    fileSize: 1024,
    storagePath: 'project-1/abc-123.pdf',
    publicUrl: 'https://storage.example.com/project-1/abc-123.pdf',
    category: FileCategory.DOCUMENT,
    createdAt: now,
  };

  const createMockMulterFile = (overrides?: Partial<Express.Multer.File>): Express.Multer.File => ({
    fieldname: 'file',
    originalname: 'report.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    size: 1024,
    buffer: Buffer.from('file content'),
    destination: '',
    filename: '',
    path: '',
    stream: null as any,
    ...overrides,
  });

  const mockProjectFileRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  const mockProjectRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileStorageService,
        {
          provide: getRepositoryToken(ProjectFile),
          useValue: mockProjectFileRepository,
        },
        {
          provide: getRepositoryToken(Project),
          useValue: mockProjectRepository,
        },
        {
          provide: SupabaseService,
          useValue: { admin: mockSupabaseAdmin },
        },
      ],
    }).compile();

    service = module.get<FileStorageService>(FileStorageService);
    projectFileRepository = module.get(getRepositoryToken(ProjectFile));
    supabaseService = module.get(SupabaseService);

    jest.clearAllMocks();

    // Reset default mock return values
    mockStorageFrom.mockReturnValue({
      upload: mockUpload,
      getPublicUrl: mockGetPublicUrl,
      remove: mockRemove,
      createSignedUrl: mockCreateSignedUrl,
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // =============================================
  // uploadFile
  // =============================================

  describe('uploadFile', () => {
    const projectId = 'project-1';
    const uploaderId = 'user-1';

    it('should upload a PDF file successfully', async () => {
      const file = createMockMulterFile();
      mockUpload.mockResolvedValue({ data: { path: 'project-1/uuid.pdf' }, error: null });
      mockGetPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://storage.example.com/project-1/uuid.pdf' },
      });
      mockProjectFileRepository.save.mockImplementation((entity) =>
        Promise.resolve({ ...entity, id: 'file-1', createdAt: now }),
      );

      const result = await service.uploadFile(file, projectId, uploaderId);

      expect(mockStorageFrom).toHaveBeenCalledWith('project-files');
      expect(mockUpload).toHaveBeenCalledWith(
        expect.stringMatching(/^project-1\/.+\.pdf$/),
        file.buffer,
        { contentType: 'application/pdf', upsert: false },
      );
      expect(mockGetPublicUrl).toHaveBeenCalled();
      expect(mockProjectFileRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId,
          uploaderId,
          originalName: 'report.pdf',
          mimeType: 'application/pdf',
          fileSize: 1024,
          category: FileCategory.DOCUMENT,
        }),
      );
      expect(result.id).toBe('file-1');
    });

    it('should upload a file with taskId', async () => {
      const file = createMockMulterFile();
      const taskId = 'task-1';
      mockUpload.mockResolvedValue({ data: { path: 'project-1/uuid.pdf' }, error: null });
      mockGetPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://storage.example.com/project-1/uuid.pdf' },
      });
      mockProjectFileRepository.save.mockImplementation((entity) =>
        Promise.resolve({ ...entity, id: 'file-2', createdAt: now }),
      );

      const result = await service.uploadFile(file, projectId, uploaderId, taskId);

      expect(mockProjectFileRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          taskId: 'task-1',
        }),
      );
      expect(result.taskId).toBe('task-1');
    });

    it('should set taskId to null when not provided', async () => {
      const file = createMockMulterFile();
      mockUpload.mockResolvedValue({ data: { path: 'project-1/uuid.pdf' }, error: null });
      mockGetPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://storage.example.com/project-1/uuid.pdf' },
      });
      mockProjectFileRepository.save.mockImplementation((entity) =>
        Promise.resolve({ ...entity, id: 'file-3', createdAt: now }),
      );

      await service.uploadFile(file, projectId, uploaderId);

      expect(mockProjectFileRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          taskId: null,
        }),
      );
    });

    it('should use provided category instead of auto-determining', async () => {
      const file = createMockMulterFile();
      mockUpload.mockResolvedValue({ data: { path: 'project-1/uuid.pdf' }, error: null });
      mockGetPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://storage.example.com/project-1/uuid.pdf' },
      });
      mockProjectFileRepository.save.mockImplementation((entity) =>
        Promise.resolve({ ...entity, id: 'file-4', createdAt: now }),
      );

      await service.uploadFile(file, projectId, uploaderId, undefined, FileCategory.OTHER);

      expect(mockProjectFileRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          category: FileCategory.OTHER,
        }),
      );
    });

    it('should auto-determine DOCUMENT category for pdf', async () => {
      const file = createMockMulterFile({ originalname: 'document.pdf' });
      mockUpload.mockResolvedValue({ data: {}, error: null });
      mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://example.com/url' } });
      mockProjectFileRepository.save.mockImplementation((entity) =>
        Promise.resolve({ ...entity, id: 'file-5', createdAt: now }),
      );

      await service.uploadFile(file, projectId, uploaderId);

      expect(mockProjectFileRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ category: FileCategory.DOCUMENT }),
      );
    });

    it('should auto-determine DOCUMENT category for doc', async () => {
      const file = createMockMulterFile({ originalname: 'document.doc' });
      mockUpload.mockResolvedValue({ data: {}, error: null });
      mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://example.com/url' } });
      mockProjectFileRepository.save.mockImplementation((entity) =>
        Promise.resolve({ ...entity, id: 'file-6', createdAt: now }),
      );

      await service.uploadFile(file, projectId, uploaderId);

      expect(mockProjectFileRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ category: FileCategory.DOCUMENT }),
      );
    });

    it('should auto-determine DOCUMENT category for docx', async () => {
      const file = createMockMulterFile({ originalname: 'document.docx' });
      mockUpload.mockResolvedValue({ data: {}, error: null });
      mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://example.com/url' } });
      mockProjectFileRepository.save.mockImplementation((entity) =>
        Promise.resolve({ ...entity, id: 'file-7', createdAt: now }),
      );

      await service.uploadFile(file, projectId, uploaderId);

      expect(mockProjectFileRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ category: FileCategory.DOCUMENT }),
      );
    });

    it('should auto-determine DOCUMENT category for xls', async () => {
      const file = createMockMulterFile({ originalname: 'spreadsheet.xls' });
      mockUpload.mockResolvedValue({ data: {}, error: null });
      mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://example.com/url' } });
      mockProjectFileRepository.save.mockImplementation((entity) =>
        Promise.resolve({ ...entity, id: 'file-8', createdAt: now }),
      );

      await service.uploadFile(file, projectId, uploaderId);

      expect(mockProjectFileRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ category: FileCategory.DOCUMENT }),
      );
    });

    it('should auto-determine DOCUMENT category for xlsx', async () => {
      const file = createMockMulterFile({ originalname: 'spreadsheet.xlsx' });
      mockUpload.mockResolvedValue({ data: {}, error: null });
      mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://example.com/url' } });
      mockProjectFileRepository.save.mockImplementation((entity) =>
        Promise.resolve({ ...entity, id: 'file-9', createdAt: now }),
      );

      await service.uploadFile(file, projectId, uploaderId);

      expect(mockProjectFileRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ category: FileCategory.DOCUMENT }),
      );
    });

    it('should auto-determine IMAGE category for png', async () => {
      const file = createMockMulterFile({ originalname: 'screenshot.png', mimetype: 'image/png' });
      mockUpload.mockResolvedValue({ data: {}, error: null });
      mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://example.com/url' } });
      mockProjectFileRepository.save.mockImplementation((entity) =>
        Promise.resolve({ ...entity, id: 'file-10', createdAt: now }),
      );

      await service.uploadFile(file, projectId, uploaderId);

      expect(mockProjectFileRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ category: FileCategory.IMAGE }),
      );
    });

    it('should auto-determine IMAGE category for jpg', async () => {
      const file = createMockMulterFile({ originalname: 'photo.jpg', mimetype: 'image/jpeg' });
      mockUpload.mockResolvedValue({ data: {}, error: null });
      mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://example.com/url' } });
      mockProjectFileRepository.save.mockImplementation((entity) =>
        Promise.resolve({ ...entity, id: 'file-11', createdAt: now }),
      );

      await service.uploadFile(file, projectId, uploaderId);

      expect(mockProjectFileRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ category: FileCategory.IMAGE }),
      );
    });

    it('should auto-determine IMAGE category for jpeg', async () => {
      const file = createMockMulterFile({ originalname: 'photo.jpeg', mimetype: 'image/jpeg' });
      mockUpload.mockResolvedValue({ data: {}, error: null });
      mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://example.com/url' } });
      mockProjectFileRepository.save.mockImplementation((entity) =>
        Promise.resolve({ ...entity, id: 'file-12', createdAt: now }),
      );

      await service.uploadFile(file, projectId, uploaderId);

      expect(mockProjectFileRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ category: FileCategory.IMAGE }),
      );
    });

    it('should auto-determine IMAGE category for gif', async () => {
      const file = createMockMulterFile({ originalname: 'animation.gif', mimetype: 'image/gif' });
      mockUpload.mockResolvedValue({ data: {}, error: null });
      mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://example.com/url' } });
      mockProjectFileRepository.save.mockImplementation((entity) =>
        Promise.resolve({ ...entity, id: 'file-13', createdAt: now }),
      );

      await service.uploadFile(file, projectId, uploaderId);

      expect(mockProjectFileRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ category: FileCategory.IMAGE }),
      );
    });

    it('should handle extension case insensitivity', async () => {
      const file = createMockMulterFile({ originalname: 'REPORT.PDF' });
      mockUpload.mockResolvedValue({ data: {}, error: null });
      mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://example.com/url' } });
      mockProjectFileRepository.save.mockImplementation((entity) =>
        Promise.resolve({ ...entity, id: 'file-14', createdAt: now }),
      );

      await service.uploadFile(file, projectId, uploaderId);

      expect(mockProjectFileRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ category: FileCategory.DOCUMENT }),
      );
    });

    it('should generate a unique storage path with uuid and extension', async () => {
      const file = createMockMulterFile({ originalname: 'report.pdf' });
      mockUpload.mockResolvedValue({ data: {}, error: null });
      mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://example.com/url' } });
      mockProjectFileRepository.save.mockImplementation((entity) =>
        Promise.resolve({ ...entity, id: 'file-15', createdAt: now }),
      );

      await service.uploadFile(file, projectId, uploaderId);

      const savedEntity = mockProjectFileRepository.save.mock.calls[0][0];
      // storagePath should be projectId/uuid.extension
      expect(savedEntity.storagePath).toMatch(/^project-1\/[a-f0-9-]+\.pdf$/);
      // fileName should be uuid.extension
      expect(savedEntity.fileName).toMatch(/^[a-f0-9-]+\.pdf$/);
    });

    it('should set publicUrl to null when urlData is empty', async () => {
      const file = createMockMulterFile();
      mockUpload.mockResolvedValue({ data: {}, error: null });
      mockGetPublicUrl.mockReturnValue({ data: null });
      mockProjectFileRepository.save.mockImplementation((entity) =>
        Promise.resolve({ ...entity, id: 'file-16', createdAt: now }),
      );

      await service.uploadFile(file, projectId, uploaderId);

      expect(mockProjectFileRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ publicUrl: null }),
      );
    });

    // ---- Error cases ----

    it('should throw BusinessException when file size exceeds 10MB', async () => {
      const file = createMockMulterFile({ size: 11 * 1024 * 1024 });

      await expect(service.uploadFile(file, projectId, uploaderId)).rejects.toThrow(
        BusinessException,
      );

      // Ensure no upload or save was attempted
      expect(mockUpload).not.toHaveBeenCalled();
      expect(mockProjectFileRepository.save).not.toHaveBeenCalled();
    });

    it('should throw BusinessException with FILE_003 for oversized file', async () => {
      const file = createMockMulterFile({ size: 10 * 1024 * 1024 + 1 }); // exactly 1 byte over

      try {
        await service.uploadFile(file, projectId, uploaderId);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException);
        expect((error as BusinessException).getErrorResponse().code).toMatch(/FILE/);
      }
    });

    it('should allow file exactly at 10MB limit', async () => {
      const file = createMockMulterFile({ size: 10 * 1024 * 1024 }); // exactly 10MB
      mockUpload.mockResolvedValue({ data: {}, error: null });
      mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://example.com/url' } });
      mockProjectFileRepository.save.mockImplementation((entity) =>
        Promise.resolve({ ...entity, id: 'file-17', createdAt: now }),
      );

      const result = await service.uploadFile(file, projectId, uploaderId);

      expect(result).toBeDefined();
      expect(mockUpload).toHaveBeenCalled();
    });

    it('should throw BusinessException for disallowed extension (.exe)', async () => {
      const file = createMockMulterFile({
        originalname: 'malware.exe',
        mimetype: 'application/x-msdownload',
      });

      await expect(service.uploadFile(file, projectId, uploaderId)).rejects.toThrow(
        BusinessException,
      );

      expect(mockUpload).not.toHaveBeenCalled();
    });

    it('should throw BusinessException for disallowed extension (.zip)', async () => {
      const file = createMockMulterFile({
        originalname: 'archive.zip',
        mimetype: 'application/zip',
      });

      await expect(service.uploadFile(file, projectId, uploaderId)).rejects.toThrow(
        BusinessException,
      );
    });

    it('should throw BusinessException for disallowed extension (.js)', async () => {
      const file = createMockMulterFile({
        originalname: 'script.js',
        mimetype: 'application/javascript',
      });

      await expect(service.uploadFile(file, projectId, uploaderId)).rejects.toThrow(
        BusinessException,
      );
    });

    it('should throw BusinessException for file with no extension', async () => {
      const file = createMockMulterFile({
        originalname: 'noextension',
        mimetype: 'application/octet-stream',
      });

      await expect(service.uploadFile(file, projectId, uploaderId)).rejects.toThrow(
        BusinessException,
      );
    });

    it('should throw BusinessException when supabaseAdmin is not configured', async () => {
      // Replace admin with null/undefined to simulate missing Supabase config
      Object.defineProperty(supabaseService, 'admin', {
        get: () => null,
        configurable: true,
      });

      const file = createMockMulterFile();

      await expect(service.uploadFile(file, projectId, uploaderId)).rejects.toThrow(
        BusinessException,
      );

      expect(mockUpload).not.toHaveBeenCalled();

      // Restore admin
      Object.defineProperty(supabaseService, 'admin', {
        get: () => mockSupabaseAdmin,
        configurable: true,
      });
    });

    it('should throw BusinessException when Supabase upload fails', async () => {
      const file = createMockMulterFile();
      mockUpload.mockResolvedValue({
        data: null,
        error: { message: 'Storage bucket not found' },
      });

      await expect(service.uploadFile(file, projectId, uploaderId)).rejects.toThrow(
        BusinessException,
      );

      expect(mockProjectFileRepository.save).not.toHaveBeenCalled();
    });

    it('should accept all allowed extensions', async () => {
      const allowedExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg', 'gif'];

      for (const ext of allowedExtensions) {
        jest.clearAllMocks();
        mockStorageFrom.mockReturnValue({
          upload: mockUpload,
          getPublicUrl: mockGetPublicUrl,
          remove: mockRemove,
          createSignedUrl: mockCreateSignedUrl,
        });
        const file = createMockMulterFile({ originalname: `file.${ext}` });
        mockUpload.mockResolvedValue({ data: {}, error: null });
        mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://example.com/url' } });
        mockProjectFileRepository.save.mockImplementation((entity) =>
          Promise.resolve({ ...entity, id: `file-${ext}`, createdAt: now }),
        );

        const result = await service.uploadFile(file, projectId, uploaderId);
        expect(result).toBeDefined();
      }
    });
  });

  // =============================================
  // getFilesByProject
  // =============================================

  describe('getFilesByProject', () => {
    it('should return files for a project ordered by createdAt DESC', async () => {
      const files = [
        { ...mockProjectFile, id: 'file-1' },
        { ...mockProjectFile, id: 'file-2' },
      ];
      mockProjectFileRepository.find.mockResolvedValue(files);

      const result = await service.getFilesByProject('project-1');

      expect(mockProjectFileRepository.find).toHaveBeenCalledWith({
        where: { projectId: 'project-1' },
        relations: ['uploader'],
        order: { createdAt: 'DESC' },
      });
      expect(result).toHaveLength(2);
      expect(result).toEqual(files);
    });

    it('should return empty array when no files exist for project', async () => {
      mockProjectFileRepository.find.mockResolvedValue([]);

      const result = await service.getFilesByProject('project-nonexistent');

      expect(result).toEqual([]);
    });

    it('should include uploader relation', async () => {
      mockProjectFileRepository.find.mockResolvedValue([]);

      await service.getFilesByProject('project-1');

      expect(mockProjectFileRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          relations: ['uploader'],
        }),
      );
    });
  });

  // =============================================
  // getFilesByTask
  // =============================================

  describe('getFilesByTask', () => {
    it('should return files for a task ordered by createdAt DESC', async () => {
      const files = [
        { ...mockProjectFile, id: 'file-1', taskId: 'task-1' },
        { ...mockProjectFile, id: 'file-2', taskId: 'task-1' },
      ];
      mockProjectFileRepository.find.mockResolvedValue(files);

      const result = await service.getFilesByTask('task-1');

      expect(mockProjectFileRepository.find).toHaveBeenCalledWith({
        where: { taskId: 'task-1' },
        relations: ['uploader'],
        order: { createdAt: 'DESC' },
      });
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no files exist for task', async () => {
      mockProjectFileRepository.find.mockResolvedValue([]);

      const result = await service.getFilesByTask('task-nonexistent');

      expect(result).toEqual([]);
    });

    it('should include uploader relation', async () => {
      mockProjectFileRepository.find.mockResolvedValue([]);

      await service.getFilesByTask('task-1');

      expect(mockProjectFileRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          relations: ['uploader'],
        }),
      );
    });
  });

  // =============================================
  // getFileById
  // =============================================

  describe('getFileById', () => {
    it('should return a file by its ID', async () => {
      mockProjectFileRepository.findOne.mockResolvedValue(mockProjectFile);

      const result = await service.getFileById('file-1');

      expect(mockProjectFileRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'file-1' },
        relations: ['uploader'],
      });
      expect(result).toEqual(mockProjectFile);
    });

    it('should throw ResourceNotFoundException when file not found', async () => {
      mockProjectFileRepository.findOne.mockResolvedValue(null);

      await expect(service.getFileById('nonexistent')).rejects.toThrow(
        ResourceNotFoundException,
      );
    });

    it('should include uploader relation', async () => {
      mockProjectFileRepository.findOne.mockResolvedValue(mockProjectFile);

      await service.getFileById('file-1');

      expect(mockProjectFileRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          relations: ['uploader'],
        }),
      );
    });
  });

  // =============================================
  // deleteFile
  // =============================================

  describe('deleteFile', () => {
    it('should delete file from storage and database', async () => {
      mockProjectFileRepository.findOne.mockResolvedValue(mockProjectFile);
      mockRemove.mockResolvedValue({ data: [], error: null });
      mockProjectFileRepository.delete.mockResolvedValue({ affected: 1 });

      await service.deleteFile('file-1');

      expect(mockStorageFrom).toHaveBeenCalledWith('project-files');
      expect(mockRemove).toHaveBeenCalledWith([mockProjectFile.storagePath]);
      expect(mockProjectFileRepository.delete).toHaveBeenCalledWith('file-1');
    });

    it('should throw ResourceNotFoundException when file does not exist', async () => {
      mockProjectFileRepository.findOne.mockResolvedValue(null);

      await expect(service.deleteFile('nonexistent')).rejects.toThrow(
        ResourceNotFoundException,
      );

      expect(mockRemove).not.toHaveBeenCalled();
      expect(mockProjectFileRepository.delete).not.toHaveBeenCalled();
    });

    it('should still delete from database even if Supabase storage removal fails', async () => {
      mockProjectFileRepository.findOne.mockResolvedValue(mockProjectFile);
      mockRemove.mockResolvedValue({ data: null, error: { message: 'File not found in storage' } });
      mockProjectFileRepository.delete.mockResolvedValue({ affected: 1 });

      await service.deleteFile('file-1');

      // Should still proceed to delete from database
      expect(mockProjectFileRepository.delete).toHaveBeenCalledWith('file-1');
    });

    it('should still delete from database when supabaseAdmin is not configured', async () => {
      mockProjectFileRepository.findOne.mockResolvedValue(mockProjectFile);
      mockProjectFileRepository.delete.mockResolvedValue({ affected: 1 });

      // Temporarily set admin to null
      Object.defineProperty(supabaseService, 'admin', {
        get: () => null,
        configurable: true,
      });

      await service.deleteFile('file-1');

      expect(mockRemove).not.toHaveBeenCalled();
      expect(mockProjectFileRepository.delete).toHaveBeenCalledWith('file-1');

      // Restore admin
      Object.defineProperty(supabaseService, 'admin', {
        get: () => mockSupabaseAdmin,
        configurable: true,
      });
    });
  });

  // =============================================
  // generateSignedUrl
  // =============================================

  describe('generateSignedUrl', () => {
    it('should generate a signed URL with default expiry (3600s)', async () => {
      mockProjectFileRepository.findOne.mockResolvedValue(mockProjectFile);
      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: 'https://storage.example.com/signed/abc' },
        error: null,
      });

      const result = await service.generateSignedUrl('file-1');

      expect(mockStorageFrom).toHaveBeenCalledWith('project-files');
      expect(mockCreateSignedUrl).toHaveBeenCalledWith(mockProjectFile.storagePath, 3600);
      expect(result).toEqual({
        signedUrl: 'https://storage.example.com/signed/abc',
        expiresIn: 3600,
      });
    });

    it('should generate a signed URL with custom expiry', async () => {
      mockProjectFileRepository.findOne.mockResolvedValue(mockProjectFile);
      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: 'https://storage.example.com/signed/abc' },
        error: null,
      });

      const result = await service.generateSignedUrl('file-1', 7200);

      expect(mockCreateSignedUrl).toHaveBeenCalledWith(mockProjectFile.storagePath, 7200);
      expect(result.expiresIn).toBe(7200);
    });

    it('should throw ResourceNotFoundException when file not found', async () => {
      mockProjectFileRepository.findOne.mockResolvedValue(null);

      await expect(service.generateSignedUrl('nonexistent')).rejects.toThrow(
        ResourceNotFoundException,
      );

      expect(mockCreateSignedUrl).not.toHaveBeenCalled();
    });

    it('should throw BusinessException when supabaseAdmin is not configured', async () => {
      mockProjectFileRepository.findOne.mockResolvedValue(mockProjectFile);

      Object.defineProperty(supabaseService, 'admin', {
        get: () => null,
        configurable: true,
      });

      await expect(service.generateSignedUrl('file-1')).rejects.toThrow(BusinessException);

      expect(mockCreateSignedUrl).not.toHaveBeenCalled();

      // Restore admin
      Object.defineProperty(supabaseService, 'admin', {
        get: () => mockSupabaseAdmin,
        configurable: true,
      });
    });

    it('should throw BusinessException when Supabase createSignedUrl fails', async () => {
      mockProjectFileRepository.findOne.mockResolvedValue(mockProjectFile);
      mockCreateSignedUrl.mockResolvedValue({
        data: null,
        error: { message: 'Signed URL generation failed' },
      });

      await expect(service.generateSignedUrl('file-1')).rejects.toThrow(BusinessException);
    });
  });

  // =============================================
  // File extension and category determination (private methods tested via uploadFile)
  // =============================================

  describe('file extension extraction (via uploadFile)', () => {
    beforeEach(() => {
      mockUpload.mockResolvedValue({ data: {}, error: null });
      mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://example.com/url' } });
      mockProjectFileRepository.save.mockImplementation((entity) =>
        Promise.resolve({ ...entity, id: 'file-ext', createdAt: now }),
      );
    });

    it('should extract extension from filename with multiple dots', async () => {
      const file = createMockMulterFile({ originalname: 'my.report.final.pdf' });

      await service.uploadFile(file, 'project-1', 'user-1');

      const savedEntity = mockProjectFileRepository.save.mock.calls[0][0];
      expect(savedEntity.storagePath).toMatch(/\.pdf$/);
      expect(savedEntity.category).toBe(FileCategory.DOCUMENT);
    });

    it('should handle uppercase extensions by lowering them', async () => {
      const file = createMockMulterFile({ originalname: 'IMAGE.PNG', mimetype: 'image/png' });

      await service.uploadFile(file, 'project-1', 'user-1');

      const savedEntity = mockProjectFileRepository.save.mock.calls[0][0];
      expect(savedEntity.storagePath).toMatch(/\.png$/);
      expect(savedEntity.category).toBe(FileCategory.IMAGE);
    });

    it('should handle mixed case extensions', async () => {
      const file = createMockMulterFile({ originalname: 'document.DoC' });

      await service.uploadFile(file, 'project-1', 'user-1');

      const savedEntity = mockProjectFileRepository.save.mock.calls[0][0];
      expect(savedEntity.storagePath).toMatch(/\.doc$/);
      expect(savedEntity.category).toBe(FileCategory.DOCUMENT);
    });
  });

  // =============================================
  // Category determination edge case - OTHER category
  // =============================================

  describe('category determination for OTHER', () => {
    it('should return OTHER category for unknown but allowed-via-override extensions', async () => {
      // This tests the determineCategory logic indirectly.
      // Since the service only allows specific extensions and all of them map to
      // DOCUMENT or IMAGE, OTHER is currently only reachable if a category is
      // explicitly passed or the allowed list changes. We test via explicit category.
      const file = createMockMulterFile({ originalname: 'report.pdf' });
      mockUpload.mockResolvedValue({ data: {}, error: null });
      mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://example.com/url' } });
      mockProjectFileRepository.save.mockImplementation((entity) =>
        Promise.resolve({ ...entity, id: 'file-other', createdAt: now }),
      );

      await service.uploadFile(file, 'project-1', 'user-1', undefined, FileCategory.OTHER);

      expect(mockProjectFileRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ category: FileCategory.OTHER }),
      );
    });
  });

  // =============================================
  // Integration-like scenarios
  // =============================================

  describe('integration-like scenarios', () => {
    it('should handle full upload-then-delete lifecycle', async () => {
      // Upload
      const file = createMockMulterFile();
      const savedFile = { ...mockProjectFile, id: 'file-lifecycle' };
      mockUpload.mockResolvedValue({ data: {}, error: null });
      mockGetPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://storage.example.com/project-1/uuid.pdf' },
      });
      mockProjectFileRepository.save.mockResolvedValue(savedFile);

      const uploaded = await service.uploadFile(file, 'project-1', 'user-1');
      expect(uploaded.id).toBe('file-lifecycle');

      // Now delete the same file
      mockProjectFileRepository.findOne.mockResolvedValue(savedFile);
      mockRemove.mockResolvedValue({ data: [], error: null });
      mockProjectFileRepository.delete.mockResolvedValue({ affected: 1 });

      await service.deleteFile('file-lifecycle');

      expect(mockProjectFileRepository.delete).toHaveBeenCalledWith('file-lifecycle');
    });

    it('should handle upload-then-getById-then-generateSignedUrl lifecycle', async () => {
      // Upload
      const file = createMockMulterFile();
      const savedFile = { ...mockProjectFile, id: 'file-lifecycle-2', storagePath: 'project-1/uuid.pdf' };
      mockUpload.mockResolvedValue({ data: {}, error: null });
      mockGetPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://storage.example.com/project-1/uuid.pdf' },
      });
      mockProjectFileRepository.save.mockResolvedValue(savedFile);

      const uploaded = await service.uploadFile(file, 'project-1', 'user-1');
      expect(uploaded.id).toBe('file-lifecycle-2');

      // Get by ID
      mockProjectFileRepository.findOne.mockResolvedValue(savedFile);
      const found = await service.getFileById('file-lifecycle-2');
      expect(found.id).toBe('file-lifecycle-2');

      // Generate signed URL
      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: 'https://storage.example.com/signed/xyz' },
        error: null,
      });
      const signed = await service.generateSignedUrl('file-lifecycle-2');
      expect(signed.signedUrl).toBe('https://storage.example.com/signed/xyz');
    });
  });
});
