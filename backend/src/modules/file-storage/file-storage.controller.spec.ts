import { Test, TestingModule } from '@nestjs/testing';
import { FileStorageController } from './file-storage.controller';
import { FileStorageService } from './file-storage.service';
import { BusinessException } from '../../common/exceptions/business.exception';

describe('FileStorageController', () => {
  let controller: FileStorageController;

  const mockFile = {
    id: 'file-uuid-1',
    projectId: 'proj-1',
    taskId: null,
    uploaderId: 'user-1',
    fileName: 'test-file.pdf',
    originalName: 'test-file.pdf',
    mimeType: 'application/pdf',
    fileSize: 1024,
    storagePath: '/files/test-file.pdf',
    publicUrl: 'https://storage.example.com/test-file.pdf',
    category: 'document',
    createdAt: new Date(),
    uploader: {
      id: 'user-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@test.com',
    },
  };

  const mockFileStorageService = {
    uploadFile: jest.fn(),
    getFilesByProject: jest.fn(),
    getFilesByTask: jest.fn(),
    getFileById: jest.fn(),
    deleteFile: jest.fn(),
    generateSignedUrl: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FileStorageController],
      providers: [
        { provide: FileStorageService, useValue: mockFileStorageService },
      ],
    }).compile();

    controller = module.get<FileStorageController>(FileStorageController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('uploadFile', () => {
    it('should upload a file successfully', async () => {
      mockFileStorageService.uploadFile.mockResolvedValue(mockFile);

      const file = { originalname: 'test.pdf', size: 1024 } as Express.Multer.File;
      const result = await controller.uploadFile(file, 'proj-1', undefined as any, 'document', 'user-1');

      expect(result.id).toBe('file-uuid-1');
      expect(result.fileName).toBe('test-file.pdf');
      expect(mockFileStorageService.uploadFile).toHaveBeenCalledWith(
        file, 'proj-1', 'user-1', undefined, 'document',
      );
    });

    it('should throw when no file is provided', async () => {
      await expect(
        controller.uploadFile(null as any, 'proj-1', undefined as any, undefined as any, 'user-1'),
      ).rejects.toThrow(BusinessException);
    });

    it('should throw when no projectId is provided', async () => {
      const file = { originalname: 'test.pdf' } as Express.Multer.File;

      await expect(
        controller.uploadFile(file, undefined as any, undefined as any, undefined as any, 'user-1'),
      ).rejects.toThrow(BusinessException);
    });
  });

  describe('getFilesByProject', () => {
    it('should return files for a project', async () => {
      mockFileStorageService.getFilesByProject.mockResolvedValue([mockFile]);

      const result = await controller.getFilesByProject('proj-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('file-uuid-1');
    });
  });

  describe('getFilesByTask', () => {
    it('should return files for a task', async () => {
      mockFileStorageService.getFilesByTask.mockResolvedValue([mockFile]);

      const result = await controller.getFilesByTask('task-1');

      expect(result).toHaveLength(1);
    });
  });

  describe('getFile', () => {
    it('should return a file by id', async () => {
      mockFileStorageService.getFileById.mockResolvedValue(mockFile);

      const result = await controller.getFile('file-1');

      expect(result.id).toBe('file-uuid-1');
    });

    it('should propagate not found errors', async () => {
      mockFileStorageService.getFileById.mockRejectedValue(new Error('Not found'));

      await expect(controller.getFile('invalid')).rejects.toThrow('Not found');
    });
  });

  describe('deleteFile', () => {
    it('should delete a file', async () => {
      mockFileStorageService.deleteFile.mockResolvedValue(undefined);

      await controller.deleteFile('file-1');

      expect(mockFileStorageService.deleteFile).toHaveBeenCalledWith('file-1');
    });
  });

  describe('getDownloadUrl', () => {
    it('should return a signed URL with default expiration', async () => {
      const signedUrl = { url: 'https://storage.example.com/signed/test-file.pdf', expiresIn: 3600 };
      mockFileStorageService.generateSignedUrl.mockResolvedValue(signedUrl);

      const result = await controller.getDownloadUrl('file-1', undefined);

      expect(result).toEqual(signedUrl);
      expect(mockFileStorageService.generateSignedUrl).toHaveBeenCalledWith('file-1', 3600);
    });

    it('should return a signed URL with custom expiration', async () => {
      const signedUrl = { url: 'https://storage.example.com/signed/test-file.pdf', expiresIn: 7200 };
      mockFileStorageService.generateSignedUrl.mockResolvedValue(signedUrl);

      const result = await controller.getDownloadUrl('file-1', 7200);

      expect(mockFileStorageService.generateSignedUrl).toHaveBeenCalledWith('file-1', 7200);
    });
  });
});
