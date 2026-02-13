import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { EscalationRule } from '../entities/escalation-rule.entity';
import { EscalationLog } from '../entities/escalation-log.entity';
import { Task } from '../../task/entities/task.entity';
import { Project } from '../../project/entities/project.entity';
import { ProjectStakeholder } from '../../project/entities/project-stakeholder.entity';
import { Partner } from '../../partner/entities/partner.entity';
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
import { EscalationRuleService } from './escalation-rule.service';

@Injectable()
export class EscalationExecutorService {
  private readonly logger = new Logger(EscalationExecutorService.name);

  constructor(
    @InjectRepository(EscalationLog)
    private escalationLogRepository: Repository<EscalationLog>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(ProjectStakeholder)
    private stakeholderRepository: Repository<ProjectStakeholder>,
    @InjectRepository(Partner)
    private partnerRepository: Repository<Partner>,
    private reminderService: ReminderService,
    private ruleService: EscalationRuleService,
    private smsService: SmsService,
    private systemSettingsService: SystemSettingsService,
  ) {}

  async checkAndTriggerEscalation(task: Task, organizationId?: string): Promise<EscalationLog[]> {
    const logs: EscalationLog[] = [];

    if (!task.dueDate) {
      return logs;
    }

    // Skip completed or cancelled tasks
    if (task.status === TaskStatus.COMPLETED || task.status === TaskStatus.CANCELLED) {
      return logs;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueDate = new Date(task.dueDate);
    dueDate.setHours(0, 0, 0, 0);

    const daysDiff = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // Get applicable rules filtered by organization
    const orgId = organizationId || task.project?.organizationId;
    const rules = await this.ruleService.getActiveRulesForTask(task.projectId, orgId);

    for (const rule of rules) {
      const shouldTrigger = this.evaluateRule(rule, daysDiff, task);

      if (shouldTrigger) {
        // Check if this rule was already triggered for this task today
        const existingLog = await this.escalationLogRepository.findOne({
          where: {
            ruleId: rule.id,
            taskId: task.id,
            createdAt: MoreThanOrEqual(today),
          },
        });

        if (!existingLog) {
          const log = await this.executeEscalation(rule, task);
          logs.push(log);
        }
      }
    }

    return logs;
  }

  private evaluateRule(rule: EscalationRule, daysDiff: number, task: Task): boolean {
    switch (rule.triggerType) {
      case EscalationTriggerType.DAYS_BEFORE_DUE:
        return daysDiff >= 0 && daysDiff <= rule.triggerValue;

      case EscalationTriggerType.DAYS_AFTER_DUE:
        return daysDiff < 0 && Math.abs(daysDiff) >= rule.triggerValue;

      case EscalationTriggerType.PROGRESS_BELOW:
        return task.progress < rule.triggerValue && daysDiff <= 3;

      default:
        return false;
    }
  }

  async executeEscalation(rule: EscalationRule, task: Task): Promise<EscalationLog> {
    const log = this.escalationLogRepository.create({
      ruleId: rule.id,
      taskId: task.id,
      projectId: task.projectId,
      action: rule.action,
      status: EscalationLogStatus.PENDING,
    });

    try {
      switch (rule.action) {
        case EscalationAction.NOTIFY_OWNER:
          await this.notifyOwner(task, rule, log);
          break;

        case EscalationAction.NOTIFY_STAKEHOLDERS:
          await this.notifyStakeholders(task, rule, log);
          break;

        case EscalationAction.ESCALATE_TO_MANAGER:
          await this.escalateToManager(task, rule, log);
          break;
      }

      log.status = EscalationLogStatus.EXECUTED;
      log.executedAt = new Date();
      this.logger.log(`Escalation executed: Rule ${rule.name} on Task ${task.id}`);
    } catch (error) {
      log.status = EscalationLogStatus.FAILED;
      log.errorMessage = error.message;
      this.logger.error(`Escalation failed: Rule ${rule.name} on Task ${task.id}`, error.stack);
    }

    const savedLog = await this.escalationLogRepository.save(log);

    // SMS送信（パートナーへの緊急連絡）
    try {
      await this.sendPartnerSms(task, rule);
    } catch (err) {
      this.logger.error(`SMS送信エラー (Rule: ${rule.name}, Task: ${task.id}): ${err.message}`);
      // SMS失敗をログに記録（エスカレーション自体は成功扱いのまま）
      savedLog.errorMessage = savedLog.errorMessage
        ? `${savedLog.errorMessage}; SMS送信失敗: ${err.message}`
        : `SMS送信失敗: ${err.message}`;
      await this.escalationLogRepository.save(savedLog);
    }

    return this.escalationLogRepository.findOne({
      where: { id: savedLog.id },
      relations: ['rule', 'task', 'project', 'escalatedToUser'],
    }) as Promise<EscalationLog>;
  }

  /**
   * パートナーにSMS送信（期限超過時のみ）
   */
  private async sendPartnerSms(task: Task, rule: EscalationRule): Promise<void> {
    if (!task.partnerId) return;

    const partner = await this.partnerRepository.findOne({
      where: { id: task.partnerId },
    });
    if (!partner?.smsPhoneNumber) return;

    // Twilio設定を取得（organizationIdはprojectから）
    const project = await this.projectRepository.findOne({
      where: { id: task.projectId },
    });
    if (!project?.organizationId) return;

    const twilioSettings = await this.systemSettingsService.getTwilioSettings(
      project.organizationId,
    );
    if (!twilioSettings.accountSid || !twilioSettings.authToken || !twilioSettings.phoneNumber) {
      return; // Twilio未設定 → スキップ
    }

    // 超過日数を計算
    const today = new Date();
    const dueDate = new Date(task.dueDate);
    const daysOverdue = Math.floor(
      (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysOverdue <= 0) return; // 期限前はSMS不要

    await this.smsService.sendEscalation(
      {
        accountSid: twilioSettings.accountSid,
        authToken: twilioSettings.authToken,
        phoneNumber: twilioSettings.phoneNumber,
      },
      partner.smsPhoneNumber,
      task.title,
      daysOverdue,
    );

    this.logger.log(
      `SMS sent to partner ${partner.name} for task ${task.title}`,
    );
  }

  private async notifyOwner(task: Task, rule: EscalationRule, log: EscalationLog): Promise<void> {
    if (!task.assigneeId) {
      throw new Error('タスクに担当者が設定されていません');
    }

    await this.reminderService.create(
      {
        title: `エスカレーション: ${rule.name}`,
        message: this.buildNotificationMessage(rule, task),
        type: ReminderType.TASK_OVERDUE,
        channel: ReminderChannel.IN_APP,
        userId: task.assigneeId,
        taskId: task.id,
        projectId: task.projectId,
        scheduledAt: new Date().toISOString(),
      },
      null,
    );

    log.notifiedUsers = [task.assigneeId];
    log.actionDetail = `タスク担当者に通知しました`;
  }

  private async notifyStakeholders(
    task: Task,
    rule: EscalationRule,
    log: EscalationLog,
  ): Promise<void> {
    if (!task.projectId) {
      throw new Error('タスクに案件が紐づいていないため関係者に通知できません');
    }

    const stakeholders = await this.stakeholderRepository.find({
      where: { projectId: task.projectId },
      relations: ['partner'],
    });

    const project = await this.projectRepository.findOne({
      where: { id: task.projectId },
      relations: ['owner', 'manager'],
    });

    const notifiedUsers: string[] = [];

    if (project?.ownerId) {
      await this.reminderService.create(
        {
          title: `エスカレーション: ${rule.name}`,
          message: this.buildNotificationMessage(rule, task),
          type: ReminderType.TASK_OVERDUE,
          channel: ReminderChannel.IN_APP,
          userId: project.ownerId,
          taskId: task.id,
          projectId: task.projectId,
          scheduledAt: new Date().toISOString(),
        },
        null,
      );
      notifiedUsers.push(project.ownerId);
    }

    if (project?.managerId && project.managerId !== project.ownerId) {
      await this.reminderService.create(
        {
          title: `エスカレーション: ${rule.name}`,
          message: this.buildNotificationMessage(rule, task),
          type: ReminderType.TASK_OVERDUE,
          channel: ReminderChannel.IN_APP,
          userId: project.managerId,
          taskId: task.id,
          projectId: task.projectId,
          scheduledAt: new Date().toISOString(),
        },
        null,
      );
      notifiedUsers.push(project.managerId);
    }

    log.notifiedUsers = notifiedUsers;
    log.actionDetail = `関係者${notifiedUsers.length}名に通知しました`;
  }

  private async escalateToManager(
    task: Task,
    rule: EscalationRule,
    log: EscalationLog,
  ): Promise<void> {
    let managerId: string | undefined = rule.escalateToUserId;

    if (!managerId && task.projectId) {
      const project = await this.projectRepository.findOne({
        where: { id: task.projectId },
      });
      managerId = project?.managerId ?? project?.ownerId;
    }

    if (!managerId) {
      throw new Error('エスカレーション先の管理者が見つかりません');
    }

    await this.reminderService.create(
      {
        title: `【緊急】エスカレーション: ${rule.name}`,
        message: this.buildNotificationMessage(rule, task, true),
        type: ReminderType.TASK_OVERDUE,
        channel: ReminderChannel.EMAIL,
        userId: managerId,
        taskId: task.id,
        projectId: task.projectId,
        scheduledAt: new Date().toISOString(),
        metadata: {
          escalation: true,
          ruleId: rule.id,
          priority: 'high',
        },
      },
      null,
    );

    log.escalatedToUserId = managerId;
    log.notifiedUsers = [managerId];
    log.actionDetail = `管理者にエスカレーションしました`;
  }

  private buildNotificationMessage(
    rule: EscalationRule,
    task: Task,
    isEscalation: boolean = false,
  ): string {
    const prefix = isEscalation ? '【エスカレーション】' : '';
    const dueInfo = task.dueDate
      ? `期限: ${new Date(task.dueDate).toLocaleDateString('ja-JP')}`
      : '期限未設定';

    return (
      `${prefix}タスク「${task.title}」に対応が必要です。\n\n` +
      `ルール: ${rule.name}\n` +
      `${dueInfo}\n` +
      `進捗: ${task.progress}%\n` +
      `ステータス: ${task.status}`
    );
  }

  async logEscalation(
    rule: EscalationRule,
    task: Task,
    action: EscalationAction,
  ): Promise<EscalationLog | null> {
    const log = await this.escalationLogRepository.findOne({
      where: {
        ruleId: rule.id,
        taskId: task.id,
        action,
      },
      order: { createdAt: 'DESC' },
      relations: ['rule', 'task', 'project', 'escalatedToUser'],
    });

    return log;
  }
}
