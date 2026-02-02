import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InAppNotification, InAppNotificationType } from '../entities/in-app-notification.entity';

export interface CreateInAppNotificationDto {
  userId: string;
  type: InAppNotificationType;
  title: string;
  message?: string;
  linkUrl?: string;
  taskId?: string;
  projectId?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class InAppNotificationService {
  private readonly logger = new Logger(InAppNotificationService.name);

  constructor(
    @InjectRepository(InAppNotification)
    private notificationRepository: Repository<InAppNotification>,
  ) {}

  async create(dto: CreateInAppNotificationDto): Promise<InAppNotification> {
    const notification = this.notificationRepository.create(dto);
    const saved = await this.notificationRepository.save(notification);
    this.logger.log(`In-app notification created for user ${dto.userId}: ${dto.title}`);
    return saved;
  }

  async getByUserId(
    userId: string,
    options?: { limit?: number; offset?: number; unreadOnly?: boolean },
  ): Promise<{ notifications: InAppNotification[]; total: number; unreadCount: number }> {
    const { limit = 20, offset = 0, unreadOnly = false } = options || {};

    const queryBuilder = this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId })
      .orderBy('notification.createdAt', 'DESC');

    if (unreadOnly) {
      queryBuilder.andWhere('notification.isRead = false');
    }

    const [notifications, total] = await queryBuilder.skip(offset).take(limit).getManyAndCount();

    const unreadCount = await this.notificationRepository.count({
      where: { userId, isRead: false },
    });

    return { notifications, total, unreadCount };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepository.count({
      where: { userId, isRead: false },
    });
  }

  async markAsRead(id: string, userId: string): Promise<boolean> {
    const result = await this.notificationRepository.update({ id, userId }, { isRead: true });
    return (result.affected ?? 0) > 0;
  }

  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.notificationRepository.update(
      { userId, isRead: false },
      { isRead: true },
    );
    return result.affected ?? 0;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const result = await this.notificationRepository.delete({ id, userId });
    return (result.affected ?? 0) > 0;
  }

  async deleteAllRead(userId: string): Promise<number> {
    const result = await this.notificationRepository.delete({
      userId,
      isRead: true,
    });
    return result.affected ?? 0;
  }
}
