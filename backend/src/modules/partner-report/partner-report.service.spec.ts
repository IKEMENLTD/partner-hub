import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { PartnerReportService } from './services/partner-report.service';
import { PartnerReportTokenService } from './services/partner-report-token.service';
import { ReportReminderService } from './services/report-reminder.service';
import { PartnerReport, ReportType, ProgressStatus, ReportSource } from './entities/partner-report.entity';
import { PartnerReportToken } from './entities/partner-report-token.entity';
import { ReportRequest, RequestStatus } from './entities/report-request.entity';
import { ReportSchedule, ScheduleFrequency } from './entities/report-schedule.entity';
import { UserProfile } from '../auth/entities/user-profile.entity';
import { Partner } from '../partner/entities/partner.entity';
import { EmailService } from '../notification/services/email.service';
import { ResourceNotFoundException } from '../../common/exceptions/resource-not-found.exception';
import { CreateReportDto } from './dto/create-report.dto';
import { QueryReportDto } from './dto/query-report.dto';

// =============================================
// Helper: mock repository factory
// =============================================
const createMockRepository = () => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findAndCount: jest.fn(),
  update: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const createMockQueryBuilder = (overrides: Record<string, any> = {}) => {
  const qb: Record<string, jest.Mock> = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ affected: 1 }),
    getOne: jest.fn().mockResolvedValue(null),
    getCount: jest.fn().mockResolvedValue(0),
    ...overrides,
  };
  // Make sure chaining returns itself
  for (const key of Object.keys(qb)) {
    if (!['getOne', 'getCount', 'execute'].includes(key)) {
      qb[key].mockReturnThis();
    }
  }
  return qb;
};

// =============================================
// Shared test data
// =============================================
const now = new Date('2026-02-12T00:00:00Z');
const partnerId = 'partner-uuid-1';
const projectId = 'project-uuid-1';
const taskId = 'task-uuid-1';
const userId = 'user-uuid-1';
const orgId = 'org-uuid-1';
const reportId = 'report-uuid-1';
const tokenId = 'token-uuid-1';
const requestId = 'request-uuid-1';
const scheduleId = 'schedule-uuid-1';
const tokenString = 'a'.repeat(64);

const mockPartner: Partial<Partner> = {
  id: partnerId,
  name: 'Test Partner',
  email: 'partner@example.com',
  organizationId: orgId,
};

const mockUser: Partial<UserProfile> = {
  id: userId,
  organizationId: orgId,
};

const mockReport: Partial<PartnerReport> = {
  id: reportId,
  partnerId,
  organizationId: orgId,
  projectId: null,
  taskId: null,
  reportType: ReportType.PROGRESS,
  progressStatus: ProgressStatus.ON_TRACK,
  content: 'Test content',
  weeklyAccomplishments: null,
  nextWeekPlan: null,
  attachments: [],
  metadata: {},
  source: ReportSource.WEB_FORM,
  sourceReference: null,
  isRead: false,
  readAt: null,
  readById: null,
  createdAt: now,
};

const mockToken: Partial<PartnerReportToken> = {
  id: tokenId,
  partnerId,
  projectId: null,
  token: tokenString,
  expiresAt: new Date('2026-05-12T00:00:00Z'),
  isActive: true,
  organizationId: orgId,
  createdAt: now,
};

const mockRequest: Partial<ReportRequest> = {
  id: requestId,
  partnerId,
  organizationId: orgId,
  projectId: null,
  status: RequestStatus.PENDING,
  escalationLevel: 0,
  reminderCount: 0,
  lastReminderAt: null,
  deadlineAt: new Date('2026-02-10T00:00:00Z'), // 2 days overdue from now
  createdAt: now,
  partner: mockPartner as Partner,
};

const mockSchedule: Partial<ReportSchedule> = {
  id: scheduleId,
  name: 'Weekly Report',
  partnerId,
  projectId: null,
  organizationId: orgId,
  frequency: ScheduleFrequency.WEEKLY,
  dayOfWeek: 1,
  dayOfMonth: null,
  timeOfDay: '09:00:00',
  deadlineDays: 3,
  isActive: true,
  lastSentAt: null,
  nextSendAt: new Date('2026-02-11T00:00:00Z'),
  partner: mockPartner as Partner,
};

// ======================================================================
// PartnerReportService Tests
// ======================================================================

