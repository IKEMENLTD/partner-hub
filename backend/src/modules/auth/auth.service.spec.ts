import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthService } from './auth.service';
import { UserProfile } from './entities/user-profile.entity';
import { UserRole } from './enums/user-role.enum';
import { ResourceNotFoundException } from '../../common/exceptions/resource-not-found.exception';
import { BusinessException } from '../../common/exceptions/business.exception';
import { UserProfileCacheService } from '../../common/services/user-profile-cache.service';

describe('AuthService', () => {
  let service: AuthService;
  let profileRepository: Repository<UserProfile>;

  const mockProfile: Partial<UserProfile> = {
    id: 'test-uuid',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: UserRole.MEMBER,
    isActive: true,
    avatarUrl: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: undefined,
  };

  const mockProfileRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(UserProfile),
          useValue: mockProfileRepository,
        },
        UserProfileCacheService,
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    profileRepository = module.get<Repository<UserProfile>>(getRepositoryToken(UserProfile));

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findProfileById', () => {
    it('should return profile when found', async () => {
      mockProfileRepository.findOne.mockResolvedValue(mockProfile);

      const result = await service.findProfileById('test-uuid');

      expect(result).toEqual(mockProfile);
      expect(mockProfileRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'test-uuid' },
      });
    });

    it('should throw ResourceNotFoundException when profile not found', async () => {
      mockProfileRepository.findOne.mockResolvedValue(null);

      await expect(service.findProfileById('non-existent')).rejects.toThrow(ResourceNotFoundException);
    });
  });

  describe('findAllProfiles', () => {
    it('should return all profiles', async () => {
      mockProfileRepository.find.mockResolvedValue([mockProfile]);

      const result = await service.findAllProfiles();

      expect(result).toEqual([mockProfile]);
      expect(mockProfileRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('updateProfile', () => {
    const updateDto = {
      firstName: 'Updated',
      lastName: 'Name',
    };

    it('should successfully update profile', async () => {
      mockProfileRepository.findOne.mockResolvedValue({ ...mockProfile });
      mockProfileRepository.save.mockResolvedValue({
        ...mockProfile,
        ...updateDto,
      });

      const result = await service.updateProfile('test-uuid', updateDto);

      expect(result.firstName).toBe('Updated');
      expect(result.lastName).toBe('Name');
      expect(mockProfileRepository.save).toHaveBeenCalled();
    });

    it('should throw ResourceNotFoundException if profile not found', async () => {
      mockProfileRepository.findOne.mockResolvedValue(null);

      await expect(service.updateProfile('non-existent', updateDto)).rejects.toThrow(
        ResourceNotFoundException,
      );
    });
  });

  describe('updateUserRole', () => {
    it('should successfully update user role', async () => {
      mockProfileRepository.findOne.mockResolvedValue({ ...mockProfile });
      mockProfileRepository.save.mockResolvedValue({
        ...mockProfile,
        role: UserRole.ADMIN,
      });

      const result = await service.updateUserRole('test-uuid', UserRole.ADMIN);

      expect(result.role).toBe(UserRole.ADMIN);
      expect(mockProfileRepository.save).toHaveBeenCalled();
    });

    it('should throw ResourceNotFoundException if profile not found', async () => {
      mockProfileRepository.findOne.mockResolvedValue(null);

      await expect(service.updateUserRole('non-existent', UserRole.ADMIN)).rejects.toThrow(
        ResourceNotFoundException,
      );
    });
  });

  describe('deactivateUser', () => {
    it('should successfully deactivate user', async () => {
      mockProfileRepository.findOne.mockResolvedValue({ ...mockProfile });
      mockProfileRepository.save.mockResolvedValue({
        ...mockProfile,
        isActive: false,
      });

      await service.deactivateUser('test-uuid');

      expect(mockProfileRepository.save).toHaveBeenCalled();
    });

    it('should throw BusinessException when trying to deactivate own account', async () => {
      await expect(service.deactivateUser('test-uuid', 'test-uuid')).rejects.toThrow(
        BusinessException,
      );
    });

    it('should throw ResourceNotFoundException if profile not found', async () => {
      mockProfileRepository.findOne.mockResolvedValue(null);

      await expect(service.deactivateUser('non-existent')).rejects.toThrow(ResourceNotFoundException);
    });
  });

  describe('activateUser', () => {
    it('should successfully activate user', async () => {
      mockProfileRepository.findOne.mockResolvedValue({
        ...mockProfile,
        isActive: false,
      });
      mockProfileRepository.save.mockResolvedValue({
        ...mockProfile,
        isActive: true,
      });

      await service.activateUser('test-uuid');

      expect(mockProfileRepository.save).toHaveBeenCalled();
    });

    it('should throw ResourceNotFoundException if profile not found', async () => {
      mockProfileRepository.findOne.mockResolvedValue(null);

      await expect(service.activateUser('non-existent')).rejects.toThrow(ResourceNotFoundException);
    });
  });

  describe('updateLastLogin', () => {
    it('should update last login timestamp', async () => {
      mockProfileRepository.update.mockResolvedValue({ affected: 1 });

      await service.updateLastLogin('test-uuid');

      expect(mockProfileRepository.update).toHaveBeenCalledWith('test-uuid', {
        lastLoginAt: expect.any(Date),
      });
    });
  });

  describe('syncProfile', () => {
    it('should create new profile if not exists', async () => {
      mockProfileRepository.findOne.mockResolvedValue(null);
      mockProfileRepository.create.mockReturnValue({
        id: 'new-uuid',
        email: 'new@example.com',
        firstName: 'New',
        lastName: 'User',
      });
      mockProfileRepository.save.mockResolvedValue({
        id: 'new-uuid',
        email: 'new@example.com',
        firstName: 'New',
        lastName: 'User',
      });

      const result = await service.syncProfile('new-uuid', 'new@example.com', {
        firstName: 'New',
        lastName: 'User',
      });

      expect(mockProfileRepository.create).toHaveBeenCalled();
      expect(mockProfileRepository.save).toHaveBeenCalled();
      expect(result.email).toBe('new@example.com');
    });

    it('should update existing profile', async () => {
      mockProfileRepository.findOne.mockResolvedValue({ ...mockProfile });
      mockProfileRepository.save.mockResolvedValue({
        ...mockProfile,
        email: 'updated@example.com',
      });

      const result = await service.syncProfile('test-uuid', 'updated@example.com');

      expect(mockProfileRepository.save).toHaveBeenCalled();
      expect(result.email).toBe('updated@example.com');
    });
  });

  describe('mapProfileToResponse', () => {
    it('should map profile to response format', () => {
      const profile = mockProfile as UserProfile;

      const result = service.mapProfileToResponse(profile);

      expect(result).toEqual({
        id: profile.id,
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
        role: profile.role,
        isActive: profile.isActive,
        avatarUrl: profile.avatarUrl,
        createdAt: profile.createdAt,
      });
    });
  });
});
