import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProgressReportService } from './progress-report.service';
import { ProgressReport } from './entities/progress-report.entity';
import { ProgressReportStatus } from './enums/progress-report-status.enum';
import { Task } from '../task/entities/task.entity';
import { UserProfile } from '../auth/entities/user-profile.entity';
import { EmailService } from '../notification/services/email.service';
import { ResourceNotFoundException } from '../../common/exceptions/resource-not-found.exception';
import { BusinessException, AuthorizationException } from '../../common/exceptions/business.exception';
import { RequestReportDto } from './dto/request-report.dto';
import { SubmitReportDto } from './dto/submit-report.dto';
import { ReviewReportDto } from './dto/review-report.dto';

// Mock uuid to return a predictable value
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-token'),
}));

describe('ProgressReportService', () => {
  let service: ProgressReportService;
  let progressReportRepository: Record<string, jest.Mock>;
  let taskRepository: Record<string, jest.Mock>;
  let userProfileRepository: Record<string, jest.Mock>;
  let emailService: Record<string, jest.Mock>;

  // Fixed "now" for consistent date assertions
  const now = new Date('2026-02-12T00:00:00Z');

  // Reusable mock data
  const mockOwner: Partial<UserProfile> = {
    id: 'owner-1',
    email: 'owner@example.com',
    firstName: 'Taro',
    lastName: 'Yamada',
    get fullName() {
      return `${this.firstName} ${this.lastName}`.trim();
    },
  };

  const mockProject = {
    id: 'project-1',
    name: 'Test Project',
    ownerId: 'owner-1',
    owner: mockOwner,
  };

  const mockTask: Partial<Task> = {
    id: 'task-1',
    title: 'Test Task',
    projectId: 'project-1',
    project: mockProject as any,
    progress: 0,
  };

  const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
  const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

  const mockProgressReport: Partial<ProgressReport> = {
    id: 'report-1',
    taskId: 'task-1',
    reporterEmail: 'partner@example.com',
    reporterName: 'Partner Taro',
    reportToken: 'mock-uuid-token',
    tokenExpiresAt: futureDate,
    progress: 0,
    status: ProgressReportStatus.PENDING,
    isSubmitted: false,
    comment: null,
    attachmentUrls: null,
    reviewerId: null,
    reviewerComment: null,
    createdAt: now,
    updatedAt: now,
  };

  const mockProgressReportRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    delete: jest.fn(),
  };

  const mockTaskRepository = {
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockUserProfileRepository = {};

  const mockEmailService = {
    sendEmail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProgressReportService,
        {
          provide: getRepositoryToken(ProgressReport),
          useValue: mockProgressReportRepository,
        },
        {
          provide: getRepositoryToken(Task),
          useValue: mockTaskRepository,
        },
        {
          provide: getRepositoryToken(UserProfile),
          useValue: mockUserProfileRepository,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    service = module.get<ProgressReportService>(ProgressReportService);
    progressReportRepository = module.get(getRepositoryToken(ProgressReport));
    taskRepository = module.get(getRepositoryToken(Task));
    userProfileRepository = module.get(getRepositoryToken(UserProfile));
    emailService = module.get(EmailService) as any;

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // =============================================
  // generateReportToken
  // =============================================

  describe('generateReportToken', () => {
    it('should generate a report token for a valid task', async () => {
      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      mockProgressReportRepository.create.mockReturnValue({ ...mockProgressReport });
      mockProgressReportRepository.save.mockResolvedValue({ ...mockProgressReport });

      const result = await service.generateReportToken(
        'task-1',
        'partner@example.com',
        'Partner Taro',
      );

      expect(mockTaskRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        relations: ['project'],
      });
      expect(mockProgressReportRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          taskId: 'task-1',
          reporterEmail: 'partner@example.com',
          reporterName: 'Partner Taro',
          reportToken: 'mock-uuid-token',
          progress: 0,
          status: ProgressReportStatus.PENDING,
          isSubmitted: false,
        }),
      );
      expect(mockProgressReportRepository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should use email as reporterName when partnerName is not provided', async () => {
      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      mockProgressReportRepository.create.mockReturnValue({ ...mockProgressReport });
      mockProgressReportRepository.save.mockResolvedValue({ ...mockProgressReport });

      await service.generateReportToken('task-1', 'partner@example.com');

      expect(mockProgressReportRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          reporterName: 'partner@example.com',
        }),
      );
    });

    it('should set token expiry to 24 hours from now', async () => {
      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      mockProgressReportRepository.create.mockReturnValue({ ...mockProgressReport });
      mockProgressReportRepository.save.mockResolvedValue({ ...mockProgressReport });

      await service.generateReportToken('task-1', 'partner@example.com');

      const createCall = mockProgressReportRepository.create.mock.calls[0][0];
      expect(createCall.tokenExpiresAt).toBeInstanceOf(Date);
      // tokenExpiresAt should be roughly 24 hours in the future
      const diffMs = createCall.tokenExpiresAt.getTime() - Date.now();
      const diffHours = diffMs / (1000 * 60 * 60);
      expect(diffHours).toBeGreaterThan(23);
      expect(diffHours).toBeLessThanOrEqual(24);
    });

    it('should throw ResourceNotFoundException when task does not exist', async () => {
      mockTaskRepository.findOne.mockResolvedValue(null);

      await expect(
        service.generateReportToken('nonexistent-task', 'partner@example.com'),
      ).rejects.toThrow(ResourceNotFoundException);
    });

    it('should propagate repository save errors', async () => {
      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      mockProgressReportRepository.create.mockReturnValue({ ...mockProgressReport });
      mockProgressReportRepository.save.mockRejectedValue(new Error('DB error'));

      await expect(
        service.generateReportToken('task-1', 'partner@example.com'),
      ).rejects.toThrow('DB error');
    });
  });

  // =============================================
  // requestReport
  // =============================================

  describe('requestReport', () => {
    const requestDto: RequestReportDto = {
      taskId: 'task-1',
      partnerEmail: 'partner@example.com',
      partnerName: 'Partner Taro',
    };

    it('should generate a token, send an email, and return the report', async () => {
      // generateReportToken calls taskRepository.findOne
      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      mockProgressReportRepository.create.mockReturnValue({ ...mockProgressReport });
      mockProgressReportRepository.save.mockResolvedValue({ ...mockProgressReport });
      mockEmailService.sendEmail.mockResolvedValue(true);

      const result = await service.requestReport(requestDto, 'requester-1');

      expect(result).toBeDefined();
      expect(result.reportToken).toBe('mock-uuid-token');
      // sendEmail is called in sendReportRequestEmail
      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'partner@example.com',
          subject: expect.stringContaining('Test Task'),
        }),
      );
    });

    it('should throw ResourceNotFoundException when task does not exist for token generation', async () => {
      mockTaskRepository.findOne.mockResolvedValue(null);

      await expect(
        service.requestReport(requestDto, 'requester-1'),
      ).rejects.toThrow(ResourceNotFoundException);
    });

    it('should throw ResourceNotFoundException when task is not found on second lookup for email', async () => {
      // First call (from generateReportToken) succeeds, second call (for email) returns null
      mockTaskRepository.findOne
        .mockResolvedValueOnce(mockTask)
        .mockResolvedValueOnce(null);
      mockProgressReportRepository.create.mockReturnValue({ ...mockProgressReport });
      mockProgressReportRepository.save.mockResolvedValue({ ...mockProgressReport });

      await expect(
        service.requestReport(requestDto, 'requester-1'),
      ).rejects.toThrow(ResourceNotFoundException);
    });

    it('should include correct email content with report URL', async () => {
      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      mockProgressReportRepository.create.mockReturnValue({ ...mockProgressReport });
      mockProgressReportRepository.save.mockResolvedValue({ ...mockProgressReport });
      mockEmailService.sendEmail.mockResolvedValue(true);

      await service.requestReport(requestDto, 'requester-1');

      const emailCall = mockEmailService.sendEmail.mock.calls[0][0];
      expect(emailCall.html).toContain('mock-uuid-token');
      expect(emailCall.html).toContain('Test Task');
      expect(emailCall.html).toContain('Test Project');
      expect(emailCall.text).toContain('mock-uuid-token');
    });

    it('should handle missing project name gracefully in email', async () => {
      const taskWithoutProject = {
        ...mockTask,
        project: null,
      };
      mockTaskRepository.findOne.mockResolvedValue(taskWithoutProject);
      mockProgressReportRepository.create.mockReturnValue({ ...mockProgressReport });
      mockProgressReportRepository.save.mockResolvedValue({ ...mockProgressReport });
      mockEmailService.sendEmail.mockResolvedValue(true);

      await service.requestReport(requestDto, 'requester-1');

      const emailCall = mockEmailService.sendEmail.mock.calls[0][0];
      expect(emailCall.html).toContain('Unknown Project');
      expect(emailCall.text).toContain('Unknown Project');
    });
  });

  // =============================================
  // getFormData
  // =============================================

  describe('getFormData', () => {
    it('should return report and task for a valid, non-expired, unsubmitted token', async () => {
      const report = {
        ...mockProgressReport,
        tokenExpiresAt: futureDate,
        isSubmitted: false,
        task: mockTask,
      };
      mockProgressReportRepository.findOne.mockResolvedValue(report);

      const result = await service.getFormData('mock-uuid-token');

      expect(mockProgressReportRepository.findOne).toHaveBeenCalledWith({
        where: { reportToken: 'mock-uuid-token' },
        relations: ['task', 'task.project'],
      });
      expect(result.report).toEqual(report);
      expect(result.task).toEqual(mockTask);
    });

    it('should throw ResourceNotFoundException for invalid token', async () => {
      mockProgressReportRepository.findOne.mockResolvedValue(null);

      await expect(service.getFormData('invalid-token')).rejects.toThrow(
        ResourceNotFoundException,
      );
    });

    it('should throw AuthorizationException for expired token', async () => {
      const expiredReport = {
        ...mockProgressReport,
        tokenExpiresAt: pastDate,
        isSubmitted: false,
      };
      mockProgressReportRepository.findOne.mockResolvedValue(expiredReport);

      await expect(service.getFormData('mock-uuid-token')).rejects.toThrow(
        AuthorizationException,
      );
    });

    it('should throw BusinessException when report is already submitted', async () => {
      const submittedReport = {
        ...mockProgressReport,
        tokenExpiresAt: futureDate,
        isSubmitted: true,
      };
      mockProgressReportRepository.findOne.mockResolvedValue(submittedReport);

      await expect(service.getFormData('mock-uuid-token')).rejects.toThrow(
        BusinessException,
      );
    });

    it('should check expiry before checking submitted status', async () => {
      // Both expired AND submitted: expiry check should trigger first
      const expiredAndSubmitted = {
        ...mockProgressReport,
        tokenExpiresAt: pastDate,
        isSubmitted: true,
      };
      mockProgressReportRepository.findOne.mockResolvedValue(expiredAndSubmitted);

      await expect(service.getFormData('mock-uuid-token')).rejects.toThrow(
        AuthorizationException,
      );
    });
  });

  // =============================================
  // submitReport
  // =============================================

  describe('submitReport', () => {
    const submitDto: SubmitReportDto = {
      reporterName: 'Partner Taro',
      progress: 75,
      comment: 'Good progress on the task',
      attachmentUrls: ['https://example.com/file1.pdf'],
    };

    it('should submit a report successfully', async () => {
      const report = {
        ...mockProgressReport,
        tokenExpiresAt: futureDate,
        isSubmitted: false,
        task: { ...mockTask, project: { ...mockProject, owner: mockOwner } },
      };
      const savedReport = {
        ...report,
        reporterName: submitDto.reporterName,
        progress: submitDto.progress,
        comment: submitDto.comment,
        attachmentUrls: submitDto.attachmentUrls,
        isSubmitted: true,
      };
      mockProgressReportRepository.findOne.mockResolvedValue(report);
      mockProgressReportRepository.save.mockResolvedValue(savedReport);
      mockTaskRepository.findOne.mockResolvedValue({
        ...mockTask,
        project: { ...mockProject, owner: mockOwner },
      });
      mockTaskRepository.update.mockResolvedValue({ affected: 1 });
      mockEmailService.sendEmail.mockResolvedValue(true);

      const result = await service.submitReport('mock-uuid-token', submitDto);

      expect(result.isSubmitted).toBe(true);
      expect(result.progress).toBe(75);
      expect(result.comment).toBe('Good progress on the task');
      expect(result.attachmentUrls).toEqual(['https://example.com/file1.pdf']);
    });

    it('should update task progress after submission', async () => {
      const report = {
        ...mockProgressReport,
        tokenExpiresAt: futureDate,
        isSubmitted: false,
        task: { ...mockTask, project: { ...mockProject, owner: mockOwner } },
      };
      mockProgressReportRepository.findOne.mockResolvedValue(report);
      mockProgressReportRepository.save.mockResolvedValue({ ...report, isSubmitted: true });
      mockTaskRepository.findOne.mockResolvedValue({
        ...mockTask,
        project: { ...mockProject, owner: mockOwner },
      });
      mockTaskRepository.update.mockResolvedValue({ affected: 1 });
      mockEmailService.sendEmail.mockResolvedValue(true);

      await service.submitReport('mock-uuid-token', submitDto);

      expect(mockTaskRepository.update).toHaveBeenCalledWith('task-1', {
        progress: 75,
      });
    });

    it('should notify project owner via email after submission', async () => {
      const report = {
        ...mockProgressReport,
        tokenExpiresAt: futureDate,
        isSubmitted: false,
        task: { ...mockTask, project: { ...mockProject, owner: mockOwner } },
      };
      mockProgressReportRepository.findOne.mockResolvedValue(report);
      mockProgressReportRepository.save.mockResolvedValue({ ...report, isSubmitted: true });
      mockTaskRepository.findOne.mockResolvedValue({
        ...mockTask,
        project: { ...mockProject, owner: mockOwner },
      });
      mockTaskRepository.update.mockResolvedValue({ affected: 1 });
      mockEmailService.sendEmail.mockResolvedValue(true);

      await service.submitReport('mock-uuid-token', submitDto);

      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'owner@example.com',
          subject: expect.stringContaining('Test Task'),
        }),
      );
    });

    it('should set comment to null when not provided', async () => {
      const dtoWithoutComment: SubmitReportDto = {
        reporterName: 'Partner Taro',
        progress: 50,
      };
      const report = {
        ...mockProgressReport,
        tokenExpiresAt: futureDate,
        isSubmitted: false,
        task: { ...mockTask, project: { ...mockProject, owner: mockOwner } },
      };
      mockProgressReportRepository.findOne.mockResolvedValue(report);
      mockProgressReportRepository.save.mockImplementation((r) => Promise.resolve(r));
      mockTaskRepository.findOne.mockResolvedValue({
        ...mockTask,
        project: { ...mockProject, owner: mockOwner },
      });
      mockTaskRepository.update.mockResolvedValue({ affected: 1 });
      mockEmailService.sendEmail.mockResolvedValue(true);

      await service.submitReport('mock-uuid-token', dtoWithoutComment);

      const saveCall = mockProgressReportRepository.save.mock.calls[0][0];
      expect(saveCall.comment).toBeNull();
      expect(saveCall.attachmentUrls).toBeNull();
    });

    it('should throw ResourceNotFoundException for invalid token', async () => {
      mockProgressReportRepository.findOne.mockResolvedValue(null);

      await expect(
        service.submitReport('invalid-token', submitDto),
      ).rejects.toThrow(ResourceNotFoundException);
    });

    it('should throw AuthorizationException for expired token', async () => {
      const expiredReport = {
        ...mockProgressReport,
        tokenExpiresAt: pastDate,
        isSubmitted: false,
      };
      mockProgressReportRepository.findOne.mockResolvedValue(expiredReport);

      await expect(
        service.submitReport('mock-uuid-token', submitDto),
      ).rejects.toThrow(AuthorizationException);
    });

    it('should throw BusinessException when report is already submitted', async () => {
      const submittedReport = {
        ...mockProgressReport,
        tokenExpiresAt: futureDate,
        isSubmitted: true,
      };
      mockProgressReportRepository.findOne.mockResolvedValue(submittedReport);

      await expect(
        service.submitReport('mock-uuid-token', submitDto),
      ).rejects.toThrow(BusinessException);
    });

    it('should not send owner notification when task has no project owner', async () => {
      const report = {
        ...mockProgressReport,
        tokenExpiresAt: futureDate,
        isSubmitted: false,
        task: { ...mockTask, project: { ...mockProject, owner: null } },
      };
      mockProgressReportRepository.findOne.mockResolvedValue(report);
      mockProgressReportRepository.save.mockResolvedValue({ ...report, isSubmitted: true });
      mockTaskRepository.findOne.mockResolvedValue({
        ...mockTask,
        project: { ...mockProject, owner: null },
      });
      mockTaskRepository.update.mockResolvedValue({ affected: 1 });

      await service.submitReport('mock-uuid-token', submitDto);

      expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
    });

    it('should not send owner notification when task has no project', async () => {
      const report = {
        ...mockProgressReport,
        tokenExpiresAt: futureDate,
        isSubmitted: false,
        task: { ...mockTask, project: null },
      };
      mockProgressReportRepository.findOne.mockResolvedValue(report);
      mockProgressReportRepository.save.mockResolvedValue({ ...report, isSubmitted: true });
      mockTaskRepository.findOne.mockResolvedValue({
        ...mockTask,
        project: null,
      });
      mockTaskRepository.update.mockResolvedValue({ affected: 1 });

      await service.submitReport('mock-uuid-token', submitDto);

      expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
    });

    it('should not send owner notification when task is not found in notifyProjectOwner', async () => {
      const report = {
        ...mockProgressReport,
        tokenExpiresAt: futureDate,
        isSubmitted: false,
        task: { ...mockTask, project: { ...mockProject, owner: mockOwner } },
      };
      mockProgressReportRepository.findOne.mockResolvedValue(report);
      mockProgressReportRepository.save.mockResolvedValue({ ...report, isSubmitted: true });
      // First findOne for submitReport passes, notifyProjectOwner uses a fresh findOne
      mockTaskRepository.findOne.mockResolvedValue(null);
      mockTaskRepository.update.mockResolvedValue({ affected: 1 });

      await service.submitReport('mock-uuid-token', submitDto);

      expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
    });

    it('should use owner email in notification when owner has fullName', async () => {
      const ownerWithName = {
        id: 'owner-1',
        email: 'owner@example.com',
        firstName: 'Taro',
        lastName: 'Yamada',
        get fullName() {
          return `${this.firstName} ${this.lastName}`.trim();
        },
      };

      const report = {
        ...mockProgressReport,
        tokenExpiresAt: futureDate,
        isSubmitted: false,
        task: { ...mockTask, project: { ...mockProject, owner: ownerWithName } },
      };
      mockProgressReportRepository.findOne.mockResolvedValue(report);
      mockProgressReportRepository.save.mockResolvedValue({ ...report, isSubmitted: true });
      mockTaskRepository.findOne.mockResolvedValue({
        ...mockTask,
        project: { ...mockProject, owner: ownerWithName },
      });
      mockTaskRepository.update.mockResolvedValue({ affected: 1 });
      mockEmailService.sendEmail.mockResolvedValue(true);

      await service.submitReport('mock-uuid-token', submitDto);

      const emailCall = mockEmailService.sendEmail.mock.calls[0][0];
      expect(emailCall.html).toContain('Taro Yamada');
    });

    it('should fall back to owner email when fullName is empty', async () => {
      const ownerWithoutName = {
        id: 'owner-1',
        email: 'owner@example.com',
        firstName: '',
        lastName: '',
        get fullName() {
          return `${this.firstName} ${this.lastName}`.trim();
        },
      };

      const report = {
        ...mockProgressReport,
        tokenExpiresAt: futureDate,
        isSubmitted: false,
        task: { ...mockTask, project: { ...mockProject, owner: ownerWithoutName } },
      };
      mockProgressReportRepository.findOne.mockResolvedValue(report);
      mockProgressReportRepository.save.mockResolvedValue({ ...report, isSubmitted: true });
      mockTaskRepository.findOne.mockResolvedValue({
        ...mockTask,
        project: { ...mockProject, owner: ownerWithoutName },
      });
      mockTaskRepository.update.mockResolvedValue({ affected: 1 });
      mockEmailService.sendEmail.mockResolvedValue(true);

      await service.submitReport('mock-uuid-token', submitDto);

      const emailCall = mockEmailService.sendEmail.mock.calls[0][0];
      expect(emailCall.html).toContain('owner@example.com');
    });
  });

  // =============================================
  // getReportsByTask
  // =============================================

  describe('getReportsByTask', () => {
    it('should return only submitted reports by default', async () => {
      const reports = [
        { ...mockProgressReport, id: 'report-1', isSubmitted: true },
        { ...mockProgressReport, id: 'report-2', isSubmitted: true },
      ];
      mockProgressReportRepository.find.mockResolvedValue(reports);

      const result = await service.getReportsByTask('task-1');

      expect(mockProgressReportRepository.find).toHaveBeenCalledWith({
        where: { taskId: 'task-1', isSubmitted: true },
        relations: ['reviewer'],
        order: { createdAt: 'DESC' },
      });
      expect(result).toHaveLength(2);
    });

    it('should include unsubmitted reports when includeUnsubmitted is true', async () => {
      const reports = [
        { ...mockProgressReport, id: 'report-1', isSubmitted: true },
        { ...mockProgressReport, id: 'report-2', isSubmitted: false },
      ];
      mockProgressReportRepository.find.mockResolvedValue(reports);

      const result = await service.getReportsByTask('task-1', true);

      expect(mockProgressReportRepository.find).toHaveBeenCalledWith({
        where: { taskId: 'task-1' },
        relations: ['reviewer'],
        order: { createdAt: 'DESC' },
      });
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no reports exist for task', async () => {
      mockProgressReportRepository.find.mockResolvedValue([]);

      const result = await service.getReportsByTask('task-with-no-reports');

      expect(result).toEqual([]);
    });

    it('should order results by createdAt DESC', async () => {
      mockProgressReportRepository.find.mockResolvedValue([]);

      await service.getReportsByTask('task-1');

      expect(mockProgressReportRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { createdAt: 'DESC' },
        }),
      );
    });
  });

  // =============================================
  // reviewReport
  // =============================================

  describe('reviewReport', () => {
    const reviewDto: ReviewReportDto = {
      status: ProgressReportStatus.REVIEWED,
      reviewerComment: 'Looks good',
    };

    it('should review a submitted report successfully', async () => {
      const submittedReport = {
        ...mockProgressReport,
        isSubmitted: true,
      };
      const reviewedReport = {
        ...submittedReport,
        status: ProgressReportStatus.REVIEWED,
        reviewerComment: 'Looks good',
        reviewerId: 'reviewer-1',
        reviewedAt: expect.any(Date),
      };
      mockProgressReportRepository.findOne.mockResolvedValue(submittedReport);
      mockProgressReportRepository.save.mockResolvedValue(reviewedReport);

      const result = await service.reviewReport('report-1', reviewDto, 'reviewer-1');

      expect(mockProgressReportRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'report-1' },
      });
      expect(mockProgressReportRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ProgressReportStatus.REVIEWED,
          reviewerComment: 'Looks good',
          reviewerId: 'reviewer-1',
        }),
      );
      expect(result.status).toBe(ProgressReportStatus.REVIEWED);
    });

    it('should reject a report with REJECTED status', async () => {
      const submittedReport = {
        ...mockProgressReport,
        isSubmitted: true,
      };
      const rejectedDto: ReviewReportDto = {
        status: ProgressReportStatus.REJECTED,
        reviewerComment: 'Needs more detail',
      };
      const rejectedReport = {
        ...submittedReport,
        status: ProgressReportStatus.REJECTED,
        reviewerComment: 'Needs more detail',
        reviewerId: 'reviewer-1',
      };
      mockProgressReportRepository.findOne.mockResolvedValue(submittedReport);
      mockProgressReportRepository.save.mockResolvedValue(rejectedReport);

      const result = await service.reviewReport('report-1', rejectedDto, 'reviewer-1');

      expect(result.status).toBe(ProgressReportStatus.REJECTED);
    });

    it('should set reviewerComment to null when not provided', async () => {
      const submittedReport = {
        ...mockProgressReport,
        isSubmitted: true,
      };
      const reviewDtoNoComment: ReviewReportDto = {
        status: ProgressReportStatus.REVIEWED,
      };
      mockProgressReportRepository.findOne.mockResolvedValue(submittedReport);
      mockProgressReportRepository.save.mockImplementation((r) => Promise.resolve(r));

      await service.reviewReport('report-1', reviewDtoNoComment, 'reviewer-1');

      const saveCall = mockProgressReportRepository.save.mock.calls[0][0];
      expect(saveCall.reviewerComment).toBeNull();
    });

    it('should set reviewedAt to current date', async () => {
      const submittedReport = {
        ...mockProgressReport,
        isSubmitted: true,
      };
      mockProgressReportRepository.findOne.mockResolvedValue(submittedReport);
      mockProgressReportRepository.save.mockImplementation((r) => Promise.resolve(r));

      await service.reviewReport('report-1', reviewDto, 'reviewer-1');

      const saveCall = mockProgressReportRepository.save.mock.calls[0][0];
      expect(saveCall.reviewedAt).toBeInstanceOf(Date);
    });

    it('should throw ResourceNotFoundException when report does not exist', async () => {
      mockProgressReportRepository.findOne.mockResolvedValue(null);

      await expect(
        service.reviewReport('nonexistent-report', reviewDto, 'reviewer-1'),
      ).rejects.toThrow(ResourceNotFoundException);
    });

    it('should throw BusinessException when report is not yet submitted', async () => {
      const unsubmittedReport = {
        ...mockProgressReport,
        isSubmitted: false,
      };
      mockProgressReportRepository.findOne.mockResolvedValue(unsubmittedReport);

      await expect(
        service.reviewReport('report-1', reviewDto, 'reviewer-1'),
      ).rejects.toThrow(BusinessException);
    });
  });

  // =============================================
  // getReportById
  // =============================================

  describe('getReportById', () => {
    it('should return a report with relations when found', async () => {
      const reportWithRelations = {
        ...mockProgressReport,
        task: mockTask,
        reviewer: null,
      };
      mockProgressReportRepository.findOne.mockResolvedValue(reportWithRelations);

      const result = await service.getReportById('report-1');

      expect(mockProgressReportRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'report-1' },
        relations: ['task', 'task.project', 'reviewer'],
      });
      expect(result).toEqual(reportWithRelations);
    });

    it('should throw ResourceNotFoundException when report does not exist', async () => {
      mockProgressReportRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getReportById('nonexistent-report'),
      ).rejects.toThrow(ResourceNotFoundException);
    });
  });

  // =============================================
  // cleanupExpiredTokens
  // =============================================

  describe('cleanupExpiredTokens', () => {
    it('should delete expired unsubmitted tokens and return the count', async () => {
      mockProgressReportRepository.delete.mockResolvedValue({ affected: 5 });

      const result = await service.cleanupExpiredTokens();

      expect(mockProgressReportRepository.delete).toHaveBeenCalledWith({
        isSubmitted: false,
        tokenExpiresAt: expect.anything(),
      });
      expect(result).toBe(5);
    });

    it('should return 0 when no expired tokens exist', async () => {
      mockProgressReportRepository.delete.mockResolvedValue({ affected: 0 });

      const result = await service.cleanupExpiredTokens();

      expect(result).toBe(0);
    });

    it('should return 0 when affected is undefined', async () => {
      mockProgressReportRepository.delete.mockResolvedValue({});

      const result = await service.cleanupExpiredTokens();

      expect(result).toBe(0);
    });

    it('should only delete unsubmitted reports', async () => {
      mockProgressReportRepository.delete.mockResolvedValue({ affected: 2 });

      await service.cleanupExpiredTokens();

      const deleteCall = mockProgressReportRepository.delete.mock.calls[0][0];
      expect(deleteCall.isSubmitted).toBe(false);
    });
  });

  // =============================================
  // Email template generation (integration via public methods)
  // =============================================

  describe('email template content', () => {
    it('should include Japanese content in report request email', async () => {
      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      mockProgressReportRepository.create.mockReturnValue({ ...mockProgressReport });
      mockProgressReportRepository.save.mockResolvedValue({ ...mockProgressReport });
      mockEmailService.sendEmail.mockResolvedValue(true);

      await service.requestReport(
        { taskId: 'task-1', partnerEmail: 'partner@example.com', partnerName: 'Partner Taro' },
        'requester-1',
      );

      const emailCall = mockEmailService.sendEmail.mock.calls[0][0];
      expect(emailCall.subject).toContain('進捗報告リクエスト');
      expect(emailCall.html).toContain('進捗報告リクエスト');
      expect(emailCall.html).toContain('Partner Taro');
      expect(emailCall.text).toContain('進捗報告リクエスト');
      expect(emailCall.text).toContain('Partner Taro');
    });

    it('should include progress percentage in report received notification email', async () => {
      const report = {
        ...mockProgressReport,
        tokenExpiresAt: futureDate,
        isSubmitted: false,
        task: { ...mockTask, project: { ...mockProject, owner: mockOwner } },
      };
      mockProgressReportRepository.findOne.mockResolvedValue(report);
      mockProgressReportRepository.save.mockImplementation((r) => Promise.resolve(r));
      mockTaskRepository.findOne.mockResolvedValue({
        ...mockTask,
        project: { ...mockProject, owner: mockOwner },
      });
      mockTaskRepository.update.mockResolvedValue({ affected: 1 });
      mockEmailService.sendEmail.mockResolvedValue(true);

      await service.submitReport('mock-uuid-token', {
        reporterName: 'Partner Taro',
        progress: 80,
        comment: 'Almost done',
      });

      const emailCall = mockEmailService.sendEmail.mock.calls[0][0];
      expect(emailCall.subject).toContain('80%');
      expect(emailCall.html).toContain('80%');
      expect(emailCall.html).toContain('Almost done');
      expect(emailCall.text).toContain('80%');
      expect(emailCall.text).toContain('Almost done');
    });

    it('should omit comment section in received email when comment is null', async () => {
      const report = {
        ...mockProgressReport,
        tokenExpiresAt: futureDate,
        isSubmitted: false,
        task: { ...mockTask, project: { ...mockProject, owner: mockOwner } },
      };
      mockProgressReportRepository.findOne.mockResolvedValue(report);
      mockProgressReportRepository.save.mockImplementation((r) => Promise.resolve(r));
      mockTaskRepository.findOne.mockResolvedValue({
        ...mockTask,
        project: { ...mockProject, owner: mockOwner },
      });
      mockTaskRepository.update.mockResolvedValue({ affected: 1 });
      mockEmailService.sendEmail.mockResolvedValue(true);

      await service.submitReport('mock-uuid-token', {
        reporterName: 'Partner Taro',
        progress: 50,
      });

      const emailCall = mockEmailService.sendEmail.mock.calls[0][0];
      // When comment is null, the text template should NOT contain "コメント:"
      expect(emailCall.text).not.toContain('コメント:');
    });
  });

  // =============================================
  // Edge cases and full flow
  // =============================================

  describe('edge cases', () => {
    it('should handle 0% progress submission', async () => {
      const report = {
        ...mockProgressReport,
        tokenExpiresAt: futureDate,
        isSubmitted: false,
        task: { ...mockTask, project: { ...mockProject, owner: mockOwner } },
      };
      mockProgressReportRepository.findOne.mockResolvedValue(report);
      mockProgressReportRepository.save.mockImplementation((r) => Promise.resolve(r));
      mockTaskRepository.findOne.mockResolvedValue({
        ...mockTask,
        project: { ...mockProject, owner: mockOwner },
      });
      mockTaskRepository.update.mockResolvedValue({ affected: 1 });
      mockEmailService.sendEmail.mockResolvedValue(true);

      await service.submitReport('mock-uuid-token', {
        reporterName: 'Partner Taro',
        progress: 0,
      });

      expect(mockTaskRepository.update).toHaveBeenCalledWith('task-1', {
        progress: 0,
      });
    });

    it('should handle 100% progress submission', async () => {
      const report = {
        ...mockProgressReport,
        tokenExpiresAt: futureDate,
        isSubmitted: false,
        task: { ...mockTask, project: { ...mockProject, owner: mockOwner } },
      };
      mockProgressReportRepository.findOne.mockResolvedValue(report);
      mockProgressReportRepository.save.mockImplementation((r) => Promise.resolve(r));
      mockTaskRepository.findOne.mockResolvedValue({
        ...mockTask,
        project: { ...mockProject, owner: mockOwner },
      });
      mockTaskRepository.update.mockResolvedValue({ affected: 1 });
      mockEmailService.sendEmail.mockResolvedValue(true);

      await service.submitReport('mock-uuid-token', {
        reporterName: 'Partner Taro',
        progress: 100,
        comment: 'Task completed',
      });

      expect(mockTaskRepository.update).toHaveBeenCalledWith('task-1', {
        progress: 100,
      });
    });

    it('should handle multiple attachment URLs', async () => {
      const report = {
        ...mockProgressReport,
        tokenExpiresAt: futureDate,
        isSubmitted: false,
        task: { ...mockTask, project: { ...mockProject, owner: mockOwner } },
      };
      const attachmentUrls = [
        'https://example.com/file1.pdf',
        'https://example.com/file2.png',
        'https://example.com/file3.doc',
      ];
      mockProgressReportRepository.findOne.mockResolvedValue(report);
      mockProgressReportRepository.save.mockImplementation((r) => Promise.resolve(r));
      mockTaskRepository.findOne.mockResolvedValue({
        ...mockTask,
        project: { ...mockProject, owner: mockOwner },
      });
      mockTaskRepository.update.mockResolvedValue({ affected: 1 });
      mockEmailService.sendEmail.mockResolvedValue(true);

      await service.submitReport('mock-uuid-token', {
        reporterName: 'Partner Taro',
        progress: 60,
        attachmentUrls,
      });

      const saveCall = mockProgressReportRepository.save.mock.calls[0][0];
      expect(saveCall.attachmentUrls).toEqual(attachmentUrls);
    });
  });

  // =============================================
  // All ProgressReportStatus values
  // =============================================

  describe('status coverage', () => {
    it.each([ProgressReportStatus.REVIEWED, ProgressReportStatus.REJECTED])(
      'should allow review with status %s',
      async (status) => {
        const submittedReport = {
          ...mockProgressReport,
          isSubmitted: true,
        };
        mockProgressReportRepository.findOne.mockResolvedValue(submittedReport);
        mockProgressReportRepository.save.mockImplementation((r) => Promise.resolve(r));

        const dto: ReviewReportDto = { status: status as any };
        const result = await service.reviewReport('report-1', dto, 'reviewer-1');

        const saveCall = mockProgressReportRepository.save.mock.calls[0][0];
        expect(saveCall.status).toBe(status);
      },
    );
  });
});
