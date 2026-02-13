import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { EscalationExecutorService } from './escalation-executor.service';
import { EscalationRuleService } from './escalation-rule.service';
import { EscalationLog } from '../entities/escalation-log.entity';
import { EscalationRule } from '../entities/escalation-rule.entity';
import { Project } from '../../project/entities/project.entity';
import { ProjectStakeholder } from '../../project/entities/project-stakeholder.entity';
import { Partner } from '../../partner/entities/partner.entity';
import { Task } from '../../task/entities/task.entity';
import { ReminderService } from '../../reminder/reminder.service';
import { SmsService } from '../../notification/services/sms.service';
import { SystemSettingsService } from '../../system-settings/system-settings.service';
import {
  EscalationAction,
  EscalationTriggerType,
  EscalationLogStatus,
} from '../enums/escalation.enum';
import { TaskStatus } from '../../task/enums/task-status.enum';
import { ReminderType, ReminderChannel } from '../../reminder/enums/reminder-type.enum';

// ===== Helper factories =====

function createMockTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Test Task',
    projectId: 'project-1',
    assigneeId: 'user-assignee',
    status: TaskStatus.IN_PROGRESS,
    progress: 50,
    dueDate: new Date('2026-02-10'),
    ...overrides,
  } as Task;
}

function createMockRule(overrides: Partial<EscalationRule> = {}): EscalationRule {
  return {
    id: 'rule-1',
    name: 'Test Rule',
    projectId: 'project-1',
    triggerType: EscalationTriggerType.DAYS_BEFORE_DUE,
    triggerValue: 3,
    action: EscalationAction.NOTIFY_OWNER,
    escalateToUserId: undefined,
    ...overrides,
  } as EscalationRule;
}

function createMockLog(overrides: Partial<EscalationLog> = {}): EscalationLog {
  return {
    id: 'log-1',
    ruleId: 'rule-1',
    taskId: 'task-1',
    projectId: 'project-1',
    action: EscalationAction.NOTIFY_OWNER,
    status: EscalationLogStatus.PENDING,
    notifiedUsers: [],
    actionDetail: null,
    escalatedToUserId: null,
    errorMessage: null,
    executedAt: null,
    ...overrides,
  } as unknown as EscalationLog;
}

// ===== Tests =====

