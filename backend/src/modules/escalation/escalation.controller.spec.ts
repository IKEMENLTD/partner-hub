import { Test, TestingModule } from '@nestjs/testing';
import { EscalationController } from './escalation.controller';
import { EscalationService } from './escalation.service';

describe('EscalationController', () => {
  let controller: EscalationController;

  const mockEscalationService = {
    findAllRules: jest.fn(),
    findRuleById: jest.fn(),
    createRule: jest.fn(),
    updateRule: jest.fn(),
    deleteRule: jest.fn(),
    findAllLogs: jest.fn(),
    getEscalationHistory: jest.fn(),
    triggerEscalationCheck: jest.fn(),
    getEscalationStatistics: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EscalationController],
      providers: [
        { provide: EscalationService, useValue: mockEscalationService },
      ],
    }).compile();

    controller = module.get<EscalationController>(EscalationController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ========================
  // Rules Endpoints
  // ========================

  describe('findAllRules', () => {
    it('should return all escalation rules', async () => {
      const rules = { data: [{ id: 'rule-1' }], total: 1 };
      mockEscalationService.findAllRules.mockResolvedValue(rules);

      const result = await controller.findAllRules({} as any, 'org-1');

      expect(result).toEqual(rules);
    });
  });

  describe('findRuleById', () => {
    it('should return a rule by id', async () => {
      const rule = { id: 'rule-1', name: 'Test Rule' };
      mockEscalationService.findRuleById.mockResolvedValue(rule);

      const result = await controller.findRuleById('rule-1', 'org-1');

      expect(result).toEqual(rule);
      expect(mockEscalationService.findRuleById).toHaveBeenCalledWith('rule-1', 'org-1');
    });

    it('should propagate not found errors', async () => {
      mockEscalationService.findRuleById.mockRejectedValue(new Error('Not found'));

      await expect(controller.findRuleById('invalid', 'org-1')).rejects.toThrow('Not found');
    });
  });

  describe('createRule', () => {
    it('should create a new escalation rule', async () => {
      const createDto = { name: 'New Rule', triggerType: 'DAYS_AFTER_DUE' };
      const rule = { id: 'rule-1', ...createDto };
      mockEscalationService.createRule.mockResolvedValue(rule);

      const result = await controller.createRule(createDto as any, 'user-1');

      expect(result).toEqual(rule);
      expect(mockEscalationService.createRule).toHaveBeenCalledWith(createDto, 'user-1');
    });
  });

  describe('updateRule', () => {
    it('should update an escalation rule', async () => {
      const updateDto = { name: 'Updated Rule' };
      mockEscalationService.updateRule.mockResolvedValue({ id: 'rule-1', ...updateDto });

      const result = await controller.updateRule('rule-1', updateDto as any, 'org-1');

      expect(result.name).toBe('Updated Rule');
      expect(mockEscalationService.updateRule).toHaveBeenCalledWith('rule-1', updateDto, 'org-1');
    });
  });

  describe('deleteRule', () => {
    it('should delete an escalation rule', async () => {
      mockEscalationService.deleteRule.mockResolvedValue(undefined);

      await controller.deleteRule('rule-1', 'org-1');

      expect(mockEscalationService.deleteRule).toHaveBeenCalledWith('rule-1', 'org-1');
    });
  });

  // ========================
  // Logs Endpoints
  // ========================

  describe('findAllLogs', () => {
    it('should return all escalation logs', async () => {
      const logs = { data: [{ id: 'log-1' }], total: 1 };
      mockEscalationService.findAllLogs.mockResolvedValue(logs);

      const result = await controller.findAllLogs({} as any, 'org-1');

      expect(result).toEqual(logs);
    });
  });

  describe('getEscalationHistory', () => {
    it('should return escalation history for a project', async () => {
      const history = [{ id: 'log-1', projectId: 'proj-1' }];
      mockEscalationService.getEscalationHistory.mockResolvedValue(history);

      const result = await controller.getEscalationHistory('proj-1', 'org-1');

      expect(result).toEqual(history);
      expect(mockEscalationService.getEscalationHistory).toHaveBeenCalledWith('proj-1', 'org-1');
    });
  });

  // ========================
  // Escalation Check
  // ========================

  describe('triggerCheck', () => {
    it('should trigger an escalation check', async () => {
      const checkResult = { tasksChecked: 10, escalationsTriggered: 2, logs: [] };
      mockEscalationService.triggerEscalationCheck.mockResolvedValue(checkResult);

      const result = await controller.triggerCheck({} as any, 'org-1');

      expect(result).toEqual(checkResult);
    });
  });

  // ========================
  // Statistics
  // ========================

  describe('getStatistics', () => {
    it('should return escalation statistics', async () => {
      const stats = { totalRules: 5, totalLogs: 100 };
      mockEscalationService.getEscalationStatistics.mockResolvedValue(stats);

      const result = await controller.getStatistics('org-1');

      expect(result).toEqual(stats);
    });
  });
});
