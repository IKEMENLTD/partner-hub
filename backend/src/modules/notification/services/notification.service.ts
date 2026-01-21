import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailService } from './email.service';
import { SlackService } from './slack.service';
import { Reminder } from '../../reminder/entities/reminder.entity';
import { Task } from '../../task/entities/task.entity';
import { Project } from '../../project/entities/project.entity';
import { UserProfile } from '../../auth/entities/user-profile.entity';
import { ReminderChannel } from '../../reminder/enums/reminder-type.enum';
import { NotificationChannel } from '../entities/notification-channel.entity';
import { NotificationChannelType } from '../enums/notification-channel-type.enum';

export interface SendNotificationOptions {
  channel: ReminderChannel;
  reminder?: Reminder;
  task?: Task;
  project?: Project;
  recipients: UserProfile[];
  escalationReason?: string;
  escalationLevel?: string;
  additionalInfo?: string;
  slackChannelId?: string;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private emailService: EmailService,
    private slackService: SlackService,
    @InjectRepository(UserProfile)
    private userProfileRepository: Repository<UserProfile>,
    @InjectRepository(NotificationChannel)
    private notificationChannelRepository: Repository<NotificationChannel>,
  ) {}

  /**
   * Send notification based on channel type
   */
  async sendNotification(options: SendNotificationOptions): Promise<boolean> {
    const { channel, reminder, task, project, recipients, escalationReason, escalationLevel, additionalInfo, slackChannelId } = options;

    try {
      switch (channel) {
        case ReminderChannel.EMAIL:
          return await this.sendEmailNotification(options);

        case ReminderChannel.IN_APP:
          return await this.sendInAppNotification(options);

        case ReminderChannel.SLACK:
          return await this.sendSlackNotification(options);

        case ReminderChannel.BOTH:
          const emailResult = await this.sendEmailNotification(options);
          const inAppResult = await this.sendInAppNotification(options);
          return emailResult && inAppResult;

        case ReminderChannel.ALL:
          const allEmailResult = await this.sendEmailNotification(options);
          const allInAppResult = await this.sendInAppNotification(options);
          const allSlackResult = await this.sendSlackNotification(options);
          return allEmailResult && allInAppResult && allSlackResult;

        default:
          this.logger.warn(`Unknown notification channel: ${channel}`);
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
    const { reminder, task, project, recipients, escalationReason, escalationLevel, additionalInfo } = options;

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
   * Send in-app notification (placeholder for future implementation)
   */
  private async sendInAppNotification(options: SendNotificationOptions): Promise<boolean> {
    const { reminder, recipients } = options;

    // In-app notifications are handled by the reminder system itself
    // This is a placeholder for real-time notification implementation (e.g., WebSocket)
    this.logger.log(`In-app notification processed for ${recipients.length} recipients`);

    // For now, in-app notifications are considered successful
    // as they are stored in the reminders table
    return true;
  }

  /**
   * Send Slack notification
   */
  private async sendSlackNotification(options: SendNotificationOptions): Promise<boolean> {
    const { reminder, task, project, escalationReason, escalationLevel, slackChannelId, additionalInfo } = options;

    // Find Slack channel ID from options or from project configuration
    let targetChannelId = slackChannelId;

    if (!targetChannelId && project) {
      // Try to find a Slack channel configured for this project
      const projectChannel = await this.notificationChannelRepository.findOne({
        where: {
          projectId: project.id,
          type: NotificationChannelType.SLACK,
          isActive: true,
        },
      });
      targetChannelId = projectChannel?.channelId;
    }

    if (!targetChannelId && task?.projectId) {
      // Try to find a Slack channel configured for the task's project
      const taskProjectChannel = await this.notificationChannelRepository.findOne({
        where: {
          projectId: task.projectId,
          type: NotificationChannelType.SLACK,
          isActive: true,
        },
      });
      targetChannelId = taskProjectChannel?.channelId;
    }

    if (!targetChannelId) {
      this.logger.warn('No Slack channel ID available for notification');
      return false;
    }

    try {
      // If it's an escalation notification
      if (escalationReason && escalationLevel && project) {
        const level = this.getEscalationLevelNumber(escalationLevel);
        const result = await this.slackService.sendEscalationNotification(
          {
            title: `エスカレーション: ${escalationReason}`,
            message: additionalInfo || escalationReason,
            level,
          },
          project,
          targetChannelId,
        );
        if (result.success) {
          this.logger.log(`Escalation Slack notification sent to channel ${targetChannelId}`);
        } else {
          this.logger.error(`Failed to send escalation Slack notification: ${result.error}`);
        }
        return result.success;
      }

      // If it's a reminder notification with a task
      if (reminder && task) {
        const result = await this.slackService.sendReminderNotification(
          reminder,
          task,
          targetChannelId,
        );
        if (result.success) {
          this.logger.log(`Reminder Slack notification sent to channel ${targetChannelId}`);
        } else {
          this.logger.error(`Failed to send reminder Slack notification: ${result.error}`);
        }
        return result.success;
      }

      // If it's a simple reminder notification
      if (reminder) {
        const result = await this.slackService.sendSimpleNotification(
          targetChannelId,
          reminder.title,
          reminder.message || '',
          'info',
        );
        if (result.success) {
          this.logger.log(`Simple Slack notification sent to channel ${targetChannelId}`);
        } else {
          this.logger.error(`Failed to send simple Slack notification: ${result.error}`);
        }
        return result.success;
      }

      this.logger.warn('No valid notification data provided for Slack');
      return false;
    } catch (error) {
      this.logger.error(`Slack notification failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Convert escalation level string to number
   */
  private getEscalationLevelNumber(level: string): number {
    const levelMap: Record<string, number> = {
      low: 1,
      normal: 1,
      medium: 2,
      high: 2,
      critical: 3,
      urgent: 3,
    };
    return levelMap[level.toLowerCase()] || 1;
  }

  /**
   * Get recipients by user IDs
   */
  async getRecipientsByIds(userIds: string[]): Promise<UserProfile[]> {
    if (userIds.length === 0) {
      return [];
    }

    return this.userProfileRepository.findBy(
      userIds.map((id) => ({ id })),
    );
  }

  /**
   * Send reminder notification with automatic recipient resolution
   */
  async sendReminderNotification(reminder: Reminder, task?: Task, slackChannelId?: string): Promise<boolean> {
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

    if (recipients.length === 0 && reminder.channel !== ReminderChannel.SLACK) {
      this.logger.warn(`No recipients found for reminder: ${reminder.id}`);
      return false;
    }

    return this.sendNotification({
      channel: reminder.channel,
      reminder,
      task,
      recipients,
      slackChannelId,
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
    slackChannelId?: string,
  ): Promise<boolean> {
    const recipients = await this.getRecipientsByIds(recipientIds);

    if (recipients.length === 0) {
      this.logger.warn(`No recipients found for escalation on project: ${project.id}`);
      // Still try to send Slack notification even without recipients
    }

    return this.sendNotification({
      channel: ReminderChannel.ALL,
      project,
      recipients,
      escalationReason,
      escalationLevel,
      additionalInfo,
      slackChannelId,
    });
  }

  /**
   * Send Slack notification directly to a channel
   */
  async sendSlackMessage(
    channelId: string,
    title: string,
    message: string,
    type: 'info' | 'warning' | 'error' | 'success' = 'info',
  ): Promise<boolean> {
    const result = await this.slackService.sendSimpleNotification(
      channelId,
      title,
      message,
      type,
    );
    return result.success;
  }

  /**
   * Get Slack channels for a project
   */
  async getProjectSlackChannels(projectId: string): Promise<NotificationChannel[]> {
    return this.notificationChannelRepository.find({
      where: {
        projectId,
        type: NotificationChannelType.SLACK,
        isActive: true,
      },
    });
  }

  /**
   * Create a Slack notification channel for a project
   */
  async createSlackChannel(
    projectId: string,
    slackChannelId: string,
    name: string,
    createdById?: string,
    config?: Record<string, any>,
  ): Promise<NotificationChannel> {
    const channel = this.notificationChannelRepository.create({
      name,
      type: NotificationChannelType.SLACK,
      channelId: slackChannelId,
      projectId,
      createdById,
      config,
      isActive: true,
    });
    return this.notificationChannelRepository.save(channel);
  }

  /**
   * Update a notification channel
   */
  async updateNotificationChannel(
    id: string,
    updates: Partial<NotificationChannel>,
  ): Promise<NotificationChannel | null> {
    await this.notificationChannelRepository.update(id, updates);
    return this.notificationChannelRepository.findOne({ where: { id } });
  }

  /**
   * Delete a notification channel
   */
  async deleteNotificationChannel(id: string): Promise<boolean> {
    const result = await this.notificationChannelRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