describe('PartnerReportService', () => {
  let service: PartnerReportService;
  let reportRepo: ReturnType<typeof createMockRepository>;
  let userProfileRepo: ReturnType<typeof createMockRepository>;
  let requestRepo: ReturnType<typeof createMockRepository>;

  beforeEach(async () => {
    reportRepo = createMockRepository();
    userProfileRepo = createMockRepository();
    requestRepo = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PartnerReportService,
        { provide: getRepositoryToken(PartnerReport), useValue: reportRepo },
        { provide: getRepositoryToken(UserProfile), useValue: userProfileRepo },
        { provide: getRepositoryToken(ReportRequest), useValue: requestRepo },
      ],
    }).compile();

    service = module.get<PartnerReportService>(PartnerReportService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // =============================================
  // createFromPartner
  // =============================================

  describe('createFromPartner', () => {
    const dto: CreateReportDto = {
      reportType: ReportType.PROGRESS,
      progressStatus: ProgressStatus.ON_TRACK,
      content: 'All good',
    };

    it('should create a report from a partner with full dto', async () => {
      const created = { ...mockReport, content: 'All good' };
      reportRepo.create.mockReturnValue(created);
      reportRepo.save.mockResolvedValue(created);
      requestRepo.findOne.mockResolvedValue(null);

      const result = await service.createFromPartner(partnerId, orgId, dto);

      expect(reportRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          partnerId,
          organizationId: orgId,
          reportType: ReportType.PROGRESS,
          progressStatus: ProgressStatus.ON_TRACK,
          content: 'All good',
        }),
      );
      expect(reportRepo.save).toHaveBeenCalledWith(created);
      expect(result).toEqual(created);
    });

    it('should use weeklyAccomplishments as content when content is not provided', async () => {
      const dtoNoContent: CreateReportDto = {
        reportType: ReportType.PROGRESS,
        weeklyAccomplishments: 'Did some work',
      };
      const created = { ...mockReport, content: 'Did some work', weeklyAccomplishments: 'Did some work' };
      reportRepo.create.mockReturnValue(created);
      reportRepo.save.mockResolvedValue(created);
      requestRepo.findOne.mockResolvedValue(null);

      await service.createFromPartner(partnerId, orgId, dtoNoContent);

      expect(reportRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Did some work',
          weeklyAccomplishments: 'Did some work',
        }),
      );
    });

    it('should keep content null when neither content nor weeklyAccomplishments are provided', async () => {
      const minimalDto: CreateReportDto = {
        reportType: ReportType.GENERAL,
      };
      reportRepo.create.mockReturnValue({ ...mockReport, content: null });
      reportRepo.save.mockResolvedValue({ ...mockReport, content: null });
      requestRepo.findOne.mockResolvedValue(null);

      await service.createFromPartner(partnerId, orgId, minimalDto);

      expect(reportRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          content: null,
          weeklyAccomplishments: null,
        }),
      );
    });

    it('should pass custom source and sourceReference', async () => {
      const created = { ...mockReport, source: ReportSource.EMAIL, sourceReference: 'email-id-123' };
      reportRepo.create.mockReturnValue(created);
      reportRepo.save.mockResolvedValue(created);
      requestRepo.findOne.mockResolvedValue(null);

      await service.createFromPartner(partnerId, orgId, dto, ReportSource.EMAIL, 'email-id-123');

      expect(reportRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          source: ReportSource.EMAIL,
          sourceReference: 'email-id-123',
        }),
      );
    });

    it('should default source to WEB_FORM when not specified', async () => {
      reportRepo.create.mockReturnValue(mockReport);
      reportRepo.save.mockResolvedValue(mockReport);
      requestRepo.findOne.mockResolvedValue(null);

      await service.createFromPartner(partnerId, orgId, dto);

      expect(reportRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          source: ReportSource.WEB_FORM,
          sourceReference: null,
        }),
      );
    });

    it('should mark pending report requests as submitted after creating a report', async () => {
      const pendingRequest = { ...mockRequest, id: 'req-pending', status: RequestStatus.PENDING };
      reportRepo.create.mockReturnValue(mockReport);
      reportRepo.save.mockResolvedValue(mockReport);
      requestRepo.findOne
        .mockResolvedValueOnce(pendingRequest) // first call: PENDING
        .mockResolvedValueOnce(null);           // second call: OVERDUE
      requestRepo.save.mockResolvedValue(pendingRequest);

      await service.createFromPartner(partnerId, orgId, dto);

      expect(requestRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { partnerId, status: RequestStatus.PENDING },
        }),
      );
      expect(requestRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: RequestStatus.SUBMITTED,
          reportId: reportId,
        }),
      );
    });

    it('should mark overdue report requests as submitted after creating a report', async () => {
      const overdueRequest = { ...mockRequest, id: 'req-overdue', status: RequestStatus.OVERDUE };
      reportRepo.create.mockReturnValue(mockReport);
      reportRepo.save.mockResolvedValue(mockReport);
      requestRepo.findOne
        .mockResolvedValueOnce(null)           // first call: PENDING
        .mockResolvedValueOnce(overdueRequest); // second call: OVERDUE
      requestRepo.save.mockResolvedValue(overdueRequest);

      await service.createFromPartner(partnerId, orgId, dto);

      expect(requestRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { partnerId, status: RequestStatus.OVERDUE },
        }),
      );
      expect(requestRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: RequestStatus.SUBMITTED,
          reportId: reportId,
        }),
      );
    });

    it('should handle no pending or overdue requests gracefully', async () => {
      reportRepo.create.mockReturnValue(mockReport);
      reportRepo.save.mockResolvedValue(mockReport);
      requestRepo.findOne.mockResolvedValue(null);

      const result = await service.createFromPartner(partnerId, orgId, dto);

      expect(result).toEqual(mockReport);
      expect(requestRepo.save).not.toHaveBeenCalled();
    });

    it('should set projectId and taskId when provided in dto', async () => {
      const fullDto: CreateReportDto = {
        reportType: ReportType.PROGRESS,
        projectId,
        taskId,
        content: 'Full report',
      };
      const created = { ...mockReport, projectId, taskId, content: 'Full report' };
      reportRepo.create.mockReturnValue(created);
      reportRepo.save.mockResolvedValue(created);
      requestRepo.findOne.mockResolvedValue(null);

      await service.createFromPartner(partnerId, orgId, fullDto);

      expect(reportRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId,
          taskId,
        }),
      );
    });

    it('should set attachments and metadata when provided', async () => {
      const dtoWithExtras: CreateReportDto = {
        reportType: ReportType.PROGRESS,
        content: 'Report',
        attachments: ['file1.pdf', 'file2.pdf'],
        metadata: { progressPercentage: 75 },
      };
      reportRepo.create.mockReturnValue(mockReport);
      reportRepo.save.mockResolvedValue(mockReport);
      requestRepo.findOne.mockResolvedValue(null);

      await service.createFromPartner(partnerId, orgId, dtoWithExtras);

      expect(reportRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          attachments: ['file1.pdf', 'file2.pdf'],
          metadata: { progressPercentage: 75 },
        }),
      );
    });

    it('should default attachments to empty array and metadata to empty object', async () => {
      reportRepo.create.mockReturnValue(mockReport);
      reportRepo.save.mockResolvedValue(mockReport);
      requestRepo.findOne.mockResolvedValue(null);

      await service.createFromPartner(partnerId, orgId, dto);

      expect(reportRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          attachments: [],
          metadata: {},
        }),
      );
    });

    it('should handle null organizationId', async () => {
      reportRepo.create.mockReturnValue({ ...mockReport, organizationId: null });
      reportRepo.save.mockResolvedValue({ ...mockReport, organizationId: null });
      requestRepo.findOne.mockResolvedValue(null);

      await service.createFromPartner(partnerId, null, dto);

      expect(reportRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ organizationId: null }),
      );
    });
  });

  // =============================================
  // findAll
  // =============================================

  describe('findAll', () => {
    it('should return paginated results with default options', async () => {
      reportRepo.findAndCount.mockResolvedValue([[mockReport], 1]);

      const result = await service.findAll({} as QueryReportDto);

      expect(reportRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
          relations: ['partner', 'project'],
          order: { createdAt: 'DESC' },
          skip: 0,
          take: 20,
        }),
      );
      expect(result.data).toEqual([mockReport]);
      expect(result.pagination.total).toBe(1);
    });

    it('should apply pagination correctly', async () => {
      reportRepo.findAndCount.mockResolvedValue([[], 100]);

      const result = await service.findAll({ page: 3, limit: 10 } as QueryReportDto);

      expect(reportRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        }),
      );
    });

    it('should filter by partnerId', async () => {
      reportRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ partnerId } as QueryReportDto);

      const callArgs = reportRepo.findAndCount.mock.calls[0][0];
      expect(callArgs.where.partnerId).toBe(partnerId);
    });

    it('should filter by projectId', async () => {
      reportRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ projectId } as QueryReportDto);

      const callArgs = reportRepo.findAndCount.mock.calls[0][0];
      expect(callArgs.where.projectId).toBe(projectId);
    });

    it('should filter by reportType', async () => {
      reportRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ reportType: ReportType.ISSUE } as QueryReportDto);

      const callArgs = reportRepo.findAndCount.mock.calls[0][0];
      expect(callArgs.where.reportType).toBe(ReportType.ISSUE);
    });

    it('should filter by source', async () => {
      reportRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ source: ReportSource.EMAIL } as QueryReportDto);

      const callArgs = reportRepo.findAndCount.mock.calls[0][0];
      expect(callArgs.where.source).toBe(ReportSource.EMAIL);
    });

    it('should filter by unreadOnly', async () => {
      reportRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ unreadOnly: true } as QueryReportDto);

      const callArgs = reportRepo.findAndCount.mock.calls[0][0];
      expect(callArgs.where.isRead).toBe(false);
    });

    it('should apply organization filter when userId is provided', async () => {
      userProfileRepo.findOne.mockResolvedValue(mockUser);
      reportRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({} as QueryReportDto, userId);

      const callArgs = reportRepo.findAndCount.mock.calls[0][0];
      expect(callArgs.where.organizationId).toBe(orgId);
    });

    it('should not apply organization filter when user has no organizationId', async () => {
      userProfileRepo.findOne.mockResolvedValue({ id: userId, organizationId: null });
      reportRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({} as QueryReportDto, userId);

      const callArgs = reportRepo.findAndCount.mock.calls[0][0];
      expect(callArgs.where.organizationId).toBeUndefined();
    });

    it('should not apply organization filter when user is not found', async () => {
      userProfileRepo.findOne.mockResolvedValue(null);
      reportRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({} as QueryReportDto, userId);

      const callArgs = reportRepo.findAndCount.mock.calls[0][0];
      expect(callArgs.where.organizationId).toBeUndefined();
    });

    it('should apply all filters simultaneously', async () => {
      userProfileRepo.findOne.mockResolvedValue(mockUser);
      reportRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll(
        {
          page: 2,
          limit: 5,
          partnerId,
          projectId,
          reportType: ReportType.PROGRESS,
          source: ReportSource.WEB_FORM,
          unreadOnly: true,
        } as QueryReportDto,
        userId,
      );

      const callArgs = reportRepo.findAndCount.mock.calls[0][0];
      expect(callArgs.where.organizationId).toBe(orgId);
      expect(callArgs.where.partnerId).toBe(partnerId);
      expect(callArgs.where.projectId).toBe(projectId);
      expect(callArgs.where.reportType).toBe(ReportType.PROGRESS);
      expect(callArgs.where.source).toBe(ReportSource.WEB_FORM);
      expect(callArgs.where.isRead).toBe(false);
      expect(callArgs.skip).toBe(5);
      expect(callArgs.take).toBe(5);
    });

    it('should return empty data array when no reports found', async () => {
      reportRepo.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAll({} as QueryReportDto);

      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });
  });

  // =============================================
  // findOne
  // =============================================

  describe('findOne', () => {
    it('should return a report by id', async () => {
      reportRepo.findOne.mockResolvedValue(mockReport);

      const result = await service.findOne(reportId);

      expect(reportRepo.findOne).toHaveBeenCalledWith({
        where: { id: reportId },
        relations: ['partner', 'project'],
      });
      expect(result).toEqual(mockReport);
    });

    it('should apply organization filter when userId is provided', async () => {
      userProfileRepo.findOne.mockResolvedValue(mockUser);
      reportRepo.findOne.mockResolvedValue(mockReport);

      await service.findOne(reportId, userId);

      expect(reportRepo.findOne).toHaveBeenCalledWith({
        where: { id: reportId, organizationId: orgId },
        relations: ['partner', 'project'],
      });
    });

    it('should throw ResourceNotFoundException when report is not found', async () => {
      reportRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('nonexistent-id')).rejects.toThrow(
        ResourceNotFoundException,
      );
    });

    it('should not apply organization filter when user has no org', async () => {
      userProfileRepo.findOne.mockResolvedValue({ id: userId, organizationId: null });
      reportRepo.findOne.mockResolvedValue(mockReport);

      await service.findOne(reportId, userId);

      expect(reportRepo.findOne).toHaveBeenCalledWith({
        where: { id: reportId },
        relations: ['partner', 'project'],
      });
    });
  });

  // =============================================
  // markAsRead
  // =============================================

  describe('markAsRead', () => {
    it('should mark an unread report as read', async () => {
      const unreadReport = { ...mockReport, isRead: false, readAt: null, readById: null };
      reportRepo.findOne.mockResolvedValue(unreadReport);
      reportRepo.save.mockResolvedValue({ ...unreadReport, isRead: true });

      const result = await service.markAsRead(reportId, userId);

      expect(reportRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          isRead: true,
          readById: userId,
        }),
      );
      // readAt should be set to a Date
      const savedArg = reportRepo.save.mock.calls[0][0];
      expect(savedArg.readAt).toBeInstanceOf(Date);
    });

    it('should not update an already read report', async () => {
      const readReport = { ...mockReport, isRead: true, readAt: now, readById: 'other-user' };
      reportRepo.findOne.mockResolvedValue(readReport);

      const result = await service.markAsRead(reportId, userId);

      expect(reportRepo.save).not.toHaveBeenCalled();
      expect(result.isRead).toBe(true);
    });

    it('should throw ResourceNotFoundException when report not found', async () => {
      reportRepo.findOne.mockResolvedValue(null);

      await expect(service.markAsRead('nonexistent-id', userId)).rejects.toThrow(
        ResourceNotFoundException,
      );
    });
  });

  // =============================================
  // markMultipleAsRead
  // =============================================

  describe('markMultipleAsRead', () => {
    it('should update multiple reports as read', async () => {
      reportRepo.update.mockResolvedValue({ affected: 3 });
      const ids = ['id-1', 'id-2', 'id-3'];

      await service.markMultipleAsRead(ids, userId);

      expect(reportRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({ id: expect.anything() }),
        expect.objectContaining({
          isRead: true,
          readById: userId,
        }),
      );
      // readAt should be a Date
      const updateData = reportRepo.update.mock.calls[0][1];
      expect(updateData.readAt).toBeInstanceOf(Date);
    });

    it('should handle empty ids array', async () => {
      reportRepo.update.mockResolvedValue({ affected: 0 });

      await service.markMultipleAsRead([], userId);

      expect(reportRepo.update).toHaveBeenCalled();
    });
  });

  // =============================================
  // getUnreadCount
  // =============================================

  describe('getUnreadCount', () => {
    it('should return unread count with organization filter', async () => {
      userProfileRepo.findOne.mockResolvedValue(mockUser);
      const qb = createMockQueryBuilder({ getCount: jest.fn().mockResolvedValue(5) });
      reportRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getUnreadCount(userId);

      expect(result).toBe(5);
      expect(qb.where).toHaveBeenCalledWith('report.is_read = false');
      expect(qb.andWhere).toHaveBeenCalledWith('report.organization_id = :orgId', {
        orgId: orgId,
      });
    });

    it('should return unread count without organization filter when user has no org', async () => {
      userProfileRepo.findOne.mockResolvedValue({ id: userId, organizationId: null });
      const qb = createMockQueryBuilder({ getCount: jest.fn().mockResolvedValue(10) });
      reportRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getUnreadCount(userId);

      expect(result).toBe(10);
      expect(qb.andWhere).not.toHaveBeenCalled();
    });

    it('should return 0 when no unread reports', async () => {
      userProfileRepo.findOne.mockResolvedValue(mockUser);
      const qb = createMockQueryBuilder({ getCount: jest.fn().mockResolvedValue(0) });
      reportRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getUnreadCount(userId);

      expect(result).toBe(0);
    });
  });

  // =============================================
  // getPartnerReportHistory
  // =============================================

  describe('getPartnerReportHistory', () => {
    it('should return partner report history with default limit', async () => {
      const reports = [mockReport, { ...mockReport, id: 'report-2' }];
      reportRepo.find.mockResolvedValue(reports);

      const result = await service.getPartnerReportHistory(partnerId);

      expect(reportRepo.find).toHaveBeenCalledWith({
        where: { partnerId },
        relations: ['project', 'task'],
        order: { createdAt: 'DESC' },
        take: 10,
      });
      expect(result).toHaveLength(2);
    });

    it('should accept a custom limit', async () => {
      reportRepo.find.mockResolvedValue([]);

      await service.getPartnerReportHistory(partnerId, 5);

      expect(reportRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 }),
      );
    });

    it('should return empty array when no history exists', async () => {
      reportRepo.find.mockResolvedValue([]);

      const result = await service.getPartnerReportHistory(partnerId);

      expect(result).toEqual([]);
    });
  });
});

