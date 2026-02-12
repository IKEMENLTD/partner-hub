import { Test, TestingModule } from '@nestjs/testing';
import { ProgressReportController } from './progress-report.controller';
import { ProgressReportService } from './progress-report.service';

describe('ProgressReportController', () => {
  let controller: ProgressReportController;

  const mockReport = {
    id: 'report-uuid-1',
    taskId: 'task-1',
    reporterName: 'Partner User',
    reporterEmail: 'partner@test.com',
    progress: 60,
    status: 'submitted',
    comment: 'Good progress',
    attachmentUrls: [],
    reviewerComment: null,
    reviewedAt: null,
    tokenExpiresAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProgressReportService = {
    requestReport: jest.fn(),
    getFormData: jest.fn(),
    submitReport: jest.fn(),
    getReportsByTask: jest.fn(),
    getReportById: jest.fn(),
    reviewReport: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProgressReportController],
      providers: [
        { provide: ProgressReportService, useValue: mockProgressReportService },
      ],
    }).compile();

    controller = module.get<ProgressReportController>(ProgressReportController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('requestReport', () => {
    it('should request a progress report', async () => {
      const dto = { taskId: 'task-1', reporterEmail: 'partner@test.com' };
      mockProgressReportService.requestReport.mockResolvedValue(mockReport);

      const req = { user: { id: 'user-1' } };
      const result = await controller.requestReport(dto as any, req, 'org-1');

      expect(result.success).toBe(true);
      expect(result.data.id).toBe('report-uuid-1');
      expect(result.message).toBe('進捗報告リクエストを送信しました');
      expect(mockProgressReportService.requestReport).toHaveBeenCalledWith(dto, 'user-1', 'org-1');
    });

    it('should propagate errors', async () => {
      mockProgressReportService.requestReport.mockRejectedValue(new Error('Task not found'));

      const req = { user: { id: 'user-1' } };
      await expect(controller.requestReport({} as any, req, 'org-1')).rejects.toThrow('Task not found');
    });
  });

  describe('getFormData', () => {
    it('should return form data for a token', async () => {
      const task = {
        id: 'task-1',
        title: 'Task Title',
        description: 'Desc',
        dueDate: new Date(),
        project: { id: 'proj-1', name: 'Project 1' },
      };
      mockProgressReportService.getFormData.mockResolvedValue({ report: mockReport, task });

      const result = await controller.getFormData('test-token');

      expect(result.success).toBe(true);
      expect(result.data.reportId).toBe('report-uuid-1');
      expect(result.data.task.title).toBe('Task Title');
    });

    it('should propagate errors for invalid token', async () => {
      mockProgressReportService.getFormData.mockRejectedValue(new Error('Invalid token'));

      await expect(controller.getFormData('bad-token')).rejects.toThrow('Invalid token');
    });
  });

  describe('submitReport', () => {
    it('should submit a progress report', async () => {
      const dto = { progress: 75, comment: 'Making progress' };
      mockProgressReportService.submitReport.mockResolvedValue(mockReport);

      const result = await controller.submitReport('test-token', dto as any);

      expect(result.success).toBe(true);
      expect(result.data.id).toBe('report-uuid-1');
      expect(result.message).toContain('進捗報告を送信しました');
    });
  });

  describe('getReportsByTask', () => {
    it('should return reports for a task', async () => {
      mockProgressReportService.getReportsByTask.mockResolvedValue([mockReport]);

      const result = await controller.getReportsByTask('task-1', 'org-1');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('report-uuid-1');
    });
  });

  describe('getReportById', () => {
    it('should return a report by id', async () => {
      mockProgressReportService.getReportById.mockResolvedValue(mockReport);

      const result = await controller.getReportById('report-1', 'org-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockReport);
    });

    it('should propagate not found errors', async () => {
      mockProgressReportService.getReportById.mockRejectedValue(new Error('Not found'));

      await expect(controller.getReportById('invalid', 'org-1')).rejects.toThrow('Not found');
    });
  });

  describe('reviewReport', () => {
    it('should review a progress report', async () => {
      const dto = { status: 'approved', reviewerComment: 'Looks good' };
      const reviewedReport = {
        ...mockReport,
        status: 'approved',
        reviewerComment: 'Looks good',
        reviewedAt: new Date(),
      };
      mockProgressReportService.reviewReport.mockResolvedValue(reviewedReport);

      const req = { user: { id: 'user-1' } };
      const result = await controller.reviewReport('report-1', dto as any, req, 'org-1');

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('approved');
      expect(result.message).toBe('進捗報告をレビューしました');
    });
  });
});
