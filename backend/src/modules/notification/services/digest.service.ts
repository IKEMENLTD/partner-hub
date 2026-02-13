import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, Between, Not, In } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { UserProfile } from '../../auth/entities/user-profile.entity';
import { Task } from '../../task/entities/task.entity';
import { Reminder } from '../../reminder/entities/reminder.entity';
import { TaskStatus } from '../../task/enums/task-status.enum';
import { EmailService } from './email.service';

export interface DigestData {
  todayTasks: Array<{
    id: string;
    title: string;
    projectName?: string;
    priority: string;
    dueDate: Date;
  }>;
  overdueTasks: Array<{
    id: string;
    title: string;
    projectName?: string;
    priority: string;
    dueDate: Date;
    daysOverdue: number;
  }>;
  unreadNotifications: Array<{
    id: string;
    type: string;
    message: string;
    createdAt: Date;
  }>;
  stats: {
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
  };
}

@Injectable()
export class DigestService {
  private readonly logger = new Logger(DigestService.name);

  constructor(
    @InjectRepository(UserProfile)
    private userRepository: Repository<UserProfile>,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(Reminder)
    private reminderRepository: Repository<Reminder>,
    private emailService: EmailService,
  ) {}

  /**
   * Send daily digest emails at 7:00 AM JST
   * Optimized to batch process users with similar data requirements
   */
  @Cron('0 7 * * *', { timeZone: 'Asia/Tokyo' })
  async sendDailyDigest(): Promise<void> {
    try {
      this.logger.log('Starting daily digest email distribution...');

      const users = await this.userRepository.find({
        where: { isActive: true },
      });

      // Filter users with digest enabled
      const usersWithDigestEnabled = users.filter(
        (user) => user.metadata?.digestEnabled !== false,
      );

      if (usersWithDigestEnabled.length === 0) {
        this.logger.log('No users with digest enabled');
        return;
      }

      let sentCount = 0;
      let skippedCount = users.length - usersWithDigestEnabled.length;

      // Process users in batches to avoid overwhelming the system
      const batchSize = 50;
      for (let i = 0; i < usersWithDigestEnabled.length; i += batchSize) {
        const userBatch = usersWithDigestEnabled.slice(i, i + batchSize);

        await Promise.all(
          userBatch.map(async (user) => {
            try {
              const digest = await this.generateUserDigest(user.id, user.organizationId);

              // Only send if there are tasks or notifications
              if (
                digest.todayTasks.length > 0 ||
                digest.overdueTasks.length > 0 ||
                digest.unreadNotifications.length > 0
              ) {
                await this.sendDigestEmail(user, digest);
                sentCount++;
              } else {
                skippedCount++;
              }
            } catch (error) {
              this.logger.error(
                `Failed to send digest to ${user.email}: ${error.message}`,
                error.stack,
              );
            }
          }),
        );
      }

      this.logger.log(`Daily digest complete: ${sentCount} sent, ${skippedCount} skipped`);
    } catch (error) {
      this.logger.error(`Failed to run daily digest: ${error.message}`, error.stack);
    }
  }

  /**
   * Generate digest data for a specific user
   */
  async generateUserDigest(userId: string, organizationId?: string): Promise<DigestData> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get today's tasks (filtered by organization)
    const todayTasksQb = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.project', 'project')
      .where('task.assigneeId = :userId', { userId })
      .andWhere('task.dueDate >= :today', { today })
      .andWhere('task.dueDate < :tomorrow', { tomorrow })
      .andWhere('task.status NOT IN (:...completedStatuses)', {
        completedStatuses: [TaskStatus.COMPLETED, TaskStatus.CANCELLED],
      });
    if (organizationId) {
      todayTasksQb.andWhere('project.organizationId = :orgId', { orgId: organizationId });
    }
    const todayTasks = await todayTasksQb.orderBy('task.priority', 'DESC').take(10).getMany();

