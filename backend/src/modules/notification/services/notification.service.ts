import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailService } from './email.service';
import { InAppNotificationService } from './in-app-notification.service';
import { NotificationGateway } from '../gateways/notification.gateway';
import { Reminder } from '../../reminder/entities/reminder.entity';
import { Task } from '../../task/entities/task.entity';
import { Project } from '../../project/entities/project.entity';
import { UserProfile } from '../../auth/entities/user-profile.entity';
import { ReminderChannel } from '../../reminder/enums/reminder-type.enum';
import { NotificationChannel } from '../entities/notification-channel.entity';
import { InAppNotificationType } from '../entities/in-app-notification.entity';
import { AuthorizationException } from '../../../common/exceptions/business.exception';
import { ResourceNotFoundException } from '../../../common/exceptions/resource-not-found.exception';

export interface SendNotificationOptions {
  channel: ReminderChannel;
  reminder?: Reminder;
  task?: Task;
  project?: Project;
  recipients: UserProfile[];
  escalationReason?: string;
  escalationLevel?: string;
  additionalInfo?: string;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private emailService: EmailService,
    private inAppNotificationService: InAppNotificationService,
    private notificationGateway: NotificationGateway,
    @InjectRepository(UserProfile)
    private userProfileRepository: Repository<UserProfile>,
    @InjectRepository(NotificationChannel)
    private notificationChannelRepository: Repository<NotificationChannel>,
  ) {}

  /**
   * Send notification based on channel type
   */
  async sendNotification(options: SendNotificationOptions): Promise<boolean> {
    try {
      switch (options.channel) {
        case ReminderChannel.EMAIL:
          return await this.sendEmailNotification(options);

        case ReminderChannel.IN_APP:
          return await this.sendInAppNotification(options);

        case ReminderChannel.SLACK:
          // Slack未実装 → IN_APPにフォールバック
          return await this.sendInAppNotification(options);

        case ReminderChannel.TEAMS:
          // Teams未実装 → IN_APPにフォールバック
          return await this.sendInAppNotification(options);

        case ReminderChannel.WEBHOOK:
          // Webhook未実装 → IN_APPにフォールバック
          return await this.sendInAppNotification(options);

        default:
          this.logger.warn(`Unknown notification channel: ${options.channel}`);
          return false;
      }
    } catch (error) {
      this.logger.error(`Failed to send notification: ${error.message}`);
      return false;
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(options: SendNotificationOptions): Promise<boolean> {
    const {
      reminder,
      task,
      project,
      recipients,
      escalationReason,
      escalationLevel,
      additionalInfo,
    } = options;

    if (recipients.length === 0) {
      this.logger.warn('No recipients specified for email notification');
      return false;
    }

    try {
      // If it's an escalation notification
      if (escalationReason && escalationLevel && project) {
        const results = await this.emailService.sendEscalationEmail(
          escalationReason,
          escalationLevel,
          project,
          recipients,
          additionalInfo,
        );
        const successCount = results.filter(Boolean).length;
        this.logger.log(`Escalation email sent to ${successCount}/${recipients.length} recipients`);
        return successCount > 0;
      }

      // If it's a reminder notification
      if (reminder) {
        const results = await this.emailService.sendReminderEmail(
          reminder,
          task || null,
          recipients,
        );
        const successCount = results.filter(Boolean).length;
        this.logger.log(`Reminder email sent to ${successCount}/${recipients.length} recipients`);
        return successCount > 0;
      }

      this.logger.warn('No valid notification data provided');
      return false;
    } catch (error) {
      this.logger.error(`Email notification failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Send in-app notification: persist to DB and push via WebSocket
   */
  private async sendInAppNotification(options: SendNotificationOptions): Promise<boolean> {
    const { task, project, recipients } = options;

    if (recipients.length === 0) {
      this.logger.warn('No recipients specified for in-app notification');
      return false;
    }

    try {
      const { title, message, type, linkUrl } = this.buildInAppContent(options);

      let successCount = 0;
      for (const recipient of recipients) {
        try {
          const notification = await this.inAppNotificationService.create({
            userId: recipient.id,
            type,
            title,
            message,
            linkUrl,
            taskId: task?.id,
            projectId: project?.id || task?.projectId,
          });

          // Push real-time via WebSocket
          this.notificationGateway.sendToUser(recipient.id, notification);
          const unreadCount = await this.inAppNotificationService.getUnreadCount(recipient.id);
          this.notificationGateway.sendUnreadCount(recipient.id, unreadCount);

          successCount++;
        } catch (err) {
          this.logger.error(`Failed to create in-app notification for user ${recipient.id}: ${err.message}`);
        }
      }

      this.logger.log(`In-app notification sent to ${successCount}/${recipients.length} recipients`);
      return successCount > 0;
    } catch (error) {
      this.logger.error(`In-app notification failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Build in-app notification content from options
   */
  private buildInAppContent(options: SendNotificationOptions): {
    title: string;
    message: string;
    type: InAppNotificationType;
    linkUrl?: string;
  } {
    const { reminder, task, project, escalationReason } = options;

    // Escalation notification
    if (escalationReason && project) {
      return {
        title: `エスカレーション: ${project.name}`,
        message: escalationReason,
        type: 'system',
        linkUrl: `/projects/${project.id}`,
      };
    }

    // Reminder with task
    if (reminder && task) {
      return {
        title: reminder.title || `タスクリマインダー: ${task.title}`,
        message: reminder.message || `タスク「${task.title}」の期限が近づいています`,
        type: 'deadline',
        linkUrl: task.projectId ? `/projects/${task.projectId}/tasks/${task.id}` : undefined,
      };
    }

    // Reminder without task
    if (reminder) {
      return {
        title: reminder.title || 'リマインダー',
        message: reminder.message || '',
        type: 'system',
        linkUrl: reminder.projectId ? `/projects/${reminder.projectId}` : undefined,
      };
    }

    return {
      title: '通知',
      message: '',
      type: 'system',
    };
  }

  /**
   * Get recipients by user IDs, optionally filtered by organization
   */
  async getRecipientsByIds(userIds: string[], organizationId?: string): Promise<UserProfile[]> {
    if (userIds.length === 0) {
      return [];
    }

    if (organizationId) {
      return this.userProfileRepository.find({
        where: userIds.map((id) => ({ id, organizationId })),
      });
    }

    return this.userProfileRepository.findBy(userIds.map((id) => ({ id })));
  }

  /**
   * Send reminder notification with automatic recipient resolution
   */
  async sendReminderNotification(
    reminder: Reminder,
    task?: Task,
  ): Promise<boolean> {
    // Get recipients
    const recipients: UserProfile[] = [];

    if (reminder.user) {
      recipients.push(reminder.user);
    } else if (reminder.userId) {
      const user = await this.userProfileRepository.findOne({
        where: { id: reminder.userId },
      });
      if (user) {
        recipients.push(user);
      }
    }

    if (recipients.length === 0) {
      this.logger.warn(`No recipients found for reminder: ${reminder.id}`);
      return false;
    }

    return this.sendNotification({
      channel: reminder.channel,
      reminder,
      task,
      recipients,
    });
  }

  /**
   * Send escalation notification
   */
  async sendEscalationNotification(
    escalationReason: string,
    escalationLevel: string,
    project: Project,
    recipientIds: string[],
    additionalInfo?: string,
    organizationId?: string,
  ): Promise<boolean> {
    const recipients = await this.getRecipientsByIds(recipientIds, organizationId);

    if (recipients.length === 0) {
      this.logger.warn(`No recipients found for escalation on project: ${project.id}`);
    }

    return this.sendNotification({
      channel: ReminderChannel.EMAIL,
      project,
      recipients,
      escalationReason,
      escalationLevel,
      additionalInfo,
    });
  }

  /**
   * Update a notification channel with organization validation
   */
  async updateNotificationChannel(
    id: string,
    updates: Partial<NotificationChannel>,
    organizationId?: string,
  ): Promise<NotificationChannel | null> {
    if (organizationId) {
      await this.verifyChannelOrganization(id, organizationId);
    }
    await this.notificationChannelRepository.update(id, updates);
    return this.notificationChannelRepository.findOne({ where: { id } });
  }

  /**
   * Delete a notification channel with organization validation
   */
  async deleteNotificationChannel(id: string, organizationId?: string): Promise<boolean> {
    if (organizationId) {
      await this.verifyChannelOrganization(id, organizationId);
    }
    const result = await this.notificationChannelRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  /**
   * Verify that a notification channel belongs to the given organization
   */
  private async verifyChannelOrganization(channelId: string, organizationId: string): Promise<void> {
    const channel = await this.notificationChannelRepository.findOne({
      where: { id: channelId },
      relations: ['project'],
    });
    if (!channel) {
      throw new ResourceNotFoundException('SYSTEM_001', {
        resourceType: 'NotificationChannel',
        resourceId: channelId,
        userMessage: '通知チャンネルが見つかりません',
      });
    }
    if (channel.project && channel.project.organizationId && channel.project.organizationId !== organizationId) {
      throw new AuthorizationException('AUTH_004', {
        message: 'この通知チャンネルへのアクセス権限がありません',
      });
    }
  }
}
