import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { PartnerService } from './partner.service';
import { Partner } from './entities/partner.entity';
import { Project } from '../project/entities/project.entity';
import { UserProfile } from '../auth/entities/user-profile.entity';
import { EmailService } from '../notification/services/email.service';
import { PartnerInvitationService } from './services/partner-invitation.service';
import { PartnerReportTokenService } from '../partner-report/services/partner-report-token.service';
import { PartnerStatus, PartnerType } from './enums/partner-status.enum';
import { ResourceNotFoundException } from '../../common/exceptions/resource-not-found.exception';
import { ConflictException } from '../../common/exceptions/business.exception';

describe('PartnerService', () => {
  let service: PartnerService;
  let repository: Repository<Partner>;

  const mockPartner: Partial<Partner> = {
    id: 'test-partner-uuid',
    name: 'Test Partner',
    email: 'partner@example.com',
    phone: '1234567890',
    companyName: 'Test Company',
    type: PartnerType.COMPANY,
    status: PartnerStatus.ACTIVE,
    description: 'Test description',
    skills: ['TypeScript', 'NestJS'],
    rating: 4.5,
    totalProjects: 10,
    completedProjects: 8,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
    softRemove: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      andWhere: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[mockPartner], 1]),
      getMany: jest.fn().mockResolvedValue([mockPartner]),
      select: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ avg: '4.5' }),
    })),
  };

  const mockProjectRepository = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
  };

  const mockUserProfileRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockEmailService = {
    sendPartnerWelcomeEmail: jest.fn().mockResolvedValue(undefined),
    sendPartnerInvitationEmail: jest.fn().mockResolvedValue(undefined),
    sendReportUrlEmail: jest.fn().mockResolvedValue(undefined),
    sendEmail: jest.fn().mockResolvedValue(undefined),
  };

  const mockInvitationService = {
    createInvitation: jest.fn().mockResolvedValue({ token: 'test-token' }),
    validateInvitation: jest.fn().mockResolvedValue(true),
  };

  const mockReportTokenService = {
    generateToken: jest.fn().mockResolvedValue('test-report-token'),
    validateToken: jest.fn().mockResolvedValue(true),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('http://localhost:3000'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PartnerService,
        {
          provide: getRepositoryToken(Partner),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Project),
          useValue: mockProjectRepository,
        },
        {
          provide: getRepositoryToken(UserProfile),
          useValue: mockUserProfileRepository,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: PartnerInvitationService,
          useValue: mockInvitationService,
        },
        {
          provide: PartnerReportTokenService,
          useValue: mockReportTokenService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<PartnerService>(PartnerService);
    repository = module.get<Repository<Partner>>(getRepositoryToken(Partner));

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto = {
      name: 'New Partner',
      email: 'newpartner@example.com',
      phone: '9876543210',
    };

    it('should create a partner successfully', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue({ ...mockPartner, ...createDto });
      mockRepository.save.mockResolvedValue({ ...mockPartner, ...createDto });

      const result = await service.create(createDto, 'user-uuid');

      expect(result).toBeDefined();
      expect(mockRepository.create).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if email already exists', async () => {
      mockRepository.findOne.mockResolvedValue(mockPartner);

      await expect(service.create(createDto, 'user-uuid')).rejects.toThrow(ConflictException);
    });
  });

  describe('findOne', () => {
    it('should return a partner when found', async () => {
      mockRepository.findOne.mockResolvedValue(mockPartner);

      const result = await service.findOne('test-partner-uuid');

      expect(result).toEqual(mockPartner);
    });

    it('should throw ResourceNotFoundException when partner not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent-uuid')).rejects.toThrow(ResourceNotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return paginated partners', async () => {
      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });
  });

  describe('update', () => {
    it('should update a partner successfully', async () => {
      mockRepository.findOne.mockResolvedValue(mockPartner);
      mockRepository.save.mockResolvedValue({
        ...mockPartner,
        name: 'Updated Name',
      });

      const result = await service.update('test-partner-uuid', {
        name: 'Updated Name',
      });

      expect(result.name).toBe('Updated Name');
    });
  });

  describe('updateStatus', () => {
    it('should update partner status', async () => {
      mockRepository.findOne.mockResolvedValue(mockPartner);
      mockRepository.save.mockResolvedValue({
        ...mockPartner,
        status: PartnerStatus.INACTIVE,
      });

      const result = await service.updateStatus('test-partner-uuid', PartnerStatus.INACTIVE);

      expect(result.status).toBe(PartnerStatus.INACTIVE);
    });
  });

  describe('remove', () => {
    it('should delete a partner', async () => {
      mockRepository.findOne.mockResolvedValue(mockPartner);

      await service.remove('test-partner-uuid');

      expect(mockRepository.softRemove).toHaveBeenCalledWith(mockPartner);
    });
  });

  describe('getPartnerStatistics', () => {
    it('should return partner statistics', async () => {
      mockRepository.count
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(70)
        .mockResolvedValueOnce(20)
        .mockResolvedValueOnce(10);

      const result = await service.getPartnerStatistics();

      expect(result.total).toBe(100);
      expect(result.active).toBe(70);
      expect(result.inactive).toBe(20);
      expect(result.pending).toBe(10);
    });
  });
});