    // Get overdue tasks (filtered by organization)
    const overdueTasksQb = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.project', 'project')
      .where('task.assigneeId = :userId', { userId })
      .andWhere('task.dueDate < :today', { today })
      .andWhere('task.status NOT IN (:...completedStatuses)', {
        completedStatuses: [TaskStatus.COMPLETED, TaskStatus.CANCELLED],
      });
    if (organizationId) {
      overdueTasksQb.andWhere('project.organizationId = :orgId', { orgId: organizationId });
    }
    const overdueTasks = await overdueTasksQb.orderBy('task.dueDate', 'ASC').take(10).getMany();

    // Get unread notifications
    const unreadNotifications = await this.reminderRepository.find({
      where: {
        userId,
        isRead: false,
      },
      order: { createdAt: 'DESC' },
      take: 10,
    });

    // Calculate statistics (filtered by organization)
    const totalTasksQb = this.taskRepository
      .createQueryBuilder('task')
      .leftJoin('task.project', 'project')
      .where('task.assigneeId = :userId', { userId });
    if (organizationId) {
      totalTasksQb.andWhere('project.organizationId = :orgId', { orgId: organizationId });
    }
    const totalTasks = await totalTasksQb.getCount();

    const completedTasksQb = this.taskRepository
      .createQueryBuilder('task')
      .leftJoin('task.project', 'project')
      .where('task.assigneeId = :userId', { userId })
      .andWhere('task.status = :completedStatus', { completedStatus: TaskStatus.COMPLETED });
    if (organizationId) {
      completedTasksQb.andWhere('project.organizationId = :orgId', { orgId: organizationId });
    }
    const completedTasks = await completedTasksQb.getCount();

    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      todayTasks: todayTasks.map((t) => ({
        id: t.id,
        title: t.title,
        projectName: t.project?.name,
        priority: t.priority,
        dueDate: t.dueDate,
      })),
      overdueTasks: overdueTasks.map((t) => ({
        id: t.id,
        title: t.title,
        projectName: t.project?.name,
        priority: t.priority,
        dueDate: t.dueDate,
        daysOverdue: Math.floor(
          (today.getTime() - new Date(t.dueDate).getTime()) / (1000 * 60 * 60 * 24),
        ),
      })),
      unreadNotifications: unreadNotifications.map((n) => ({
        id: n.id,
        type: n.type,
        message: n.message,
        createdAt: n.createdAt,
      })),
      stats: {
        totalTasks,
        completedTasks,
        completionRate,
      },
    };
  }

  /**
   * Send digest email to a user
   */
  private async sendDigestEmail(user: UserProfile, digest: DigestData): Promise<void> {
    const today = new Date();
    const dateStr = today.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });

    const greeting = this.getGreeting();
    const userName = user.firstName || user.email.split('@')[0];

    // Build email HTML
    const html = this.buildDigestHtml(userName, dateStr, greeting, digest);

    await this.emailService.sendEmail({
      to: user.email,
      subject: `【${dateStr}】本日のダイジェスト`,
      html,
    });
  }

  /**
   * Get time-appropriate greeting
   */
  private getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 10) return 'おはようございます';
    if (hour < 18) return 'こんにちは';
    return 'こんばんは';
  }

  /**
   * Build digest email HTML
   */
  private buildDigestHtml(
    userName: string,
    dateStr: string,
    greeting: string,
    digest: DigestData,
  ): string {
    const sections: string[] = [];

    // Header
    sections.push(`
      <div style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: white; padding: 24px; border-radius: 12px 12px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">${greeting}、${userName}さん</h1>
        <p style="margin: 8px 0 0 0; opacity: 0.9;">${dateStr}のダイジェストです</p>
      </div>
    `);

    // Stats summary
    sections.push(`
      <div style="background: #F9FAFB; padding: 20px; display: flex; justify-content: space-around; text-align: center;">
        <div>
          <div style="font-size: 24px; font-weight: bold; color: #4F46E5;">${digest.stats.totalTasks}</div>
          <div style="font-size: 12px; color: #6B7280;">総タスク数</div>
        </div>
        <div>
          <div style="font-size: 24px; font-weight: bold; color: #10B981;">${digest.stats.completedTasks}</div>
          <div style="font-size: 12px; color: #6B7280;">完了タスク</div>
        </div>
        <div>
          <div style="font-size: 24px; font-weight: bold; color: #3B82F6;">${digest.stats.completionRate}%</div>
          <div style="font-size: 12px; color: #6B7280;">達成率</div>
        </div>
      </div>
    `);

    // Today's tasks
    if (digest.todayTasks.length > 0) {
      const taskItems = digest.todayTasks
        .map(
          (t) => `
          <div style="padding: 12px; margin: 8px 0; background: white; border-left: 4px solid #4F46E5; border-radius: 4px;">
            <div style="font-weight: 600; color: #1F2937;">${t.title}</div>
            ${t.projectName ? `<div style="font-size: 12px; color: #6B7280;">${t.projectName}</div>` : ''}
          </div>
        `,
        )
        .join('');

      sections.push(`
        <div style="padding: 20px;">
          <h2 style="margin: 0 0 12px 0; font-size: 18px; color: #1F2937;">📋 今日のタスク (${digest.todayTasks.length}件)</h2>
          ${taskItems}
        </div>
      `);
    }

    // Overdue tasks
    if (digest.overdueTasks.length > 0) {
      const overdueItems = digest.overdueTasks
        .map(
          (t) => `
          <div style="padding: 12px; margin: 8px 0; background: #FEF2F2; border-left: 4px solid #EF4444; border-radius: 4px;">
            <div style="font-weight: 600; color: #991B1B;">${t.title}</div>
            <div style="font-size: 12px; color: #DC2626;">${t.daysOverdue}日超過</div>
            ${t.projectName ? `<div style="font-size: 12px; color: #6B7280;">${t.projectName}</div>` : ''}
          </div>
        `,
        )
        .join('');

      sections.push(`
        <div style="padding: 20px; background: #FEF2F2;">
          <h2 style="margin: 0 0 12px 0; font-size: 18px; color: #991B1B;">⚠️ 期限超過タスク (${digest.overdueTasks.length}件)</h2>
          ${overdueItems}
        </div>
      `);
    }

    // Unread notifications
    if (digest.unreadNotifications.length > 0) {
      const notificationItems = digest.unreadNotifications
        .map(
          (n) => `
          <div style="padding: 12px; margin: 8px 0; background: white; border-radius: 4px; border: 1px solid #E5E7EB;">
            <div style="font-size: 14px; color: #1F2937;">${n.message}</div>
            <div style="font-size: 12px; color: #6B7280; margin-top: 4px;">${new Date(n.createdAt).toLocaleString('ja-JP')}</div>
          </div>
        `,
        )
        .join('');

      sections.push(`
        <div style="padding: 20px;">
          <h2 style="margin: 0 0 12px 0; font-size: 18px; color: #1F2937;">🔔 新着通知 (${digest.unreadNotifications.length}件)</h2>
          ${notificationItems}
        </div>
      `);
    }

    // Footer
    sections.push(`
      <div style="padding: 20px; background: #F9FAFB; text-align: center; border-radius: 0 0 12px 12px;">
        <p style="margin: 0; font-size: 12px; color: #6B7280;">
          このメールはパートナー協業プラットフォームからの自動配信です。<br>
          配信設定は設定画面から変更できます。
        </p>
      </div>
    `);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 20px; background: #F3F4F6;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          ${sections.join('')}
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Update user's digest settings
   */
  async updateDigestSettings(userId: string, enabled: boolean, time?: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    const metadata = user.metadata || {};
    metadata.digestEnabled = enabled;
    if (time) {
      metadata.digestTime = time;
    }

    await this.userRepository.update(userId, { metadata });
    this.logger.log(`Digest settings updated for user ${userId}: enabled=${enabled}`);
  }

  /**
   * Get user's digest settings
   */
  async getDigestSettings(userId: string): Promise<{ enabled: boolean; time: string }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    return {
      enabled: user.metadata?.digestEnabled !== false,
      time: user.metadata?.digestTime || '07:00',
    };
  }
}