// ======================================================================
// PartnerReportTokenService Tests
// ======================================================================

describe('PartnerReportTokenService', () => {
  let service: PartnerReportTokenService;
  let tokenRepo: ReturnType<typeof createMockRepository>;
  let partnerRepo: ReturnType<typeof createMockRepository>;

  beforeEach(async () => {
    tokenRepo = createMockRepository();
    partnerRepo = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PartnerReportTokenService,
        { provide: getRepositoryToken(PartnerReportToken), useValue: tokenRepo },
        { provide: getRepositoryToken(Partner), useValue: partnerRepo },
      ],
    }).compile();

    service = module.get<PartnerReportTokenService>(PartnerReportTokenService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // =============================================
  // generateToken
  // =============================================

  describe('generateToken', () => {
    it('should return existing active token if one exists', async () => {
      partnerRepo.findOne.mockResolvedValue(mockPartner);
      const qb = createMockQueryBuilder({ getOne: jest.fn().mockResolvedValue(mockToken) });
      tokenRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.generateToken(partnerId);

      expect(result).toEqual(mockToken);
      expect(tokenRepo.create).not.toHaveBeenCalled();
      expect(tokenRepo.save).not.toHaveBeenCalled();
    });

    it('should create a new token when no active token exists', async () => {
      partnerRepo.findOne.mockResolvedValue(mockPartner);
      const qb = createMockQueryBuilder({ getOne: jest.fn().mockResolvedValue(null) });
      tokenRepo.createQueryBuilder.mockReturnValue(qb);
      tokenRepo.create.mockReturnValue(mockToken);
      tokenRepo.save.mockResolvedValue(mockToken);

      const result = await service.generateToken(partnerId);

      expect(tokenRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          partnerId,
          projectId: null,
          organizationId: orgId,
        }),
      );
      expect(tokenRepo.save).toHaveBeenCalled();
      expect(result).toEqual(mockToken);
    });

    it('should throw ResourceNotFoundException when partner not found', async () => {
      partnerRepo.findOne.mockResolvedValue(null);

      await expect(service.generateToken('nonexistent-partner')).rejects.toThrow(
        ResourceNotFoundException,
      );
    });

    it('should use custom expiresInDays when specified', async () => {
      partnerRepo.findOne.mockResolvedValue(mockPartner);
      const qb = createMockQueryBuilder({ getOne: jest.fn().mockResolvedValue(null) });
      tokenRepo.createQueryBuilder.mockReturnValue(qb);
      tokenRepo.create.mockReturnValue(mockToken);
      tokenRepo.save.mockResolvedValue(mockToken);

      await service.generateToken(partnerId, undefined, 30);

      const createArgs = tokenRepo.create.mock.calls[0][0];
      // The expiry should be roughly 30 days from now
      const expectedMinExpiry = Date.now() + 29 * 24 * 60 * 60 * 1000;
      const expectedMaxExpiry = Date.now() + 31 * 24 * 60 * 60 * 1000;
      expect(createArgs.expiresAt.getTime()).toBeGreaterThan(expectedMinExpiry);
      expect(createArgs.expiresAt.getTime()).toBeLessThan(expectedMaxExpiry);
    });

    it('should default to 90 days expiry when expiresInDays not specified', async () => {
      partnerRepo.findOne.mockResolvedValue(mockPartner);
      const qb = createMockQueryBuilder({ getOne: jest.fn().mockResolvedValue(null) });
      tokenRepo.createQueryBuilder.mockReturnValue(qb);
      tokenRepo.create.mockReturnValue(mockToken);
      tokenRepo.save.mockResolvedValue(mockToken);

      await service.generateToken(partnerId);

      const createArgs = tokenRepo.create.mock.calls[0][0];
      const expectedMinExpiry = Date.now() + 89 * 24 * 60 * 60 * 1000;
      const expectedMaxExpiry = Date.now() + 91 * 24 * 60 * 60 * 1000;
      expect(createArgs.expiresAt.getTime()).toBeGreaterThan(expectedMinExpiry);
      expect(createArgs.expiresAt.getTime()).toBeLessThan(expectedMaxExpiry);
    });

    it('should filter by projectId when provided', async () => {
      partnerRepo.findOne.mockResolvedValue(mockPartner);
      const qb = createMockQueryBuilder({ getOne: jest.fn().mockResolvedValue(null) });
      tokenRepo.createQueryBuilder.mockReturnValue(qb);
      tokenRepo.create.mockReturnValue(mockToken);
      tokenRepo.save.mockResolvedValue(mockToken);

      await service.generateToken(partnerId, projectId);

      expect(qb.andWhere).toHaveBeenCalledWith('token.project_id = :projectId', { projectId });
      expect(tokenRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ projectId }),
      );
    });

    it('should filter by project_id IS NULL when projectId not provided', async () => {
      partnerRepo.findOne.mockResolvedValue(mockPartner);
      const qb = createMockQueryBuilder({ getOne: jest.fn().mockResolvedValue(null) });
      tokenRepo.createQueryBuilder.mockReturnValue(qb);
      tokenRepo.create.mockReturnValue(mockToken);
      tokenRepo.save.mockResolvedValue(mockToken);

      await service.generateToken(partnerId);

      expect(qb.andWhere).toHaveBeenCalledWith('token.project_id IS NULL');
    });

    it('should generate a 64-char hex token string', async () => {
      partnerRepo.findOne.mockResolvedValue(mockPartner);
      const qb = createMockQueryBuilder({ getOne: jest.fn().mockResolvedValue(null) });
      tokenRepo.createQueryBuilder.mockReturnValue(qb);
      tokenRepo.create.mockImplementation((data) => data);
      tokenRepo.save.mockImplementation((data) => Promise.resolve(data));

      const result = await service.generateToken(partnerId);

      // randomBytes(32).toString('hex') => 64 chars
      expect(result.token).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  // =============================================
  // getTokenByPartnerId
  // =============================================

  describe('getTokenByPartnerId', () => {
    it('should return active token for partner', async () => {
      tokenRepo.findOne.mockResolvedValue(mockToken);

      const result = await service.getTokenByPartnerId(partnerId);

      expect(tokenRepo.findOne).toHaveBeenCalledWith({
        where: { partnerId, isActive: true },
        relations: ['partner', 'project'],
      });
      expect(result).toEqual(mockToken);
    });

    it('should return null when no active token exists', async () => {
      tokenRepo.findOne.mockResolvedValue(null);

      const result = await service.getTokenByPartnerId(partnerId);

      expect(result).toBeNull();
    });
  });

  // =============================================
  // getByToken
  // =============================================

  describe('getByToken', () => {
    it('should return token entity by token string', async () => {
      tokenRepo.findOne.mockResolvedValue(mockToken);

      const result = await service.getByToken(tokenString);

      expect(tokenRepo.findOne).toHaveBeenCalledWith({
        where: { token: tokenString },
        relations: ['partner', 'project'],
      });
      expect(result).toEqual(mockToken);
    });

    it('should return null when token string does not match', async () => {
      tokenRepo.findOne.mockResolvedValue(null);

      const result = await service.getByToken('invalid-token');

      expect(result).toBeNull();
    });
  });

  // =============================================
  // deactivateToken
  // =============================================

  describe('deactivateToken', () => {
    it('should deactivate all tokens for a partner when no tokenId', async () => {
      tokenRepo.update.mockResolvedValue({ affected: 2 });

      await service.deactivateToken(partnerId);

      expect(tokenRepo.update).toHaveBeenCalledWith(
        { partnerId },
        { isActive: false },
      );
    });

    it('should deactivate a specific token when tokenId is provided', async () => {
      tokenRepo.update.mockResolvedValue({ affected: 1 });

      await service.deactivateToken(partnerId, tokenId);

      expect(tokenRepo.update).toHaveBeenCalledWith(
        { partnerId, id: tokenId },
        { isActive: false },
      );
    });

    it('should throw ResourceNotFoundException when no token is found to deactivate', async () => {
      tokenRepo.update.mockResolvedValue({ affected: 0 });

      await expect(service.deactivateToken(partnerId)).rejects.toThrow(
        ResourceNotFoundException,
      );
    });
  });

  // =============================================
  // regenerateToken
  // =============================================

  describe('regenerateToken', () => {
    it('should deactivate existing tokens and create a new one', async () => {
      const qb = createMockQueryBuilder();
      tokenRepo.createQueryBuilder.mockReturnValue(qb);
      partnerRepo.findOne.mockResolvedValue(mockPartner);
      tokenRepo.create.mockImplementation((data) => data);
      tokenRepo.save.mockImplementation((data) => Promise.resolve(data));

      const result = await service.regenerateToken(partnerId);

      // Verify old tokens were deactivated
      expect(qb.update).toHaveBeenCalled();
      expect(qb.set).toHaveBeenCalledWith({ isActive: false });
      expect(qb.where).toHaveBeenCalledWith('partner_id = :partnerId', { partnerId });
      expect(qb.execute).toHaveBeenCalled();

      // Verify new token was created
      expect(tokenRepo.create).toHaveBeenCalled();
      expect(tokenRepo.save).toHaveBeenCalled();
      expect(result.token).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should throw ResourceNotFoundException when partner not found during regeneration', async () => {
      const qb = createMockQueryBuilder();
      tokenRepo.createQueryBuilder.mockReturnValue(qb);
      partnerRepo.findOne.mockResolvedValue(null);

      await expect(service.regenerateToken(partnerId)).rejects.toThrow(
        ResourceNotFoundException,
      );
    });

    it('should filter by projectId when deactivating old tokens', async () => {
      const qb = createMockQueryBuilder();
      tokenRepo.createQueryBuilder.mockReturnValue(qb);
      partnerRepo.findOne.mockResolvedValue(mockPartner);
      tokenRepo.create.mockImplementation((data) => data);
      tokenRepo.save.mockImplementation((data) => Promise.resolve(data));

      await service.regenerateToken(partnerId, projectId);

      expect(qb.andWhere).toHaveBeenCalledWith('project_id = :projectId', { projectId });
    });

    it('should filter by project_id IS NULL when projectId not provided', async () => {
      const qb = createMockQueryBuilder();
      tokenRepo.createQueryBuilder.mockReturnValue(qb);
      partnerRepo.findOne.mockResolvedValue(mockPartner);
      tokenRepo.create.mockImplementation((data) => data);
      tokenRepo.save.mockImplementation((data) => Promise.resolve(data));

      await service.regenerateToken(partnerId);

      expect(qb.andWhere).toHaveBeenCalledWith('project_id IS NULL');
    });

    it('should use custom expiresInDays for regenerated token', async () => {
      const qb = createMockQueryBuilder();
      tokenRepo.createQueryBuilder.mockReturnValue(qb);
      partnerRepo.findOne.mockResolvedValue(mockPartner);
      tokenRepo.create.mockImplementation((data) => data);
      tokenRepo.save.mockImplementation((data) => Promise.resolve(data));

      const result = await service.regenerateToken(partnerId, undefined, 7);

      const expectedMinExpiry = Date.now() + 6 * 24 * 60 * 60 * 1000;
      const expectedMaxExpiry = Date.now() + 8 * 24 * 60 * 60 * 1000;
      expect(result.expiresAt!.getTime()).toBeGreaterThan(expectedMinExpiry);
      expect(result.expiresAt!.getTime()).toBeLessThan(expectedMaxExpiry);
    });
  });

  // =============================================
  // getReportUrl
  // =============================================

  describe('getReportUrl', () => {
    it('should construct the correct report URL', () => {
      const url = service.getReportUrl('abc123', 'https://app.example.com');

      expect(url).toBe('https://app.example.com/report/abc123');
    });

    it('should handle base URL without trailing slash', () => {
      const url = service.getReportUrl('token', 'http://localhost:5173');

      expect(url).toBe('http://localhost:5173/report/token');
    });
  });
});