describe('EscalationExecutorService', () => {
  let service: EscalationExecutorService;
  let escalationLogRepo: jest.Mocked<Repository<EscalationLog>>;
  let projectRepo: jest.Mocked<Repository<Project>>;
  let stakeholderRepo: jest.Mocked<Repository<ProjectStakeholder>>;
  let reminderService: jest.Mocked<ReminderService>;
  let ruleService: jest.Mocked<EscalationRuleService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EscalationExecutorService,
        {
          provide: getRepositoryToken(EscalationLog),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Project),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ProjectStakeholder),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: ReminderService,
          useValue: {
            create: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: EscalationRuleService,
          useValue: {
            getActiveRulesForTask: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: getRepositoryToken(Partner),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: SmsService,
          useValue: {
            sendSms: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: SystemSettingsService,
          useValue: {
            getSettings: jest.fn().mockResolvedValue(null),
          },
        },
      ],
    }).compile();

    service = module.get<EscalationExecutorService>(EscalationExecutorService);
    escalationLogRepo = module.get(getRepositoryToken(EscalationLog));
    projectRepo = module.get(getRepositoryToken(Project));
    stakeholderRepo = module.get(getRepositoryToken(ProjectStakeholder));
    reminderService = module.get(ReminderService);
    ruleService = module.get(EscalationRuleService);
  });

  // -----------------------------------------------------------------
  // evaluateRule — private method, tested indirectly via checkAndTriggerEscalation
  // -----------------------------------------------------------------
  describe('evaluateRule (via checkAndTriggerEscalation)', () => {
    // Setup helper: makes checkAndTriggerEscalation return logs for triggered rules
    function setupForRuleEvaluation(rule: EscalationRule) {
      ruleService.getActiveRulesForTask.mockResolvedValue([rule]);
      escalationLogRepo.findOne
        .mockResolvedValueOnce(null)           // no duplicate today
        .mockResolvedValueOnce(createMockLog()); // findOne after save
      escalationLogRepo.create.mockReturnValue(createMockLog());
      escalationLogRepo.save.mockResolvedValue(createMockLog());
    }

    describe('DAYS_BEFORE_DUE', () => {
      it('should trigger when daysDiff is within range (daysDiff = triggerValue)', async () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDate = new Date(today);
        dueDate.setDate(dueDate.getDate() + 3); // 3 days from now

        const rule = createMockRule({
          triggerType: EscalationTriggerType.DAYS_BEFORE_DUE,
          triggerValue: 3,
        });
        const task = createMockTask({ dueDate });

        setupForRuleEvaluation(rule);

        const logs = await service.checkAndTriggerEscalation(task);
        expect(logs).toHaveLength(1);
      });

      it('should trigger when daysDiff = 0 (due today)', async () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const rule = createMockRule({
          triggerType: EscalationTriggerType.DAYS_BEFORE_DUE,
          triggerValue: 3,
        });
        const task = createMockTask({ dueDate: today });

        setupForRuleEvaluation(rule);

        const logs = await service.checkAndTriggerEscalation(task);
        expect(logs).toHaveLength(1);
      });

      it('should NOT trigger when daysDiff > triggerValue', async () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDate = new Date(today);
        dueDate.setDate(dueDate.getDate() + 10); // 10 days from now, trigger is 3

        const rule = createMockRule({
          triggerType: EscalationTriggerType.DAYS_BEFORE_DUE,
          triggerValue: 3,
        });
        const task = createMockTask({ dueDate });

        ruleService.getActiveRulesForTask.mockResolvedValue([rule]);

        const logs = await service.checkAndTriggerEscalation(task);
        expect(logs).toHaveLength(0);
      });

      it('should NOT trigger when task is past due (daysDiff < 0)', async () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDate = new Date(today);
        dueDate.setDate(dueDate.getDate() - 2); // 2 days ago

        const rule = createMockRule({
          triggerType: EscalationTriggerType.DAYS_BEFORE_DUE,
          triggerValue: 3,
        });
        const task = createMockTask({ dueDate });

        ruleService.getActiveRulesForTask.mockResolvedValue([rule]);

        const logs = await service.checkAndTriggerEscalation(task);
        expect(logs).toHaveLength(0);
      });
    });

    describe('DAYS_AFTER_DUE', () => {
      it('should trigger when overdue days >= triggerValue', async () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDate = new Date(today);
        dueDate.setDate(dueDate.getDate() - 5); // 5 days overdue, trigger is 3

        const rule = createMockRule({
          triggerType: EscalationTriggerType.DAYS_AFTER_DUE,
          triggerValue: 3,
        });
        const task = createMockTask({ dueDate });

        setupForRuleEvaluation(rule);

        const logs = await service.checkAndTriggerEscalation(task);
        expect(logs).toHaveLength(1);
      });

      it('should trigger at exact boundary (overdue days = triggerValue)', async () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDate = new Date(today);
        dueDate.setDate(dueDate.getDate() - 3); // exactly 3 days overdue

        const rule = createMockRule({
          triggerType: EscalationTriggerType.DAYS_AFTER_DUE,
          triggerValue: 3,
        });
        const task = createMockTask({ dueDate });

        setupForRuleEvaluation(rule);

        const logs = await service.checkAndTriggerEscalation(task);
        expect(logs).toHaveLength(1);
      });

      it('should NOT trigger when overdue days < triggerValue', async () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDate = new Date(today);
        dueDate.setDate(dueDate.getDate() - 1); // 1 day overdue, trigger is 3

        const rule = createMockRule({
          triggerType: EscalationTriggerType.DAYS_AFTER_DUE,
          triggerValue: 3,
        });
        const task = createMockTask({ dueDate });

        ruleService.getActiveRulesForTask.mockResolvedValue([rule]);

        const logs = await service.checkAndTriggerEscalation(task);
        expect(logs).toHaveLength(0);
      });

      it('should NOT trigger when task is not yet due (daysDiff >= 0)', async () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDate = new Date(today);
        dueDate.setDate(dueDate.getDate() + 2); // 2 days from now

        const rule = createMockRule({
          triggerType: EscalationTriggerType.DAYS_AFTER_DUE,
          triggerValue: 1,
        });
        const task = createMockTask({ dueDate });

        ruleService.getActiveRulesForTask.mockResolvedValue([rule]);

        const logs = await service.checkAndTriggerEscalation(task);
        expect(logs).toHaveLength(0);
      });
    });

    describe('PROGRESS_BELOW', () => {
      it('should trigger when progress < triggerValue AND daysDiff <= 3', async () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDate = new Date(today);
        dueDate.setDate(dueDate.getDate() + 2); // 2 days until due

        const rule = createMockRule({
          triggerType: EscalationTriggerType.PROGRESS_BELOW,
          triggerValue: 80,
        });
        const task = createMockTask({ dueDate, progress: 30 });

        setupForRuleEvaluation(rule);

        const logs = await service.checkAndTriggerEscalation(task);
        expect(logs).toHaveLength(1);
      });

      it('should trigger at boundary (daysDiff = 3)', async () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDate = new Date(today);
        dueDate.setDate(dueDate.getDate() + 3); // exactly 3 days

        const rule = createMockRule({
          triggerType: EscalationTriggerType.PROGRESS_BELOW,
          triggerValue: 50,
        });
        const task = createMockTask({ dueDate, progress: 20 });

        setupForRuleEvaluation(rule);

        const logs = await service.checkAndTriggerEscalation(task);
        expect(logs).toHaveLength(1);
      });

      it('should trigger when task is overdue (daysDiff < 0) with low progress', async () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDate = new Date(today);
        dueDate.setDate(dueDate.getDate() - 1); // 1 day overdue (daysDiff = -1 <= 3)

        const rule = createMockRule({
          triggerType: EscalationTriggerType.PROGRESS_BELOW,
          triggerValue: 80,
        });
        const task = createMockTask({ dueDate, progress: 10 });

        setupForRuleEvaluation(rule);

        const logs = await service.checkAndTriggerEscalation(task);
        expect(logs).toHaveLength(1);
      });

      it('should NOT trigger when progress >= triggerValue', async () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDate = new Date(today);
        dueDate.setDate(dueDate.getDate() + 1);

        const rule = createMockRule({
          triggerType: EscalationTriggerType.PROGRESS_BELOW,
          triggerValue: 50,
        });
        const task = createMockTask({ dueDate, progress: 80 });

        ruleService.getActiveRulesForTask.mockResolvedValue([rule]);

        const logs = await service.checkAndTriggerEscalation(task);
        expect(logs).toHaveLength(0);
      });

      it('should NOT trigger when daysDiff > 3 even if progress is low', async () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDate = new Date(today);
        dueDate.setDate(dueDate.getDate() + 10); // 10 days away

        const rule = createMockRule({
          triggerType: EscalationTriggerType.PROGRESS_BELOW,
          triggerValue: 80,
        });
        const task = createMockTask({ dueDate, progress: 10 });

        ruleService.getActiveRulesForTask.mockResolvedValue([rule]);

        const logs = await service.checkAndTriggerEscalation(task);
        expect(logs).toHaveLength(0);
      });
    });
  });

  // -----------------------------------------------------------------
  // checkAndTriggerEscalation — full flow
  // -----------------------------------------------------------------
  describe('checkAndTriggerEscalation', () => {
    it('should return empty array when task has no dueDate', async () => {
      const task = createMockTask({ dueDate: undefined });

      const logs = await service.checkAndTriggerEscalation(task);

      expect(logs).toEqual([]);
      expect(ruleService.getActiveRulesForTask).not.toHaveBeenCalled();
    });

    it('should return empty array when task has null dueDate', async () => {
      const task = createMockTask({ dueDate: null as any });

      const logs = await service.checkAndTriggerEscalation(task);

      expect(logs).toEqual([]);
    });

    it('should skip COMPLETED tasks', async () => {
      const task = createMockTask({ status: TaskStatus.COMPLETED });

      const logs = await service.checkAndTriggerEscalation(task);

      expect(logs).toEqual([]);
      expect(ruleService.getActiveRulesForTask).not.toHaveBeenCalled();
    });

    it('should skip CANCELLED tasks', async () => {
      const task = createMockTask({ status: TaskStatus.CANCELLED });

      const logs = await service.checkAndTriggerEscalation(task);

      expect(logs).toEqual([]);
      expect(ruleService.getActiveRulesForTask).not.toHaveBeenCalled();
    });

    it('should process IN_PROGRESS tasks', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDate = new Date(today);
      dueDate.setDate(dueDate.getDate() + 1);

      const rule = createMockRule({
        triggerType: EscalationTriggerType.DAYS_BEFORE_DUE,
        triggerValue: 5,
      });
      const task = createMockTask({ status: TaskStatus.IN_PROGRESS, dueDate });

      ruleService.getActiveRulesForTask.mockResolvedValue([rule]);
      escalationLogRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(createMockLog());
      escalationLogRepo.create.mockReturnValue(createMockLog());
      escalationLogRepo.save.mockResolvedValue(createMockLog());

      const logs = await service.checkAndTriggerEscalation(task);

      expect(logs).toHaveLength(1);
    });

    it('should process TODO tasks', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDate = new Date(today);
      dueDate.setDate(dueDate.getDate() + 1);

      const rule = createMockRule({
        triggerType: EscalationTriggerType.DAYS_BEFORE_DUE,
        triggerValue: 5,
      });
      const task = createMockTask({ status: TaskStatus.TODO, dueDate });

      ruleService.getActiveRulesForTask.mockResolvedValue([rule]);
      escalationLogRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(createMockLog());
      escalationLogRepo.create.mockReturnValue(createMockLog());
      escalationLogRepo.save.mockResolvedValue(createMockLog());

      const logs = await service.checkAndTriggerEscalation(task);

      expect(logs).toHaveLength(1);
    });

    it('should prevent duplicate escalation for same rule+task on same day', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDate = new Date(today);
      dueDate.setDate(dueDate.getDate() + 1);

      const rule = createMockRule({
        triggerType: EscalationTriggerType.DAYS_BEFORE_DUE,
        triggerValue: 5,
      });
      const task = createMockTask({ dueDate });

      ruleService.getActiveRulesForTask.mockResolvedValue([rule]);
      // Return existing log — duplicate found
      escalationLogRepo.findOne.mockResolvedValueOnce(createMockLog());

      const logs = await service.checkAndTriggerEscalation(task);

      expect(logs).toHaveLength(0);
      expect(escalationLogRepo.create).not.toHaveBeenCalled();
    });

    it('should process multiple rules and trigger only matching ones', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDate = new Date(today);
      dueDate.setDate(dueDate.getDate() + 2); // 2 days before due

      const rule1 = createMockRule({
        id: 'rule-1',
        triggerType: EscalationTriggerType.DAYS_BEFORE_DUE,
        triggerValue: 3, // triggers (2 <= 3)
      });
      const rule2 = createMockRule({
        id: 'rule-2',
        triggerType: EscalationTriggerType.DAYS_AFTER_DUE,
        triggerValue: 1, // does NOT trigger (not overdue)
      });
      const rule3 = createMockRule({
        id: 'rule-3',
        triggerType: EscalationTriggerType.PROGRESS_BELOW,
        triggerValue: 80, // triggers (50 < 80 and 2 <= 3)
      });
      const task = createMockTask({ dueDate, progress: 50 });

      ruleService.getActiveRulesForTask.mockResolvedValue([rule1, rule2, rule3]);

      // For rule1: no duplicate, then findOne after save
      // For rule3: no duplicate, then findOne after save
      escalationLogRepo.findOne
        .mockResolvedValueOnce(null)        // rule1 duplicate check
        .mockResolvedValueOnce(createMockLog({ id: 'log-1' })) // rule1 findOne after save
        .mockResolvedValueOnce(null)        // rule3 duplicate check
        .mockResolvedValueOnce(createMockLog({ id: 'log-3' })); // rule3 findOne after save

      escalationLogRepo.create
        .mockReturnValueOnce(createMockLog({ id: 'log-1' }))
        .mockReturnValueOnce(createMockLog({ id: 'log-3' }));
      escalationLogRepo.save
        .mockResolvedValueOnce(createMockLog({ id: 'log-1' }))
        .mockResolvedValueOnce(createMockLog({ id: 'log-3' }));

      const logs = await service.checkAndTriggerEscalation(task);

      expect(logs).toHaveLength(2);
    });

    it('should call getActiveRulesForTask with task projectId and organizationId', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const task = createMockTask({ projectId: 'proj-xyz', dueDate: today });

      ruleService.getActiveRulesForTask.mockResolvedValue([]);

      await service.checkAndTriggerEscalation(task, 'org-1');

      expect(ruleService.getActiveRulesForTask).toHaveBeenCalledWith('proj-xyz', 'org-1');
    });
  });

  // -----------------------------------------------------------------
  // executeEscalation
  // -----------------------------------------------------------------
  describe('executeEscalation', () => {
    beforeEach(() => {
      escalationLogRepo.create.mockReturnValue(createMockLog());
      escalationLogRepo.save.mockResolvedValue(createMockLog());
      escalationLogRepo.findOne.mockResolvedValue(createMockLog());
    });

    it('should create log with PENDING status initially', async () => {
      const rule = createMockRule({ action: EscalationAction.NOTIFY_OWNER });
      const task = createMockTask();

      await service.executeEscalation(rule, task);

      expect(escalationLogRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ruleId: rule.id,
          taskId: task.id,
          projectId: task.projectId,
          action: EscalationAction.NOTIFY_OWNER,
          status: EscalationLogStatus.PENDING,
        }),
      );
    });

    it('should set status to EXECUTED on success', async () => {
      const rule = createMockRule({ action: EscalationAction.NOTIFY_OWNER });
      const task = createMockTask();

      const mockLog = createMockLog();
      escalationLogRepo.create.mockReturnValue(mockLog);

      await service.executeEscalation(rule, task);

      expect(mockLog.status).toBe(EscalationLogStatus.EXECUTED);
      expect(mockLog.executedAt).toBeInstanceOf(Date);
    });

    it('should set status to FAILED and record error on failure', async () => {
      const rule = createMockRule({ action: EscalationAction.NOTIFY_OWNER });
      const task = createMockTask({ assigneeId: undefined }); // will throw

      const mockLog = createMockLog();
      escalationLogRepo.create.mockReturnValue(mockLog);

      await service.executeEscalation(rule, task);

      expect(mockLog.status).toBe(EscalationLogStatus.FAILED);
      expect(mockLog.errorMessage).toBe('タスクに担当者が設定されていません');
    });

    it('should save log and return with relations', async () => {
      const rule = createMockRule({ action: EscalationAction.NOTIFY_OWNER });
      const task = createMockTask();
      const savedLog = createMockLog({ id: 'saved-log' });

      escalationLogRepo.save.mockResolvedValue(savedLog);
      escalationLogRepo.findOne.mockResolvedValue(savedLog);

      const result = await service.executeEscalation(rule, task);

      expect(escalationLogRepo.save).toHaveBeenCalled();
      expect(escalationLogRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'saved-log' },
        relations: ['rule', 'task', 'project', 'escalatedToUser'],
      });
      expect(result).toEqual(savedLog);
    });

    it('should dispatch NOTIFY_OWNER action', async () => {
      const rule = createMockRule({ action: EscalationAction.NOTIFY_OWNER });
      const task = createMockTask();

      await service.executeEscalation(rule, task);

      expect(reminderService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: task.assigneeId,
          type: ReminderType.TASK_OVERDUE,
          channel: ReminderChannel.IN_APP,
        }),
        null,
      );
    });

    it('should dispatch NOTIFY_STAKEHOLDERS action', async () => {
      const rule = createMockRule({ action: EscalationAction.NOTIFY_STAKEHOLDERS });
      const task = createMockTask();

      stakeholderRepo.find.mockResolvedValue([]);
      projectRepo.findOne.mockResolvedValue({
        id: 'project-1',
        ownerId: 'owner-1',
        managerId: 'manager-1',
      } as any);

      await service.executeEscalation(rule, task);

      // Should create reminders for both owner and manager
      expect(reminderService.create).toHaveBeenCalledTimes(2);
    });

    it('should dispatch ESCALATE_TO_MANAGER action', async () => {
      const rule = createMockRule({
        action: EscalationAction.ESCALATE_TO_MANAGER,
        escalateToUserId: 'mgr-override',
      });
      const task = createMockTask();

      await service.executeEscalation(rule, task);

      expect(reminderService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'mgr-override',
          channel: ReminderChannel.EMAIL,
          metadata: expect.objectContaining({
            escalation: true,
            ruleId: rule.id,
            priority: 'high',
          }),
        }),
        null,
      );
    });
  });

  // -----------------------------------------------------------------
  // notifyOwner (via executeEscalation)
  // -----------------------------------------------------------------
  describe('notifyOwner', () => {
    beforeEach(() => {
      escalationLogRepo.create.mockReturnValue(createMockLog());
      escalationLogRepo.save.mockResolvedValue(createMockLog());
      escalationLogRepo.findOne.mockResolvedValue(createMockLog());
    });

    it('should create reminder for task assignee', async () => {
      const rule = createMockRule({ action: EscalationAction.NOTIFY_OWNER });
      const task = createMockTask({ assigneeId: 'user-abc' });

      await service.executeEscalation(rule, task);

      expect(reminderService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: `エスカレーション: ${rule.name}`,
          userId: 'user-abc',
          taskId: task.id,
          projectId: task.projectId,
          type: ReminderType.TASK_OVERDUE,
          channel: ReminderChannel.IN_APP,
        }),
        null,
      );
    });

    it('should set notifiedUsers and actionDetail on log', async () => {
      const rule = createMockRule({ action: EscalationAction.NOTIFY_OWNER });
      const task = createMockTask({ assigneeId: 'user-abc' });
      const mockLog = createMockLog();
      escalationLogRepo.create.mockReturnValue(mockLog);

      await service.executeEscalation(rule, task);

      expect(mockLog.notifiedUsers).toEqual(['user-abc']);
      expect(mockLog.actionDetail).toBe('タスク担当者に通知しました');
    });

    it('should fail when task has no assigneeId', async () => {
      const rule = createMockRule({ action: EscalationAction.NOTIFY_OWNER });
      const task = createMockTask({ assigneeId: undefined });
      const mockLog = createMockLog();
      escalationLogRepo.create.mockReturnValue(mockLog);

      await service.executeEscalation(rule, task);

      expect(mockLog.status).toBe(EscalationLogStatus.FAILED);
      expect(mockLog.errorMessage).toBe('タスクに担当者が設定されていません');
      expect(reminderService.create).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------
  // notifyStakeholders (via executeEscalation)
  // -----------------------------------------------------------------
  describe('notifyStakeholders', () => {
    beforeEach(() => {
      escalationLogRepo.create.mockReturnValue(createMockLog());
      escalationLogRepo.save.mockResolvedValue(createMockLog());
      escalationLogRepo.findOne.mockResolvedValue(createMockLog());
    });

    it('should notify project owner and manager', async () => {
      const rule = createMockRule({ action: EscalationAction.NOTIFY_STAKEHOLDERS });
      const task = createMockTask({ projectId: 'proj-1' });

      stakeholderRepo.find.mockResolvedValue([]);
      projectRepo.findOne.mockResolvedValue({
        id: 'proj-1',
        ownerId: 'owner-1',
        managerId: 'manager-1',
      } as any);

      const mockLog = createMockLog();
      escalationLogRepo.create.mockReturnValue(mockLog);

      await service.executeEscalation(rule, task);

      expect(reminderService.create).toHaveBeenCalledTimes(2);
      expect(reminderService.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'owner-1' }),
        null,
      );
      expect(reminderService.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'manager-1' }),
        null,
      );
      expect(mockLog.notifiedUsers).toEqual(['owner-1', 'manager-1']);
    });

    it('should deduplicate when owner and manager are the same person', async () => {
      const rule = createMockRule({ action: EscalationAction.NOTIFY_STAKEHOLDERS });
      const task = createMockTask();

      stakeholderRepo.find.mockResolvedValue([]);
      projectRepo.findOne.mockResolvedValue({
        id: 'project-1',
        ownerId: 'same-user',
        managerId: 'same-user',
      } as any);

      const mockLog = createMockLog();
      escalationLogRepo.create.mockReturnValue(mockLog);

      await service.executeEscalation(rule, task);

      // Only owner gets notified; manager is skipped because managerId === ownerId
      expect(reminderService.create).toHaveBeenCalledTimes(1);
      expect(mockLog.notifiedUsers).toEqual(['same-user']);
    });

    it('should notify only owner when project has no manager', async () => {
      const rule = createMockRule({ action: EscalationAction.NOTIFY_STAKEHOLDERS });
      const task = createMockTask();

      stakeholderRepo.find.mockResolvedValue([]);
      projectRepo.findOne.mockResolvedValue({
        id: 'project-1',
        ownerId: 'owner-1',
        managerId: null,
      } as any);

      const mockLog = createMockLog();
      escalationLogRepo.create.mockReturnValue(mockLog);

      await service.executeEscalation(rule, task);

      expect(reminderService.create).toHaveBeenCalledTimes(1);
      expect(mockLog.notifiedUsers).toEqual(['owner-1']);
    });

    it('should fail when task has no projectId', async () => {
      const rule = createMockRule({ action: EscalationAction.NOTIFY_STAKEHOLDERS });
      const task = createMockTask({ projectId: undefined });
      const mockLog = createMockLog();
      escalationLogRepo.create.mockReturnValue(mockLog);

      await service.executeEscalation(rule, task);

      expect(mockLog.status).toBe(EscalationLogStatus.FAILED);
      expect(mockLog.errorMessage).toBe('タスクに案件が紐づいていないため関係者に通知できません');
    });

    it('should handle project with no owner or manager', async () => {
      const rule = createMockRule({ action: EscalationAction.NOTIFY_STAKEHOLDERS });
      const task = createMockTask();

      stakeholderRepo.find.mockResolvedValue([]);
      projectRepo.findOne.mockResolvedValue({
        id: 'project-1',
        ownerId: null,
        managerId: null,
      } as any);

      const mockLog = createMockLog();
      escalationLogRepo.create.mockReturnValue(mockLog);

      await service.executeEscalation(rule, task);

      expect(reminderService.create).not.toHaveBeenCalled();
      expect(mockLog.notifiedUsers).toEqual([]);
      expect(mockLog.status).toBe(EscalationLogStatus.EXECUTED);
    });
  });

  // -----------------------------------------------------------------
  // escalateToManager (via executeEscalation)
  // -----------------------------------------------------------------
  describe('escalateToManager', () => {
    beforeEach(() => {
      escalationLogRepo.create.mockReturnValue(createMockLog());
      escalationLogRepo.save.mockResolvedValue(createMockLog());
      escalationLogRepo.findOne.mockResolvedValue(createMockLog());
    });

    it('should use rule.escalateToUserId when provided', async () => {
      const rule = createMockRule({
        action: EscalationAction.ESCALATE_TO_MANAGER,
        escalateToUserId: 'explicit-manager',
      });
      const task = createMockTask();

      await service.executeEscalation(rule, task);

      expect(reminderService.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'explicit-manager' }),
        null,
      );
      expect(projectRepo.findOne).not.toHaveBeenCalled();
    });

    it('should fallback to project.managerId when rule has no escalateToUserId', async () => {
      const rule = createMockRule({
        action: EscalationAction.ESCALATE_TO_MANAGER,
        escalateToUserId: undefined,
      });
      const task = createMockTask({ projectId: 'proj-1' });

      projectRepo.findOne.mockResolvedValue({
        id: 'proj-1',
        managerId: 'project-manager',
        ownerId: 'project-owner',
      } as any);

      const mockLog = createMockLog();
      escalationLogRepo.create.mockReturnValue(mockLog);

      await service.executeEscalation(rule, task);

      expect(reminderService.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'project-manager' }),
        null,
      );
      expect(mockLog.escalatedToUserId).toBe('project-manager');
    });

    it('should fallback to project.ownerId when project has no managerId', async () => {
      const rule = createMockRule({
        action: EscalationAction.ESCALATE_TO_MANAGER,
        escalateToUserId: undefined,
      });
      const task = createMockTask({ projectId: 'proj-1' });

      projectRepo.findOne.mockResolvedValue({
        id: 'proj-1',
        managerId: null,
        ownerId: 'project-owner',
      } as any);

      const mockLog = createMockLog();
      escalationLogRepo.create.mockReturnValue(mockLog);

      await service.executeEscalation(rule, task);

      expect(reminderService.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'project-owner' }),
        null,
      );
      expect(mockLog.escalatedToUserId).toBe('project-owner');
    });

    it('should fail when no manager can be found anywhere', async () => {
      const rule = createMockRule({
        action: EscalationAction.ESCALATE_TO_MANAGER,
        escalateToUserId: undefined,
      });
      const task = createMockTask({ projectId: 'proj-1' });

      projectRepo.findOne.mockResolvedValue({
        id: 'proj-1',
        managerId: null,
        ownerId: null,
      } as any);

      const mockLog = createMockLog();
      escalationLogRepo.create.mockReturnValue(mockLog);

      await service.executeEscalation(rule, task);

      expect(mockLog.status).toBe(EscalationLogStatus.FAILED);
      expect(mockLog.errorMessage).toBe('エスカレーション先の管理者が見つかりません');
      expect(reminderService.create).not.toHaveBeenCalled();
    });

    it('should fail when task has no projectId and rule has no escalateToUserId', async () => {
      const rule = createMockRule({
        action: EscalationAction.ESCALATE_TO_MANAGER,
        escalateToUserId: undefined,
      });
      const task = createMockTask({ projectId: undefined });

      const mockLog = createMockLog();
      escalationLogRepo.create.mockReturnValue(mockLog);

      await service.executeEscalation(rule, task);

      expect(mockLog.status).toBe(EscalationLogStatus.FAILED);
      expect(mockLog.errorMessage).toBe('エスカレーション先の管理者が見つかりません');
    });

    it('should use BOTH channel and include escalation metadata', async () => {
      const rule = createMockRule({
        id: 'rule-xyz',
        action: EscalationAction.ESCALATE_TO_MANAGER,
        escalateToUserId: 'mgr-1',
      });
      const task = createMockTask();

      await service.executeEscalation(rule, task);

      expect(reminderService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '【緊急】エスカレーション: Test Rule',
          channel: ReminderChannel.EMAIL,
          metadata: {
            escalation: true,
            ruleId: 'rule-xyz',
            priority: 'high',
          },
        }),
        null,
      );
    });

    it('should set escalatedToUserId and actionDetail on log', async () => {
      const rule = createMockRule({
        action: EscalationAction.ESCALATE_TO_MANAGER,
        escalateToUserId: 'mgr-1',
      });
      const task = createMockTask();
      const mockLog = createMockLog();
      escalationLogRepo.create.mockReturnValue(mockLog);

      await service.executeEscalation(rule, task);

      expect(mockLog.escalatedToUserId).toBe('mgr-1');
      expect(mockLog.notifiedUsers).toEqual(['mgr-1']);
      expect(mockLog.actionDetail).toBe('管理者にエスカレーションしました');
    });
  });

  // -----------------------------------------------------------------
  // buildNotificationMessage (tested via the reminder create calls)
  // -----------------------------------------------------------------
  describe('buildNotificationMessage', () => {
    beforeEach(() => {
      escalationLogRepo.create.mockReturnValue(createMockLog());
      escalationLogRepo.save.mockResolvedValue(createMockLog());
      escalationLogRepo.findOne.mockResolvedValue(createMockLog());
    });

    it('should build message without escalation prefix for NOTIFY_OWNER', async () => {
      const rule = createMockRule({
        name: 'Overdue Warning',
        action: EscalationAction.NOTIFY_OWNER,
      });
      const task = createMockTask({
        title: 'Deploy v2',
        dueDate: new Date('2026-03-15'),
        progress: 40,
        status: TaskStatus.IN_PROGRESS,
      });

      await service.executeEscalation(rule, task);

      const call = reminderService.create.mock.calls[0];
      const message = call[0].message;

      expect(message).toContain('タスク「Deploy v2」に対応が必要です。');
      expect(message).toContain('ルール: Overdue Warning');
      expect(message).toContain('進捗: 40%');
      expect(message).toContain('ステータス: in_progress');
      expect(message).not.toContain('【エスカレーション】');
    });

    it('should build message WITH [ESCALATION] prefix for ESCALATE_TO_MANAGER', async () => {
      const rule = createMockRule({
        name: 'Critical Escalation',
        action: EscalationAction.ESCALATE_TO_MANAGER,
        escalateToUserId: 'mgr-1',
      });
      const task = createMockTask({
        title: 'Fix Critical Bug',
        dueDate: new Date('2026-01-01'),
        progress: 10,
        status: TaskStatus.WAITING,
      });

      await service.executeEscalation(rule, task);

      const call = reminderService.create.mock.calls[0];
      const message = call[0].message;

      expect(message).toContain('【エスカレーション】');
      expect(message).toContain('タスク「Fix Critical Bug」に対応が必要です。');
      expect(message).toContain('ルール: Critical Escalation');
      expect(message).toContain('進捗: 10%');
    });

    it('should show "No due date" when task has no dueDate', async () => {
      const rule = createMockRule({
        action: EscalationAction.NOTIFY_OWNER,
      });
      // Note: dueDate is set but checkAndTriggerEscalation would skip null dueDate tasks.
      // This tests the message builder directly via executeEscalation.
      const task = createMockTask({ dueDate: undefined });
      // notifyOwner will still be called since executeEscalation doesn't check dueDate

      await service.executeEscalation(rule, task);

      const call = reminderService.create.mock.calls[0];
      const message = call[0].message;

      expect(message).toContain('期限未設定');
    });
  });

  // -----------------------------------------------------------------
  // logEscalation
  // -----------------------------------------------------------------
  describe('logEscalation', () => {
    it('should find the most recent log for a rule/task/action', async () => {
      const rule = createMockRule();
      const task = createMockTask();
      const expectedLog = createMockLog();

      escalationLogRepo.findOne.mockResolvedValue(expectedLog);

      const result = await service.logEscalation(
        rule,
        task,
        EscalationAction.NOTIFY_OWNER,
      );

      expect(escalationLogRepo.findOne).toHaveBeenCalledWith({
        where: {
          ruleId: rule.id,
          taskId: task.id,
          action: EscalationAction.NOTIFY_OWNER,
        },
        order: { createdAt: 'DESC' },
        relations: ['rule', 'task', 'project', 'escalatedToUser'],
      });
      expect(result).toEqual(expectedLog);
    });

    it('should return null when no log exists', async () => {
      const rule = createMockRule();
      const task = createMockTask();

      escalationLogRepo.findOne.mockResolvedValue(null);

      const result = await service.logEscalation(
        rule,
        task,
        EscalationAction.ESCALATE_TO_MANAGER,
      );

      expect(result).toBeNull();
    });
  });
});
