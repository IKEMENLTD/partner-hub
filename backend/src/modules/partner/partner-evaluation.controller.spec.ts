import { Test, TestingModule } from '@nestjs/testing';
import { PartnerEvaluationController } from './partner-evaluation.controller';
import { PartnerEvaluationService } from './services/partner-evaluation.service';

describe('PartnerEvaluationController', () => {
  let controller: PartnerEvaluationController;

  const mockEvaluationService = {
    getEvaluationSummary: jest.fn(),
    getEvaluationHistory: jest.fn(),
    createEvaluation: jest.fn(),
    getAutoMetrics: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PartnerEvaluationController],
      providers: [
        { provide: PartnerEvaluationService, useValue: mockEvaluationService },
      ],
    }).compile();

    controller = module.get<PartnerEvaluationController>(PartnerEvaluationController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getEvaluationSummary', () => {
    it('should return evaluation summary for a partner', async () => {
      const summary = { partnerId: 'p-1', averageRating: 4.5, totalEvaluations: 10 };
      mockEvaluationService.getEvaluationSummary.mockResolvedValue(summary);

      const result = await controller.getEvaluationSummary('p-1');

      expect(result).toEqual(summary);
      expect(mockEvaluationService.getEvaluationSummary).toHaveBeenCalledWith('p-1');
    });

    it('should propagate errors', async () => {
      mockEvaluationService.getEvaluationSummary.mockRejectedValue(new Error('Not found'));

      await expect(controller.getEvaluationSummary('invalid')).rejects.toThrow('Not found');
    });
  });

  describe('getEvaluationHistory', () => {
    it('should return evaluation history', async () => {
      const history = { data: [], total: 0 };
      const queryDto = { page: 1, limit: 10 };
      mockEvaluationService.getEvaluationHistory.mockResolvedValue(history);

      const result = await controller.getEvaluationHistory('p-1', queryDto as any);

      expect(result).toEqual(history);
      expect(mockEvaluationService.getEvaluationHistory).toHaveBeenCalledWith('p-1', queryDto);
    });
  });

  describe('createEvaluation', () => {
    it('should create a manual evaluation', async () => {
      const createDto = { rating: 4, comment: 'Good work' };
      const evaluation = { id: 'eval-1', ...createDto };
      mockEvaluationService.createEvaluation.mockResolvedValue(evaluation);

      const result = await controller.createEvaluation('p-1', createDto as any, 'user-1');

      expect(result).toEqual(evaluation);
      expect(mockEvaluationService.createEvaluation).toHaveBeenCalledWith('p-1', 'user-1', createDto);
    });

    it('should propagate validation errors', async () => {
      mockEvaluationService.createEvaluation.mockRejectedValue(new Error('Invalid data'));

      await expect(
        controller.createEvaluation('p-1', {} as any, 'user-1'),
      ).rejects.toThrow('Invalid data');
    });
  });

  describe('getAutoMetrics', () => {
    it('should return auto-calculated metrics', async () => {
      const metrics = {
        deadlineCompliance: 0.95,
        reportSubmissionRate: 0.88,
        responseTime: 2.5,
      };
      mockEvaluationService.getAutoMetrics.mockResolvedValue(metrics);

      const result = await controller.getAutoMetrics('p-1');

      expect(result).toEqual(metrics);
      expect(mockEvaluationService.getAutoMetrics).toHaveBeenCalledWith('p-1');
    });
  });
});