// ======================================================================
// ReportReminderService Tests
// ======================================================================

describe('ReportReminderService', () => {
  let service: ReportReminderService;
  let scheduleRepo: ReturnType<typeof createMockRepository>;
  let requestRepo: ReturnType<typeof createMockRepository>;
  let tokenRepo: ReturnType<typeof createMockRepository>;
  let tokenService: Record<string, jest.Mock>;
  let emailService: Record<string, jest.Mock>;
  let configService: Record<string, jest.Mock>;

  beforeEach(async () => {
    scheduleRepo = createMockRepository();
    requestRepo = createMockRepository();
    tokenRepo = createMockRepository();

    tokenService = {
      generateToken: jest.fn(),
      getReportUrl: jest.fn().mockReturnValue('https://app.example.com/report/abc123'),
    };

    emailService = {
      sendEmail: jest.fn().mockResolvedValue(undefined),
    };

    configService = {
      get: jest.fn().mockReturnValue('https://app.example.com'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportReminderService,
        { provide: getRepositoryToken(ReportSchedule), useValue: scheduleRepo },
        { provide: getRepositoryToken(ReportRequest), useValue: requestRepo },
        { provide: getRepositoryToken(PartnerReportToken), useValue: tokenRepo },
        { provide: PartnerReportTokenService, useValue: tokenService },
        { provide: EmailService, useValue: emailService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<ReportReminderService>(ReportReminderService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // =============================================
  // processScheduledRequests
  // =============================================

  describe('processScheduledRequests', () => {
    it('should process due schedules', async () => {
      const scheduleWithPartner = {
        ...mockSchedule,
        partner: { ...mockPartner, email: 'partner@example.com' },
      };
      scheduleRepo.find.mockResolvedValue([scheduleWithPartner]);
      requestRepo.create.mockReturnValue(mockRequest);
      requestRepo.save.mockResolvedValue(mockRequest);
      tokenRepo.findOne.mockResolvedValue(mockToken);
      scheduleRepo.save.mockResolvedValue(scheduleWithPartner);

      await service.processScheduledRequests();

      expect(scheduleRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
          }),
          relations: ['partner'],
        }),
      );
      expect(requestRepo.create).toHaveBeenCalled();
      expect(requestRepo.save).toHaveBeenCalled();
    });

    it('should handle no due schedules', async () => {
      scheduleRepo.find.mockResolvedValue([]);

      await service.processScheduledRequests();

      expect(requestRepo.create).not.toHaveBeenCalled();
    });

    it('should skip schedule with no partnerId', async () => {
      const scheduleNoPartner = { ...mockSchedule, partnerId: null };
      scheduleRepo.find.mockResolvedValue([scheduleNoPartner]);

      await service.processScheduledRequests();

      expect(requestRepo.create).not.toHaveBeenCalled();
    });

    it('should generate token if no active token exists for partner', async () => {
      const scheduleWithPartner = {
        ...mockSchedule,
        partner: { ...mockPartner, email: 'partner@example.com' },
      };
      scheduleRepo.find.mockResolvedValue([scheduleWithPartner]);
      requestRepo.create.mockReturnValue(mockRequest);
      requestRepo.save.mockResolvedValue(mockRequest);
      tokenRepo.findOne.mockResolvedValue(null); // No existing token
      tokenService.generateToken.mockResolvedValue(mockToken);
      scheduleRepo.save.mockResolvedValue(scheduleWithPartner);

      await service.processScheduledRequests();

      expect(tokenService.generateToken).toHaveBeenCalledWith(
        partnerId,
        undefined,
      );
    });

    it('should send email when partner has email', async () => {
      const scheduleWithPartner = {
        ...mockSchedule,
        partner: { ...mockPartner, email: 'partner@example.com' },
      };
      scheduleRepo.find.mockResolvedValue([scheduleWithPartner]);
      requestRepo.create.mockReturnValue(mockRequest);
      requestRepo.save.mockResolvedValue(mockRequest);
      tokenRepo.findOne.mockResolvedValue(mockToken);
      scheduleRepo.save.mockResolvedValue(scheduleWithPartner);

      await service.processScheduledRequests();

      expect(emailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'partner@example.com',
          subject: expect.stringContaining('報告依頼'),
        }),
      );
    });

    it('should not send email when partner has no email', async () => {
      const scheduleNoEmail = {
        ...mockSchedule,
        partner: { ...mockPartner, email: undefined },
      };
      scheduleRepo.find.mockResolvedValue([scheduleNoEmail]);
      requestRepo.create.mockReturnValue(mockRequest);
      requestRepo.save.mockResolvedValue(mockRequest);
      tokenRepo.findOne.mockResolvedValue(mockToken);
      scheduleRepo.save.mockResolvedValue(scheduleNoEmail);

      await service.processScheduledRequests();

      expect(emailService.sendEmail).not.toHaveBeenCalled();
    });

    it('should update schedule with lastSentAt and nextSendAt', async () => {
      const scheduleWithPartner = {
        ...mockSchedule,
        partner: { ...mockPartner, email: 'partner@example.com' },
      };
      scheduleRepo.find.mockResolvedValue([scheduleWithPartner]);
      requestRepo.create.mockReturnValue(mockRequest);
      requestRepo.save.mockResolvedValue(mockRequest);
      tokenRepo.findOne.mockResolvedValue(mockToken);
      scheduleRepo.save.mockResolvedValue(scheduleWithPartner);

      await service.processScheduledRequests();

      expect(scheduleRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          lastSentAt: expect.any(Date),
          nextSendAt: expect.any(Date),
        }),
      );
    });

    it('should continue processing other schedules when one fails', async () => {
      const schedule1 = {
        ...mockSchedule,
        id: 'schedule-1',
        partnerId: null, // Will be skipped (no partner)
      };
      const schedule2 = {
        ...mockSchedule,
        id: 'schedule-2',
        partner: { ...mockPartner, email: 'p2@example.com' },
      };
      scheduleRepo.find.mockResolvedValue([schedule1, schedule2]);
      requestRepo.create.mockReturnValue(mockRequest);
      requestRepo.save.mockResolvedValue(mockRequest);
      tokenRepo.findOne.mockResolvedValue(mockToken);
      scheduleRepo.save.mockResolvedValue(schedule2);

      await service.processScheduledRequests();

      // schedule2 should still be processed - the create call happens for it
      // schedule1 is simply skipped since partnerId is null
      expect(requestRepo.create).toHaveBeenCalledTimes(1);
    });
  });

  // =============================================
  // processReminders
  // =============================================

  describe('processReminders', () => {
    it('should process overdue requests', async () => {
      // 2 days overdue -> should trigger level 1 (days >= 1)
      const overdueRequest = {
        ...mockRequest,
        status: RequestStatus.PENDING,
        escalationLevel: 0,
        reminderCount: 0,
        deadlineAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        partner: { ...mockPartner, email: 'partner@example.com' },
      };
      requestRepo.find.mockResolvedValue([overdueRequest]);
      tokenRepo.findOne.mockResolvedValue(mockToken);
      requestRepo.save.mockResolvedValue(overdueRequest);

      await service.processReminders();

      expect(requestRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: RequestStatus.PENDING,
          }),
          relations: ['partner', 'project'],
        }),
      );
    });

    it('should handle no overdue requests', async () => {
      requestRepo.find.mockResolvedValue([]);

      await service.processReminders();

      expect(emailService.sendEmail).not.toHaveBeenCalled();
    });

    it('should send reminder email when escalation level increases', async () => {
      // 2 days overdue, current level 0 -> should go to level 1
      const overdueRequest = {
        ...mockRequest,
        escalationLevel: 0,
        reminderCount: 0,
        deadlineAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        partner: { ...mockPartner, email: 'partner@example.com' },
      };
      requestRepo.find.mockResolvedValue([overdueRequest]);
      tokenRepo.findOne.mockResolvedValue(mockToken);
      requestRepo.save.mockResolvedValue(overdueRequest);

      await service.processReminders();

      expect(emailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'partner@example.com',
          subject: expect.stringContaining('リマインダー'),
        }),
      );
    });

    it('should not send reminder when escalation level has not increased', async () => {
      // 2 days overdue, already at level 1 -> target is still 1, no increase
      const overdueRequest = {
        ...mockRequest,
        escalationLevel: 1,
        reminderCount: 1,
        deadlineAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        partner: { ...mockPartner, email: 'partner@example.com' },
      };
      requestRepo.find.mockResolvedValue([overdueRequest]);

      await service.processReminders();

      expect(emailService.sendEmail).not.toHaveBeenCalled();
      expect(requestRepo.save).not.toHaveBeenCalled();
    });

    it('should update request with new escalation level and reminder count', async () => {
      const overdueRequest = {
        ...mockRequest,
        escalationLevel: 0,
        reminderCount: 0,
        deadlineAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        partner: { ...mockPartner, email: 'partner@example.com' },
      };
      requestRepo.find.mockResolvedValue([overdueRequest]);
      tokenRepo.findOne.mockResolvedValue(mockToken);
      requestRepo.save.mockResolvedValue(overdueRequest);

      await service.processReminders();

      expect(requestRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          escalationLevel: 1,
          reminderCount: 1,
          status: RequestStatus.OVERDUE,
          lastReminderAt: expect.any(Date),
        }),
      );
    });

    it('should escalate to level 2 when 3+ days overdue', async () => {
      const overdueRequest = {
        ...mockRequest,
        escalationLevel: 1,
        reminderCount: 1,
        deadlineAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
        partner: { ...mockPartner, email: 'partner@example.com' },
      };
      requestRepo.find.mockResolvedValue([overdueRequest]);
      tokenRepo.findOne.mockResolvedValue(mockToken);
      requestRepo.save.mockResolvedValue(overdueRequest);

      await service.processReminders();

      expect(requestRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          escalationLevel: 2,
          reminderCount: 2,
        }),
      );
    });

    it('should escalate to level 3 when 7+ days overdue', async () => {
      const overdueRequest = {
        ...mockRequest,
        escalationLevel: 2,
        reminderCount: 2,
        deadlineAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
        partner: { ...mockPartner, email: 'partner@example.com' },
      };
      requestRepo.find.mockResolvedValue([overdueRequest]);
      tokenRepo.findOne.mockResolvedValue(mockToken);
      requestRepo.save.mockResolvedValue(overdueRequest);

      await service.processReminders();

      expect(requestRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          escalationLevel: 3,
          reminderCount: 3,
        }),
      );
    });

    it('should escalate to level 4 when 14+ days overdue', async () => {
      const overdueRequest = {
        ...mockRequest,
        escalationLevel: 3,
        reminderCount: 3,
        deadlineAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
        partner: { ...mockPartner, email: 'partner@example.com' },
      };
      requestRepo.find.mockResolvedValue([overdueRequest]);
      tokenRepo.findOne.mockResolvedValue(mockToken);
      requestRepo.save.mockResolvedValue(overdueRequest);

      await service.processReminders();

      expect(requestRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          escalationLevel: 4,
          reminderCount: 4,
        }),
      );
    });

    it('should not send reminder when no token exists for partner', async () => {
      const overdueRequest = {
        ...mockRequest,
        escalationLevel: 0,
        reminderCount: 0,
        deadlineAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        partner: { ...mockPartner, email: 'partner@example.com' },
      };
      requestRepo.find.mockResolvedValue([overdueRequest]);
      tokenRepo.findOne.mockResolvedValue(null); // No token
      requestRepo.save.mockResolvedValue(overdueRequest);

      await service.processReminders();

      expect(emailService.sendEmail).not.toHaveBeenCalled();
      // Request should still be updated with escalation level
      expect(requestRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          escalationLevel: 1,
          status: RequestStatus.OVERDUE,
        }),
      );
    });

    it('should not send reminder when partner has no email', async () => {
      const overdueRequest = {
        ...mockRequest,
        escalationLevel: 0,
        reminderCount: 0,
        deadlineAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        partner: { ...mockPartner, email: undefined },
      };
      requestRepo.find.mockResolvedValue([overdueRequest]);
      tokenRepo.findOne.mockResolvedValue(mockToken);
      requestRepo.save.mockResolvedValue(overdueRequest);

      await service.processReminders();

      expect(emailService.sendEmail).not.toHaveBeenCalled();
    });

    it('should use urgent subject when 7+ days overdue', async () => {
      const overdueRequest = {
        ...mockRequest,
        escalationLevel: 2,
        reminderCount: 2,
        deadlineAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        partner: { ...mockPartner, email: 'partner@example.com' },
      };
      requestRepo.find.mockResolvedValue([overdueRequest]);
      tokenRepo.findOne.mockResolvedValue(mockToken);
      requestRepo.save.mockResolvedValue(overdueRequest);

      await service.processReminders();

      expect(emailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('至急'),
        }),
      );
    });

    it('should continue processing when one reminder fails', async () => {
      const request1 = {
        ...mockRequest,
        id: 'req-1',
        escalationLevel: 0,
        reminderCount: 0,
        deadlineAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        partner: { ...mockPartner, email: 'p1@example.com' },
      };
      const request2 = {
        ...mockRequest,
        id: 'req-2',
        escalationLevel: 0,
        reminderCount: 0,
        deadlineAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        partner: { ...mockPartner, email: 'p2@example.com' },
      };
      requestRepo.find.mockResolvedValue([request1, request2]);
      tokenRepo.findOne
        .mockRejectedValueOnce(new Error('DB error')) // first request fails
        .mockResolvedValueOnce(mockToken);             // second succeeds
      requestRepo.save.mockResolvedValue(request2);

      await service.processReminders();

      // The second request should still be processed
      expect(requestRepo.save).toHaveBeenCalledTimes(1);
    });
  });

  // =============================================
  // createManualRequest
  // =============================================

  describe('createManualRequest', () => {
    it('should create a manual report request with default deadline', async () => {
      const created = { ...mockRequest };
      requestRepo.create.mockReturnValue(created);
      requestRepo.save.mockResolvedValue(created);

      const result = await service.createManualRequest(partnerId, orgId, projectId);

      expect(requestRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: orgId,
          partnerId,
          projectId,
          status: RequestStatus.PENDING,
        }),
      );
      // Deadline should be set (roughly 3 days from now by default)
      const createArgs = requestRepo.create.mock.calls[0][0];
      expect(createArgs.deadlineAt).toBeInstanceOf(Date);
      expect(requestRepo.save).toHaveBeenCalledWith(created);
      expect(result).toEqual(created);
    });

    it('should use custom deadlineDays', async () => {
      requestRepo.create.mockReturnValue(mockRequest);
      requestRepo.save.mockResolvedValue(mockRequest);

      await service.createManualRequest(partnerId, orgId, null, 7);

      const createArgs = requestRepo.create.mock.calls[0][0];
      const expectedMinDeadline = Date.now() + 6 * 24 * 60 * 60 * 1000;
      const expectedMaxDeadline = Date.now() + 8 * 24 * 60 * 60 * 1000;
      expect(createArgs.deadlineAt.getTime()).toBeGreaterThan(expectedMinDeadline);
      expect(createArgs.deadlineAt.getTime()).toBeLessThan(expectedMaxDeadline);
    });

    it('should handle null organizationId and projectId', async () => {
      requestRepo.create.mockReturnValue(mockRequest);
      requestRepo.save.mockResolvedValue(mockRequest);

      await service.createManualRequest(partnerId, null, null);

      expect(requestRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: null,
          projectId: null,
        }),
      );
    });
  });

  // =============================================
  // markRequestAsSubmitted
  // =============================================

  describe('markRequestAsSubmitted', () => {
    it('should mark the most recent pending request as submitted', async () => {
      const pendingRequest = { ...mockRequest, id: 'req-1', status: RequestStatus.PENDING };
      requestRepo.findOne
        .mockResolvedValueOnce(pendingRequest) // PENDING
        .mockResolvedValueOnce(null);           // OVERDUE
      requestRepo.save.mockResolvedValue(pendingRequest);

      await service.markRequestAsSubmitted(partnerId, reportId);

      expect(requestRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { partnerId, status: RequestStatus.PENDING },
          order: { createdAt: 'DESC' },
        }),
      );
      expect(requestRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: RequestStatus.SUBMITTED,
          reportId,
        }),
      );
    });

    it('should also mark overdue requests as submitted', async () => {
      const overdueRequest = { ...mockRequest, id: 'req-overdue', status: RequestStatus.OVERDUE };
      requestRepo.findOne
        .mockResolvedValueOnce(null)            // PENDING
        .mockResolvedValueOnce(overdueRequest); // OVERDUE
      requestRepo.save.mockResolvedValue(overdueRequest);

      await service.markRequestAsSubmitted(partnerId, reportId);

      expect(requestRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: RequestStatus.SUBMITTED,
          reportId,
        }),
      );
    });

    it('should mark both pending and overdue requests as submitted', async () => {
      const pendingRequest = { ...mockRequest, id: 'req-pending', status: RequestStatus.PENDING };
      const overdueRequest = { ...mockRequest, id: 'req-overdue', status: RequestStatus.OVERDUE };
      requestRepo.findOne
        .mockResolvedValueOnce(pendingRequest)  // PENDING
        .mockResolvedValueOnce(overdueRequest); // OVERDUE
      requestRepo.save.mockResolvedValue({});

      await service.markRequestAsSubmitted(partnerId, reportId);

      expect(requestRepo.save).toHaveBeenCalledTimes(2);
    });

    it('should handle no pending or overdue requests gracefully', async () => {
      requestRepo.findOne.mockResolvedValue(null);

      await service.markRequestAsSubmitted(partnerId, reportId);

      expect(requestRepo.save).not.toHaveBeenCalled();
    });
  });
});
