import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../../project/entities/project.entity';
import { Task } from '../../task/entities/task.entity';
import { Partner } from '../../partner/entities/partner.entity';
import { Reminder } from '../../reminder/entities/reminder.entity';

export interface ActivityItem {
  type: 'project' | 'task' | 'partner' | 'reminder';
  action: string;
  entityId: string;
  entityName: string;
  timestamp: Date;
  userId?: string;
  userName?: string;
}

@Injectable()
export class DashboardActivityService {
  private readonly logger = new Logger(DashboardActivityService.name);

  constructor(
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(Partner)
    private partnerRepository: Repository<Partner>,
    @InjectRepository(Reminder)
    private reminderRepository: Repository<Reminder>,
  ) {}

  async getRecentActivity(limit: number = 20, organizationId?: string): Promise<ActivityItem[]> {
    const activities: ActivityItem[] = [];
    const perEntityLimit = Math.ceil(limit / 4);

    // Get recent projects (filtered by organization)
    const projectQuery = this.projectRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.createdBy', 'createdBy')
      .where('project.deletedAt IS NULL');
    if (organizationId) {
      projectQuery.andWhere('project.organizationId = :organizationId', { organizationId });
    }
    const recentProjects = await projectQuery
      .orderBy('project.updatedAt', 'DESC')
      .take(perEntityLimit)
      .getMany();

    for (const project of recentProjects) {
      activities.push({
        type: 'project',
        action: project.createdAt.getTime() === project.updatedAt.getTime() ? 'created' : 'updated',
        entityId: project.id,
        entityName: project.name,
        timestamp: project.updatedAt,
        userId: project.createdById,
        userName: project.createdBy?.firstName
          ? `${project.createdBy.firstName} ${project.createdBy.lastName}`
          : undefined,
      });
    }

    // Get recent tasks (filtered by organization via project)
    const taskQuery = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.createdBy', 'createdBy')
      .innerJoin('task.project', 'project')
      .where('task.deletedAt IS NULL');
    if (organizationId) {
      taskQuery.andWhere('project.organizationId = :organizationId', { organizationId });
    }
    const recentTasks = await taskQuery
      .orderBy('task.updatedAt', 'DESC')
      .take(perEntityLimit)
      .getMany();

    for (const task of recentTasks) {
      activities.push({
        type: 'task',
        action: task.createdAt.getTime() === task.updatedAt.getTime() ? 'created' : 'updated',
        entityId: task.id,
        entityName: task.title,
        timestamp: task.updatedAt,
        userId: task.createdById,
        userName: task.createdBy?.firstName
          ? `${task.createdBy.firstName} ${task.createdBy.lastName}`
          : undefined,
      });
    }

    // Get recent partners (filtered by organization)
    const partnerQuery = this.partnerRepository
      .createQueryBuilder('partner')
      .leftJoinAndSelect('partner.createdBy', 'createdBy')
      .where('partner.deletedAt IS NULL');
    if (organizationId) {
      partnerQuery.andWhere('partner.organizationId = :organizationId', { organizationId });
    }
    const recentPartners = await partnerQuery
      .orderBy('partner.updatedAt', 'DESC')
      .take(perEntityLimit)
      .getMany();

    for (const partner of recentPartners) {
      activities.push({
        type: 'partner',
        action: partner.createdAt.getTime() === partner.updatedAt.getTime() ? 'created' : 'updated',
        entityId: partner.id,
        entityName: partner.name,
        timestamp: partner.updatedAt,
        userId: partner.createdById,
        userName: partner.createdBy?.firstName
          ? `${partner.createdBy.firstName} ${partner.createdBy.lastName}`
          : undefined,
      });
    }

    // Sort by timestamp
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return activities.slice(0, limit);
  }

  async getUserAlerts(userId: string): Promise<Reminder[]> {
    return this.reminderRepository.find({
      where: { userId },
      relations: ['task', 'project'],
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async markAlertAsRead(userId: string, alertId: string): Promise<{ success: boolean }> {
    await this.reminderRepository.update({ id: alertId, userId }, { isRead: true });
    return { success: true };
  }

  async markAllAlertsAsRead(userId: string): Promise<{ success: boolean }> {
    await this.reminderRepository.update({ userId, isRead: false }, { isRead: true });
    return { success: true };
  }
}
