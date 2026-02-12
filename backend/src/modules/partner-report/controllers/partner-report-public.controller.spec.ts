import { Test, TestingModule } from '@nestjs/testing';
import { PartnerReportPublicController } from './partner-report-public.controller';
import { PartnerReportService } from '../services/partner-report.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Project } from '../../project/entities/project.entity';
import { Task } from '../../task/entities/task.entity';
import { ReportTokenGuard } from '../guards/report-token.guard';

describe('PartnerReportPublicController', () => {
  let controller: PartnerReportPublicController;

  const mockReportService = {
    createFromPartner: jest.fn(),
    getPartnerReportHistory: jest.fn(),
  };

  const mockProjectRepository = {
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
  };

  const mockTaskRepository = {
    createQueryBuilder: jest.fn(),
  };

  // Helper to create a chainable query builder mock
  const createQueryBuilderMock = (result: any) => {
    const qb: any = {
      innerJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(result),
    };
    return qb;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PartnerReportPublicController],
      providers: [
        { provide: PartnerReportService, useValue: mockReportService },
        { provide: getRepositoryToken(Project), useValue: mockProjectRepository },
        { provide: getRepositoryToken(Task), useValue: mockTaskRepository },
      ],
    })
      .overrideGuard(ReportTokenGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PartnerReportPublicController>(PartnerReportPublicController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getReportFormInfo', () => {
    it('should return report form info with partner and projects', async () => {
      const projects = [{ id: 'proj-1', name: 'Project 1', status: 'active' }];
      const qb = createQueryBuilderMock(projects);
      mockProjectRepository.createQueryBuilder.mockReturnValue(qb);

      const req = {
        partner: { id: 'p-1', name: 'Partner 1', email: 'p@test.com', companyName: 'Co' },
        reportToken: { expiresAt: new Date(), projectId: null },
      };

      const result = await controller.getReportFormInfo(req);

      expect(result.partner).toEqual({
        id: 'p-1',
        name: 'Partner 1',
        email: 'p@test.com',
        companyName: 'Co',
      });
      expect(result.projects).toEqual(projects);
      expect(result.reportTypes).toHaveLength(4);
    });
  });

  describe('submitReport', () => {
    it('should submit a report', async () => {
      const report = { id: 'report-1', reportType: 'progress', createdAt: new Date() };
      mockReportService.createFromPartner.mockResolvedValue(report);

      const req = {
        partner: { id: 'p-1' },
        reportToken: { projectId: null },
        organizationId: 'org-1',
      };
      const dto = { reportType: 'progress', content: 'Update' };

      const result = await controller.submitReport(req, dto as any);

      expect(result.message).toBe('報告を送信しました');
      expect(result.report.id).toBe('report-1');
    });

    it('should override projectId when token has restriction', async () => {
      const report = { id: 'report-1', reportType: 'progress', createdAt: new Date() };
      mockReportService.createFromPartner.mockResolvedValue(report);

      const req = {
        partner: { id: 'p-1' },
        reportToken: { projectId: 'restricted-proj' },
        organizationId: 'org-1',
      };
      const dto = { reportType: 'progress', content: 'Update', projectId: 'other-proj' };

      await controller.submitReport(req, dto as any);

      expect(mockReportService.createFromPartner).toHaveBeenCalledWith(
        'p-1',
        'org-1',
        expect.objectContaining({ projectId: 'restricted-proj' }),
        'web_form',
      );
    });
  });

  describe('getPartnerProjects', () => {
    it('should return partner projects', async () => {
      const projects = [{ id: 'proj-1', name: 'Project 1' }];
      const qb = createQueryBuilderMock(projects);
      mockProjectRepository.createQueryBuilder.mockReturnValue(qb);

      const req = {
        partner: { id: 'p-1' },
        reportToken: { projectId: null },
      };

      const result = await controller.getPartnerProjects(req);

      expect(result.projects).toEqual(projects);
    });

    it('should return restricted project when token has projectId', async () => {
      const project = { id: 'proj-1', name: 'Project 1', status: 'active', description: 'Test' };
      mockProjectRepository.findOne.mockResolvedValue(project);

      const req = {
        partner: { id: 'p-1' },
        reportToken: { projectId: 'proj-1' },
      };

      const result = await controller.getPartnerProjects(req);

      expect(result.projects).toEqual([project]);
    });
  });

  describe('getReportHistory', () => {
    it('should return report history', async () => {
      const reports = [
        {
          id: 'r-1',
          reportType: 'progress',
          progressStatus: 'on_track',
          content: 'Short content',
          weeklyAccomplishments: 'Weekly summary',
          project: { name: 'Project 1' },
          createdAt: new Date(),
        },
      ];
      mockReportService.getPartnerReportHistory.mockResolvedValue(reports);

      const req = { partner: { id: 'p-1' } };

      const result = await controller.getReportHistory(req);

      expect(result.reports).toHaveLength(1);
      expect(result.reports[0].id).toBe('r-1');
    });
  });

  describe('getPartnerTasks', () => {
    it('should return partner tasks', async () => {
      const tasks = [
        {
          id: 't-1',
          title: 'Task 1',
          description: 'Short desc',
          status: 'todo',
          priority: 'high',
          dueDate: new Date(),
          projectId: 'proj-1',
          project: { name: 'Project 1' },
        },
      ];
      const qb = createQueryBuilderMock(tasks);
      mockTaskRepository.createQueryBuilder.mockReturnValue(qb);

      const req = {
        partner: { id: 'p-1' },
        reportToken: { projectId: null },
      };

      const result = await controller.getPartnerTasks(req);

      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].id).toBe('t-1');
    });
  });

  describe('getDashboard', () => {
    it('should return dashboard data', async () => {
      const projects = [{ id: 'proj-1', name: 'P1', status: 'active', description: null, startDate: null, endDate: null }];
      const tasks = [
        {
          id: 't-1',
          title: 'Task 1',
          status: 'todo',
          priority: 'medium',
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          projectId: 'proj-1',
          project: { name: 'P1' },
        },
      ];
      const recentReports = [
        { id: 'r-1', reportType: 'progress', progressStatus: null, project: { name: 'P1' }, createdAt: new Date() },
      ];

      const projectQb = createQueryBuilderMock(projects);
      const taskQb = createQueryBuilderMock(tasks);
      mockProjectRepository.createQueryBuilder.mockReturnValue(projectQb);
      mockTaskRepository.createQueryBuilder.mockReturnValue(taskQb);
      mockReportService.getPartnerReportHistory.mockResolvedValue(recentReports);

      const req = {
        partner: { id: 'p-1', name: 'Partner', email: 'p@test.com', companyName: 'Co' },
        reportToken: { expiresAt: new Date(), projectId: null },
      };

      const result = await controller.getDashboard(req);

      expect(result.partner.id).toBe('p-1');
      expect(result.stats.projects).toBe(1);
      expect(result.stats.tasks.total).toBe(1);
    });
  });
});
