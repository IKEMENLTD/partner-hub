import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SupabaseService } from '../supabase/supabase.service';
import { UserProfile } from './entities/user-profile.entity';
import { UserRole } from './enums/user-role.enum';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;
  let supabaseService: SupabaseService;

  const mockProfile: Partial<UserProfile> = {
    id: 'test-uuid',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: UserRole.MEMBER,
    isActive: true,
    avatarUrl: undefined,
    organizationId: 'org-uuid',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  const mockProfileResponse = {
    id: 'test-uuid',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: UserRole.MEMBER,
    isActive: true,
    avatarUrl: undefined,
    organizationId: 'org-uuid',
    createdAt: new Date('2025-01-01'),
  };

  const mockAuthService = {
    mapProfileToResponse: jest.fn(),
    updateProfile: jest.fn(),
    findAllProfiles: jest.fn(),
    findProfileById: jest.fn(),
    deactivateUser: jest.fn(),
    activateUser: jest.fn(),
  };

  const mockSupabaseAdmin = {
    storage: {
      from: jest.fn(),
    },
  };

  const mockSupabaseService = {
    get admin() {
      return mockSupabaseAdmin;
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: SupabaseService, useValue: mockSupabaseService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
    supabaseService = module.get<SupabaseService>(SupabaseService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getProfile', () => {
    it('should return mapped profile', async () => {
      mockAuthService.mapProfileToResponse.mockReturnValue(mockProfileResponse);
      const result = await controller.getProfile(mockProfile as UserProfile);
      expect(result).toEqual(mockProfileResponse);
      expect(mockAuthService.mapProfileToResponse).toHaveBeenCalledWith(mockProfile);
    });
  });

  describe('updateProfile', () => {
    it('should update profile and return mapped response', async () => {
      const updateDto = { firstName: 'Updated', lastName: 'Name' };
      const updatedProfile = { ...mockProfile, ...updateDto };
      mockAuthService.updateProfile.mockResolvedValue(updatedProfile);
      mockAuthService.mapProfileToResponse.mockReturnValue({ ...mockProfileResponse, ...updateDto });

      const result = await controller.updateProfile('test-uuid', { ...updateDto });
      expect(mockAuthService.updateProfile).toHaveBeenCalledWith('test-uuid', updateDto);
      expect(result.firstName).toBe('Updated');
    });

    it('should strip role from update dto', async () => {
      const dtoWithRole = { firstName: 'Updated', role: UserRole.ADMIN } as any;
      mockAuthService.updateProfile.mockResolvedValue(mockProfile);
      mockAuthService.mapProfileToResponse.mockReturnValue(mockProfileResponse);

      await controller.updateProfile('test-uuid', { ...dtoWithRole });
      expect(mockAuthService.updateProfile).toHaveBeenCalledWith('test-uuid', { firstName: 'Updated' });
    });

    it('should strip isActive from update dto', async () => {
      const dtoWithActive = { firstName: 'Updated', isActive: false } as any;
      mockAuthService.updateProfile.mockResolvedValue(mockProfile);
      mockAuthService.mapProfileToResponse.mockReturnValue(mockProfileResponse);

      await controller.updateProfile('test-uuid', { ...dtoWithActive });
      expect(mockAuthService.updateProfile).toHaveBeenCalledWith('test-uuid', { firstName: 'Updated' });
    });

    it('should propagate service errors', async () => {
      mockAuthService.updateProfile.mockRejectedValue(new Error('Service error'));
      await expect(controller.updateProfile('test-uuid', { firstName: 'X' })).rejects.toThrow('Service error');
    });
  });

  describe('uploadAvatar', () => {
    const validFile = {
      originalname: 'avatar.png',
      mimetype: 'image/png',
      size: 1024 * 1024,
      buffer: Buffer.from('fake-image-data'),
    } as Express.Multer.File;

    it('should upload avatar and return updated profile', async () => {
      const mockUpload = jest.fn().mockResolvedValue({ error: null });
      const mockGetPublicUrl = jest.fn().mockReturnValue({ data: { publicUrl: 'https://storage.example.com/avatars/test-uuid.png' } });
      mockSupabaseAdmin.storage.from.mockReturnValue({ upload: mockUpload, getPublicUrl: mockGetPublicUrl });
      mockAuthService.updateProfile.mockResolvedValue({ ...mockProfile, avatarUrl: 'https://storage.example.com/avatars/test-uuid.png' });
      mockAuthService.mapProfileToResponse.mockReturnValue({ ...mockProfileResponse, avatarUrl: 'https://storage.example.com/avatars/test-uuid.png' });

      const result = await controller.uploadAvatar('test-uuid', validFile);
      expect(mockSupabaseAdmin.storage.from).toHaveBeenCalledWith('project-files');
      expect(result.avatarUrl).toBe('https://storage.example.com/avatars/test-uuid.png');
    });

    it('should throw BadRequestException when no file', async () => {
      await expect(controller.uploadAvatar('test-uuid', undefined as any)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid mimetype', async () => {
      const invalidFile = { ...validFile, mimetype: 'application/pdf' } as Express.Multer.File;
      await expect(controller.uploadAvatar('test-uuid', invalidFile)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when file exceeds 2MB', async () => {
      const largeFile = { ...validFile, size: 3 * 1024 * 1024 } as Express.Multer.File;
      await expect(controller.uploadAvatar('test-uuid', largeFile)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when upload fails', async () => {
      const mockUpload = jest.fn().mockResolvedValue({ error: { message: 'Storage error' } });
      mockSupabaseAdmin.storage.from.mockReturnValue({ upload: mockUpload });
      await expect(controller.uploadAvatar('test-uuid', validFile)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getAllUsers', () => {
    it('should return all users mapped to response format', async () => {
      const profiles = [mockProfile, { ...mockProfile, id: 'uuid-2' }];
      mockAuthService.findAllProfiles.mockResolvedValue(profiles);
      mockAuthService.mapProfileToResponse.mockReturnValueOnce(mockProfileResponse).mockReturnValueOnce({ ...mockProfileResponse, id: 'uuid-2' });

      const result = await controller.getAllUsers('org-uuid');
      expect(result).toHaveLength(2);
      expect(mockAuthService.findAllProfiles).toHaveBeenCalledWith('org-uuid');
    });

    it('should return empty array when no users', async () => {
      mockAuthService.findAllProfiles.mockResolvedValue([]);
      const result = await controller.getAllUsers('org-uuid');
      expect(result).toEqual([]);
    });
  });

  describe('getUserById', () => {
    it('should return user mapped to response', async () => {
      mockAuthService.findProfileById.mockResolvedValue(mockProfile);
      mockAuthService.mapProfileToResponse.mockReturnValue(mockProfileResponse);
      const result = await controller.getUserById('test-uuid', 'org-uuid');
      expect(result).toEqual(mockProfileResponse);
      expect(mockAuthService.findProfileById).toHaveBeenCalledWith('test-uuid', 'org-uuid');
    });

    it('should propagate not found error', async () => {
      mockAuthService.findProfileById.mockRejectedValue(new Error('User not found'));
      await expect(controller.getUserById('non-existent', 'org-uuid')).rejects.toThrow('User not found');
    });
  });

  describe('updateUser', () => {
    it('should update user and return response', async () => {
      const updateDto = { firstName: 'Admin', role: UserRole.MANAGER };
      mockAuthService.findProfileById.mockResolvedValue(mockProfile);
      mockAuthService.updateProfile.mockResolvedValue({ ...mockProfile, ...updateDto });
      mockAuthService.mapProfileToResponse.mockReturnValue({ ...mockProfileResponse, ...updateDto });

      const result = await controller.updateUser('target-uuid', updateDto as any, 'org-uuid');
      expect(mockAuthService.findProfileById).toHaveBeenCalledWith('target-uuid', 'org-uuid');
      expect(mockAuthService.updateProfile).toHaveBeenCalledWith('target-uuid', updateDto);
      expect(result.role).toBe(UserRole.MANAGER);
    });

    it('should propagate errors', async () => {
      mockAuthService.findProfileById.mockRejectedValue(new Error('Not found'));
      await expect(controller.updateUser('x', {} as any, 'org-uuid')).rejects.toThrow('Not found');
    });
  });

  describe('deactivateUser', () => {
    it('should deactivate user and return message', async () => {
      mockAuthService.deactivateUser.mockResolvedValue(undefined);
      const result = await controller.deactivateUser('target-uuid', 'admin-uuid', 'org-uuid');
      expect(result).toEqual({ message: 'ユーザーを無効化しました' });
      expect(mockAuthService.deactivateUser).toHaveBeenCalledWith('target-uuid', 'admin-uuid', 'org-uuid');
    });

    it('should propagate self-deactivation error', async () => {
      mockAuthService.deactivateUser.mockRejectedValue(new Error('Cannot deactivate self'));
      await expect(controller.deactivateUser('uid', 'uid', 'org-uuid')).rejects.toThrow('Cannot deactivate self');
    });
  });

  describe('activateUser', () => {
    it('should activate user and return message', async () => {
      mockAuthService.activateUser.mockResolvedValue(undefined);
      const result = await controller.activateUser('target-uuid', 'org-uuid');
      expect(result).toEqual({ message: 'ユーザーを有効化しました' });
      expect(mockAuthService.activateUser).toHaveBeenCalledWith('target-uuid', 'org-uuid');
    });

    it('should propagate not found error', async () => {
      mockAuthService.activateUser.mockRejectedValue(new Error('User not found'));
      await expect(controller.activateUser('x', 'org-uuid')).rejects.toThrow('User not found');
    });
  });
});
