import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationService, SendNotificationOptions } from './notification.service';
import { EmailService } from './email.service';
import { InAppNotificationService } from './in-app-notification.service';
import { NotificationGateway } from '../gateways/notification.gateway';
import { UserProfile } from '../../auth/entities/user-profile.entity';
import { NotificationChannel } from '../entities/notification-channel.entity';
import { InAppNotification, InAppNotificationType } from '../entities/in-app-notification.entity';
import { Reminder } from '../../reminder/entities/reminder.entity';
import { Task } from '../../task/entities/task.entity';
import { Project } from '../../project/entities/project.entity';
import { ReminderChannel, ReminderType, ReminderStatus } from '../../reminder/enums/reminder-type.enum';
import { UserRole } from '../../auth/enums/user-role.enum';

// Helper type for partial repository mocks with jest mock methods
type MockRepo<T = any> = Record<string, jest.Mock>;

describe('NotificationService', () => {
  let service: NotificationService;
  let emailService: MockRepo<EmailService>;
  let inAppNotificationService: MockRepo<InAppNotificationService>;
  let notificationGateway: MockRepo<NotificationGateway>;
  let userProfileRepository: MockRepo<UserProfile>;
  let notificationChannelRepository: MockRepo<NotificationChannel>;

  // =============================================
  // Test Data Fixtures
  // =============================================

  const mockUser1: Partial<UserProfile> = {
    id: 'user-1',
    email: 'user1@example.com',
    firstName: 'Taro',
    lastName: 'Yamada',
    role: UserRole.MEMBER,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUser2: Partial<UserProfile> = {
    id: 'user-2',
    email: 'user2@example.com',
    firstName: 'Hanako',
    lastName: 'Suzuki',
    role: UserRole.MANAGER,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProject: Partial<Project> = {
    id: 'project-1',
    name: 'Test Project',
    description: 'A test project',
    ownerId: 'user-1',
    organizationId: 'org-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTask: Partial<Task> = {
    id: 'task-1',
    title: 'Test Task',
    description: 'A test task',
    projectId: 'project-1',
    assigneeId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockReminder: Partial<Reminder> = {
    id: 'reminder-1',
    title: 'Reminder Title',
    message: 'Reminder message body',
    type: ReminderType.TASK_DUE,
    status: ReminderStatus.PENDING,
    channel: ReminderChannel.EMAIL,
    userId: 'user-1',
    taskId: 'task-1',
    projectId: 'project-1',
    scheduledAt: new Date(),
    retryCount: 0,
    isRead: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockInAppNotification: Partial<InAppNotification> = {
    id: 'notif-1',
    userId: 'user-1',
    type: 'deadline',
    title: 'Test notification',
    message: 'Test message',
    isRead: false,
    createdAt: new Date(),
  };

  const mockNotificationChannel: Partial<NotificationChannel> = {
    id: 'channel-1',
    name: 'Test Channel',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // =============================================
  // Module Setup
  // =============================================

  beforeEach(async () => {
    const mockEmailService = {
      sendReminderEmail: jest.fn(),
      sendEscalationEmail: jest.fn(),
    };

    const mockInAppNotificationService = {
      create: jest.fn(),
      getUnreadCount: jest.fn(),
    };

    const mockNotificationGateway = {
      sendToUser: jest.fn(),
      sendUnreadCount: jest.fn(),
    };

    const mockUserProfileRepo = {
      findBy: jest.fn(),
      findOne: jest.fn(),
    };

    const mockNotificationChannelRepo = {
      update: jest.fn(),
      findOne: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: EmailService, useValue: mockEmailService },
        { provide: InAppNotificationService, useValue: mockInAppNotificationService },
        { provide: NotificationGateway, useValue: mockNotificationGateway },
        { provide: getRepositoryToken(UserProfile), useValue: mockUserProfileRepo },
        { provide: getRepositoryToken(NotificationChannel), useValue: mockNotificationChannelRepo },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    emailService = module.get(EmailService);
    inAppNotificationService = module.get(InAppNotificationService);
    notificationGateway = module.get(NotificationGateway);
    userProfileRepository = module.get(getRepositoryToken(UserProfile));
    notificationChannelRepository = module.get(getRepositoryToken(NotificationChannel));

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // =============================================
  // sendNotification
  // =============================================

  describe('sendNotification', () => {
    describe('EMAIL channel', () => {
      it('should delegate to sendEmailNotification for EMAIL channel', async () => {
        const options: SendNotificationOptions = {
          channel: ReminderChannel.EMAIL,
          reminder: mockReminder as Reminder,
          task: mockTask as Task,
          recipients: [mockUser1 as UserProfile],
        };

        emailService.sendReminderEmail.mockResolvedValue([true]);

        const result = await service.sendNotification(options);

        expect(result).toBe(true);
        expect(emailService.sendReminderEmail).toHaveBeenCalledWith(
          mockReminder,
          mockTask,
          [mockUser1],
        );
      });

      it('should send escalation email when escalationReason and escalationLevel and project are provided', async () => {
        const options: SendNotificationOptions = {
          channel: ReminderChannel.EMAIL,
          project: mockProject as Project,
          recipients: [mockUser1 as UserProfile, mockUser2 as UserProfile],
          escalationReason: 'Task overdue by 7 days',
          escalationLevel: 'Level 2',
          additionalInfo: 'Needs immediate attention',
        };

        emailService.sendEscalationEmail.mockResolvedValue([true, true]);

        const result = await service.sendNotification(options);

        expect(result).toBe(true);
        expect(emailService.sendEscalationEmail).toHaveBeenCalledWith(
          'Task overdue by 7 days',
          'Level 2',
          mockProject,
          [mockUser1, mockUser2],
          'Needs immediate attention',
        );
      });

      it('should return false when recipients array is empty for EMAIL', async () => {
        const options: SendNotificationOptions = {
          channel: ReminderChannel.EMAIL,
          reminder: mockReminder as Reminder,
          recipients: [],
        };

        const result = await service.sendNotification(options);

        expect(result).toBe(false);
        expect(emailService.sendReminderEmail).not.toHaveBeenCalled();
        expect(emailService.sendEscalationEmail).not.toHaveBeenCalled();
      });

      it('should return false when no valid notification data provided (no reminder, no escalation)', async () => {
        const options: SendNotificationOptions = {
          channel: ReminderChannel.EMAIL,
          recipients: [mockUser1 as UserProfile],
        };

        const result = await service.sendNotification(options);

        expect(result).toBe(false);
      });

      it('should return true if at least one escalation email succeeds', async () => {
        const options: SendNotificationOptions = {
          channel: ReminderChannel.EMAIL,
          project: mockProject as Project,
          recipients: [mockUser1 as UserProfile, mockUser2 as UserProfile],
          escalationReason: 'Overdue',
          escalationLevel: 'Level 1',
        };

        emailService.sendEscalationEmail.mockResolvedValue([false, true]);

        const result = await service.sendNotification(options);

        expect(result).toBe(true);
      });

      it('should return false if all escalation emails fail', async () => {
        const options: SendNotificationOptions = {
          channel: ReminderChannel.EMAIL,
          project: mockProject as Project,
          recipients: [mockUser1 as UserProfile, mockUser2 as UserProfile],
          escalationReason: 'Overdue',
          escalationLevel: 'Level 1',
        };

        emailService.sendEscalationEmail.mockResolvedValue([false, false]);

        const result = await service.sendNotification(options);

        expect(result).toBe(false);
      });

      it('should return true if at least one reminder email succeeds', async () => {
        const options: SendNotificationOptions = {
          channel: ReminderChannel.EMAIL,
          reminder: mockReminder as Reminder,
          recipients: [mockUser1 as UserProfile, mockUser2 as UserProfile],
        };

        emailService.sendReminderEmail.mockResolvedValue([true, false]);

        const result = await service.sendNotification(options);

        expect(result).toBe(true);
      });

      it('should return false if all reminder emails fail', async () => {
        const options: SendNotificationOptions = {
          channel: ReminderChannel.EMAIL,
          reminder: mockReminder as Reminder,
          recipients: [mockUser1 as UserProfile],
        };

        emailService.sendReminderEmail.mockResolvedValue([false]);

        const result = await service.sendNotification(options);

        expect(result).toBe(false);
      });

      it('should pass null for task when task is not provided in reminder email', async () => {
        const options: SendNotificationOptions = {
          channel: ReminderChannel.EMAIL,
          reminder: mockReminder as Reminder,
          recipients: [mockUser1 as UserProfile],
        };

        emailService.sendReminderEmail.mockResolvedValue([true]);

        await service.sendNotification(options);

        expect(emailService.sendReminderEmail).toHaveBeenCalledWith(
          mockReminder,
          null,
          [mockUser1],
        );
      });

      it('should return false when emailService throws an error', async () => {
        const options: SendNotificationOptions = {
          channel: ReminderChannel.EMAIL,
          reminder: mockReminder as Reminder,
          recipients: [mockUser1 as UserProfile],
        };

        emailService.sendReminderEmail.mockRejectedValue(new Error('SMTP connection failed'));

        const result = await service.sendNotification(options);

        expect(result).toBe(false);
      });
    });

    describe('IN_APP channel', () => {
      it('should create in-app notification and push via WebSocket for each recipient', async () => {
        const options: SendNotificationOptions = {
          channel: ReminderChannel.IN_APP,
          reminder: mockReminder as Reminder,
          task: mockTask as Task,
          recipients: [mockUser1 as UserProfile],
        };

        inAppNotificationService.create.mockResolvedValue(mockInAppNotification);
        inAppNotificationService.getUnreadCount.mockResolvedValue(5);

        const result = await service.sendNotification(options);

        expect(result).toBe(true);
        expect(inAppNotificationService.create).toHaveBeenCalledWith({
          userId: 'user-1',
          type: 'deadline',
          title: 'Reminder Title',
          message: 'Reminder message body',
          linkUrl: '/projects/project-1/tasks/task-1',
          taskId: 'task-1',
          projectId: 'project-1',
        });
        expect(notificationGateway.sendToUser).toHaveBeenCalledWith('user-1', mockInAppNotification);
        expect(notificationGateway.sendUnreadCount).toHaveBeenCalledWith('user-1', 5);
      });

      it('should send to multiple recipients independently', async () => {
        const options: SendNotificationOptions = {
          channel: ReminderChannel.IN_APP,
          reminder: mockReminder as Reminder,
          task: mockTask as Task,
          recipients: [mockUser1 as UserProfile, mockUser2 as UserProfile],
        };

        inAppNotificationService.create
          .mockResolvedValueOnce({ ...mockInAppNotification, userId: 'user-1' })
          .mockResolvedValueOnce({ ...mockInAppNotification, userId: 'user-2' });
        inAppNotificationService.getUnreadCount
          .mockResolvedValueOnce(3)
          .mockResolvedValueOnce(7);

        const result = await service.sendNotification(options);

        expect(result).toBe(true);
        expect(inAppNotificationService.create).toHaveBeenCalledTimes(2);
        expect(notificationGateway.sendToUser).toHaveBeenCalledTimes(2);
        expect(notificationGateway.sendUnreadCount).toHaveBeenCalledTimes(2);
      });

      it('should return false when recipients array is empty for IN_APP', async () => {
        const options: SendNotificationOptions = {
          channel: ReminderChannel.IN_APP,
          recipients: [],
        };

        const result = await service.sendNotification(options);

        expect(result).toBe(false);
        expect(inAppNotificationService.create).not.toHaveBeenCalled();
      });

      it('should continue processing other recipients when one fails', async () => {
        const options: SendNotificationOptions = {
          channel: ReminderChannel.IN_APP,
          reminder: mockReminder as Reminder,
          task: mockTask as Task,
          recipients: [mockUser1 as UserProfile, mockUser2 as UserProfile],
        };

        inAppNotificationService.create
          .mockRejectedValueOnce(new Error('DB error'))
          .mockResolvedValueOnce(mockInAppNotification);
        inAppNotificationService.getUnreadCount.mockResolvedValue(1);

        const result = await service.sendNotification(options);

        expect(result).toBe(true);
        expect(inAppNotificationService.create).toHaveBeenCalledTimes(2);
        // Only the second recipient succeeds
        expect(notificationGateway.sendToUser).toHaveBeenCalledTimes(1);
      });

      it('should return false when all in-app notifications fail', async () => {
        const options: SendNotificationOptions = {
          channel: ReminderChannel.IN_APP,
          reminder: mockReminder as Reminder,
          task: mockTask as Task,
          recipients: [mockUser1 as UserProfile],
        };

        inAppNotificationService.create.mockRejectedValue(new Error('DB error'));

        const result = await service.sendNotification(options);

        expect(result).toBe(false);
      });

      it('should build escalation content for in-app notification', async () => {
        const options: SendNotificationOptions = {
          channel: ReminderChannel.IN_APP,
          project: mockProject as Project,
          recipients: [mockUser1 as UserProfile],
          escalationReason: 'Progress below threshold',
        };

        inAppNotificationService.create.mockResolvedValue(mockInAppNotification);
        inAppNotificationService.getUnreadCount.mockResolvedValue(1);

        await service.sendNotification(options);

        expect(inAppNotificationService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: 'user-1',
            type: 'system',
            title: 'エスカレーション: Test Project',
            message: 'Progress below threshold',
            linkUrl: '/projects/project-1',
            projectId: 'project-1',
          }),
        );
      });

      it('should build reminder-without-task content for in-app notification', async () => {
        const reminderOnly: Partial<Reminder> = {
          ...mockReminder,
          title: 'Project Reminder',
          message: 'Check project status',
        };

        const options: SendNotificationOptions = {
          channel: ReminderChannel.IN_APP,
          reminder: reminderOnly as Reminder,
          recipients: [mockUser1 as UserProfile],
        };

        inAppNotificationService.create.mockResolvedValue(mockInAppNotification);
        inAppNotificationService.getUnreadCount.mockResolvedValue(1);

        await service.sendNotification(options);

        expect(inAppNotificationService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'system',
            title: 'Project Reminder',
            message: 'Check project status',
            linkUrl: '/projects/project-1',
          }),
        );
      });

      it('should build default content when no reminder/escalation/task', async () => {
        const options: SendNotificationOptions = {
          channel: ReminderChannel.IN_APP,
          recipients: [mockUser1 as UserProfile],
        };

        inAppNotificationService.create.mockResolvedValue(mockInAppNotification);
        inAppNotificationService.getUnreadCount.mockResolvedValue(1);

        await service.sendNotification(options);

        expect(inAppNotificationService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'system',
            title: '通知',
            message: '',
          }),
        );
      });

      it('should use reminder defaults when title/message are empty', async () => {
        const reminderNoTitle: Partial<Reminder> = {
          ...mockReminder,
          title: undefined,
          message: undefined,
        };

        const options: SendNotificationOptions = {
          channel: ReminderChannel.IN_APP,
          reminder: reminderNoTitle as Reminder,
          task: mockTask as Task,
          recipients: [mockUser1 as UserProfile],
        };

        inAppNotificationService.create.mockResolvedValue(mockInAppNotification);
        inAppNotificationService.getUnreadCount.mockResolvedValue(1);

        await service.sendNotification(options);

        expect(inAppNotificationService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'タスクリマインダー: Test Task',
            message: 'タスク「Test Task」の期限が近づいています',
          }),
        );
      });

      it('should use reminder defaults for reminder without task when title/message are empty', async () => {
        const reminderNoTitle: Partial<Reminder> = {
          ...mockReminder,
          title: undefined,
          message: undefined,
          projectId: undefined,
        };

        const options: SendNotificationOptions = {
          channel: ReminderChannel.IN_APP,
          reminder: reminderNoTitle as Reminder,
          recipients: [mockUser1 as UserProfile],
        };

        inAppNotificationService.create.mockResolvedValue(mockInAppNotification);
        inAppNotificationService.getUnreadCount.mockResolvedValue(1);

        await service.sendNotification(options);

        expect(inAppNotificationService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'リマインダー',
            message: '',
          }),
        );
      });

      it('should use task.projectId as projectId when project is not directly provided', async () => {
        const options: SendNotificationOptions = {
          channel: ReminderChannel.IN_APP,
          task: mockTask as Task,
          recipients: [mockUser1 as UserProfile],
        };

        inAppNotificationService.create.mockResolvedValue(mockInAppNotification);
        inAppNotificationService.getUnreadCount.mockResolvedValue(1);

        await service.sendNotification(options);

        expect(inAppNotificationService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            projectId: 'project-1',
            taskId: 'task-1',
          }),
        );
      });
    });

    describe('SLACK channel (fallback to IN_APP)', () => {
      it('should fall back to in-app notification for SLACK channel', async () => {
        const options: SendNotificationOptions = {
          channel: ReminderChannel.SLACK,
          reminder: mockReminder as Reminder,
          task: mockTask as Task,
          recipients: [mockUser1 as UserProfile],
        };

        inAppNotificationService.create.mockResolvedValue(mockInAppNotification);
        inAppNotificationService.getUnreadCount.mockResolvedValue(1);

        const result = await service.sendNotification(options);

        expect(result).toBe(true);
        expect(inAppNotificationService.create).toHaveBeenCalled();
        expect(emailService.sendReminderEmail).not.toHaveBeenCalled();
      });
    });

    describe('TEAMS channel (fallback to IN_APP)', () => {
      it('should fall back to in-app notification for TEAMS channel', async () => {
        const options: SendNotificationOptions = {
          channel: ReminderChannel.TEAMS,
          reminder: mockReminder as Reminder,
          task: mockTask as Task,
          recipients: [mockUser1 as UserProfile],
        };

        inAppNotificationService.create.mockResolvedValue(mockInAppNotification);
        inAppNotificationService.getUnreadCount.mockResolvedValue(1);

        const result = await service.sendNotification(options);

        expect(result).toBe(true);
        expect(inAppNotificationService.create).toHaveBeenCalled();
      });
    });

    describe('WEBHOOK channel (fallback to IN_APP)', () => {
      it('should fall back to in-app notification for WEBHOOK channel', async () => {
        const options: SendNotificationOptions = {
          channel: ReminderChannel.WEBHOOK,
          reminder: mockReminder as Reminder,
          task: mockTask as Task,
          recipients: [mockUser1 as UserProfile],
        };

        inAppNotificationService.create.mockResolvedValue(mockInAppNotification);
        inAppNotificationService.getUnreadCount.mockResolvedValue(1);

        const result = await service.sendNotification(options);

        expect(result).toBe(true);
        expect(inAppNotificationService.create).toHaveBeenCalled();
      });
    });

    describe('unknown channel', () => {
      it('should return false for unknown channel', async () => {
        const options: SendNotificationOptions = {
          channel: 'unknown_channel' as ReminderChannel,
          recipients: [mockUser1 as UserProfile],
        };

        const result = await service.sendNotification(options);

        expect(result).toBe(false);
      });
    });

    describe('top-level error handling', () => {
      it('should catch errors and return false when sendNotification throws', async () => {
        const options: SendNotificationOptions = {
          channel: ReminderChannel.IN_APP,
          recipients: [mockUser1 as UserProfile],
        };

        // Force buildInAppContent to throw by making the outer try-catch trigger
        // We can do this by simulating an error in sendInAppNotification's outer catch
        inAppNotificationService.create.mockImplementation(() => {
          throw new Error('Unexpected error');
        });

        const result = await service.sendNotification(options);

        expect(result).toBe(false);
      });
    });
  });

  // =============================================
  // getRecipientsByIds
  // =============================================

  describe('getRecipientsByIds', () => {
    it('should return empty array when no userIds provided', async () => {
      const result = await service.getRecipientsByIds([]);

      expect(result).toEqual([]);
      expect(userProfileRepository.findBy).not.toHaveBeenCalled();
    });

    it('should call userProfileRepository.findBy with mapped IDs', async () => {
      userProfileRepository.findBy.mockResolvedValue([mockUser1, mockUser2]);

      const result = await service.getRecipientsByIds(['user-1', 'user-2']);

      expect(result).toEqual([mockUser1, mockUser2]);
      expect(userProfileRepository.findBy).toHaveBeenCalledWith([
        { id: 'user-1' },
        { id: 'user-2' },
      ]);
    });

    it('should return single user when one ID provided', async () => {
      userProfileRepository.findBy.mockResolvedValue([mockUser1]);

      const result = await service.getRecipientsByIds(['user-1']);

      expect(result).toEqual([mockUser1]);
      expect(userProfileRepository.findBy).toHaveBeenCalledWith([{ id: 'user-1' }]);
    });
  });

  // =============================================
  // sendReminderNotification
  // =============================================

  describe('sendReminderNotification', () => {
    it('should use reminder.user when already populated', async () => {
      const reminderWithUser: Partial<Reminder> = {
        ...mockReminder,
        user: mockUser1 as UserProfile,
        channel: ReminderChannel.EMAIL,
      };

      emailService.sendReminderEmail.mockResolvedValue([true]);

      const result = await service.sendReminderNotification(
        reminderWithUser as Reminder,
        mockTask as Task,
      );

      expect(result).toBe(true);
      expect(userProfileRepository.findOne).not.toHaveBeenCalled();
      expect(emailService.sendReminderEmail).toHaveBeenCalledWith(
        reminderWithUser,
        mockTask,
        [mockUser1],
      );
    });

    it('should fetch user from repository when reminder.user is not populated but userId exists', async () => {
      const reminderWithUserId: Partial<Reminder> = {
        ...mockReminder,
        user: undefined,
        userId: 'user-1',
        channel: ReminderChannel.EMAIL,
      };

      userProfileRepository.findOne.mockResolvedValue(mockUser1);
      emailService.sendReminderEmail.mockResolvedValue([true]);

      const result = await service.sendReminderNotification(
        reminderWithUserId as Reminder,
        mockTask as Task,
      );

      expect(result).toBe(true);
      expect(userProfileRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
    });

    it('should return false when no user found for reminder.userId', async () => {
      const reminderWithUserId: Partial<Reminder> = {
        ...mockReminder,
        user: undefined,
        userId: 'nonexistent-user',
        channel: ReminderChannel.EMAIL,
      };

      userProfileRepository.findOne.mockResolvedValue(null);

      const result = await service.sendReminderNotification(
        reminderWithUserId as Reminder,
      );

      expect(result).toBe(false);
      expect(emailService.sendReminderEmail).not.toHaveBeenCalled();
    });

    it('should return false when neither user nor userId is present', async () => {
      const reminderNoUser: Partial<Reminder> = {
        ...mockReminder,
        user: undefined,
        userId: undefined,
        channel: ReminderChannel.EMAIL,
      };

      const result = await service.sendReminderNotification(
        reminderNoUser as Reminder,
      );

      expect(result).toBe(false);
    });

    it('should pass the correct channel from reminder to sendNotification', async () => {
      const reminderInApp: Partial<Reminder> = {
        ...mockReminder,
        user: mockUser1 as UserProfile,
        channel: ReminderChannel.IN_APP,
      };

      inAppNotificationService.create.mockResolvedValue(mockInAppNotification);
      inAppNotificationService.getUnreadCount.mockResolvedValue(1);

      const result = await service.sendReminderNotification(
        reminderInApp as Reminder,
        mockTask as Task,
      );

      expect(result).toBe(true);
      expect(inAppNotificationService.create).toHaveBeenCalled();
      expect(emailService.sendReminderEmail).not.toHaveBeenCalled();
    });

    it('should work without a task parameter', async () => {
      const reminderWithUser: Partial<Reminder> = {
        ...mockReminder,
        user: mockUser1 as UserProfile,
        channel: ReminderChannel.EMAIL,
      };

      emailService.sendReminderEmail.mockResolvedValue([true]);

      const result = await service.sendReminderNotification(
        reminderWithUser as Reminder,
      );

      expect(result).toBe(true);
      expect(emailService.sendReminderEmail).toHaveBeenCalledWith(
        reminderWithUser,
        null,
        [mockUser1],
      );
    });
  });

  // =============================================
  // sendEscalationNotification
  // =============================================

  describe('sendEscalationNotification', () => {
    it('should fetch recipients and send escalation notification via EMAIL', async () => {
      userProfileRepository.findBy.mockResolvedValue([mockUser1, mockUser2]);
      emailService.sendEscalationEmail.mockResolvedValue([true, true]);

      const result = await service.sendEscalationNotification(
        'Task overdue by 7 days',
        'Level 2',
        mockProject as Project,
        ['user-1', 'user-2'],
        'Needs attention',
      );

      expect(result).toBe(true);
      expect(userProfileRepository.findBy).toHaveBeenCalledWith([
        { id: 'user-1' },
        { id: 'user-2' },
      ]);
      expect(emailService.sendEscalationEmail).toHaveBeenCalledWith(
        'Task overdue by 7 days',
        'Level 2',
        mockProject,
        [mockUser1, mockUser2],
        'Needs attention',
      );
    });

    it('should still call sendNotification when no recipients found (returns false via email flow)', async () => {
      userProfileRepository.findBy.mockResolvedValue([]);

      const result = await service.sendEscalationNotification(
        'Overdue',
        'Level 1',
        mockProject as Project,
        ['nonexistent-user'],
      );

      // With empty recipients, sendEmailNotification returns false
      expect(result).toBe(false);
    });

    it('should work without additionalInfo', async () => {
      userProfileRepository.findBy.mockResolvedValue([mockUser1]);
      emailService.sendEscalationEmail.mockResolvedValue([true]);

      const result = await service.sendEscalationNotification(
        'Progress below 20%',
        'Level 3',
        mockProject as Project,
        ['user-1'],
      );

      expect(result).toBe(true);
      expect(emailService.sendEscalationEmail).toHaveBeenCalledWith(
        'Progress below 20%',
        'Level 3',
        mockProject,
        [mockUser1],
        undefined,
      );
    });

    it('should handle empty recipientIds array', async () => {
      const result = await service.sendEscalationNotification(
        'Overdue',
        'Level 1',
        mockProject as Project,
        [],
      );

      // getRecipientsByIds returns [] for empty input, sendEmailNotification returns false for empty recipients
      expect(result).toBe(false);
      expect(userProfileRepository.findBy).not.toHaveBeenCalled();
    });
  });

  // =============================================
  // updateNotificationChannel
  // =============================================

  describe('updateNotificationChannel', () => {
    it('should update and return the updated notification channel', async () => {
      const updates = { name: 'Updated Channel', isActive: false };
      const updatedChannel = { ...mockNotificationChannel, ...updates };

      notificationChannelRepository.update.mockResolvedValue({ affected: 1 });
      notificationChannelRepository.findOne.mockResolvedValue(updatedChannel);

      const result = await service.updateNotificationChannel('channel-1', updates);

      expect(notificationChannelRepository.update).toHaveBeenCalledWith('channel-1', updates);
      expect(notificationChannelRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'channel-1' },
      });
      expect(result).toEqual(updatedChannel);
    });

    it('should return null when channel is not found after update', async () => {
      notificationChannelRepository.update.mockResolvedValue({ affected: 0 });
      notificationChannelRepository.findOne.mockResolvedValue(null);

      const result = await service.updateNotificationChannel('nonexistent', { name: 'New Name' });

      expect(result).toBeNull();
    });
  });

  // =============================================
  // deleteNotificationChannel
  // =============================================

  describe('deleteNotificationChannel', () => {
    it('should return true when channel is successfully deleted', async () => {
      notificationChannelRepository.delete.mockResolvedValue({ affected: 1 });

      const result = await service.deleteNotificationChannel('channel-1');

      expect(result).toBe(true);
      expect(notificationChannelRepository.delete).toHaveBeenCalledWith('channel-1');
    });

    it('should return false when channel does not exist', async () => {
      notificationChannelRepository.delete.mockResolvedValue({ affected: 0 });

      const result = await service.deleteNotificationChannel('nonexistent');

      expect(result).toBe(false);
    });

    it('should return false when affected is undefined (null coalescing)', async () => {
      notificationChannelRepository.delete.mockResolvedValue({ affected: undefined });

      const result = await service.deleteNotificationChannel('channel-1');

      expect(result).toBe(false);
    });
  });

  // =============================================
  // buildInAppContent (tested indirectly via sendNotification IN_APP)
  // =============================================

  describe('buildInAppContent (via sendNotification)', () => {
    beforeEach(() => {
      inAppNotificationService.create.mockResolvedValue(mockInAppNotification);
      inAppNotificationService.getUnreadCount.mockResolvedValue(0);
    });

    it('should build escalation content with project link', async () => {
      await service.sendNotification({
        channel: ReminderChannel.IN_APP,
        project: mockProject as Project,
        recipients: [mockUser1 as UserProfile],
        escalationReason: 'Delayed',
      });

      expect(inAppNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'エスカレーション: Test Project',
          message: 'Delayed',
          type: 'system',
          linkUrl: '/projects/project-1',
        }),
      );
    });

    it('should build reminder+task content with task link', async () => {
      await service.sendNotification({
        channel: ReminderChannel.IN_APP,
        reminder: mockReminder as Reminder,
        task: mockTask as Task,
        recipients: [mockUser1 as UserProfile],
      });

      expect(inAppNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'deadline',
          linkUrl: '/projects/project-1/tasks/task-1',
        }),
      );
    });

    it('should not set linkUrl when task has no projectId', async () => {
      const taskNoProject: Partial<Task> = {
        ...mockTask,
        projectId: undefined,
      };

      await service.sendNotification({
        channel: ReminderChannel.IN_APP,
        reminder: mockReminder as Reminder,
        task: taskNoProject as Task,
        recipients: [mockUser1 as UserProfile],
      });

      expect(inAppNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          linkUrl: undefined,
        }),
      );
    });

    it('should build reminder-only content with project link', async () => {
      const reminderWithProject: Partial<Reminder> = {
        ...mockReminder,
        title: 'Project Update',
        message: 'Check status',
        projectId: 'project-1',
      };

      await service.sendNotification({
        channel: ReminderChannel.IN_APP,
        reminder: reminderWithProject as Reminder,
        recipients: [mockUser1 as UserProfile],
      });

      expect(inAppNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'system',
          title: 'Project Update',
          message: 'Check status',
          linkUrl: '/projects/project-1',
        }),
      );
    });

    it('should not set linkUrl for reminder without projectId', async () => {
      const reminderNoProject: Partial<Reminder> = {
        ...mockReminder,
        title: 'General Reminder',
        message: 'Something',
        projectId: undefined,
      };

      await service.sendNotification({
        channel: ReminderChannel.IN_APP,
        reminder: reminderNoProject as Reminder,
        recipients: [mockUser1 as UserProfile],
      });

      expect(inAppNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          linkUrl: undefined,
        }),
      );
    });

    it('should use fallback content when no reminder, task, or escalation data', async () => {
      await service.sendNotification({
        channel: ReminderChannel.IN_APP,
        recipients: [mockUser1 as UserProfile],
      });

      expect(inAppNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '通知',
          message: '',
          type: 'system',
        }),
      );
    });

    it('should prioritize escalation over reminder content', async () => {
      await service.sendNotification({
        channel: ReminderChannel.IN_APP,
        reminder: mockReminder as Reminder,
        project: mockProject as Project,
        recipients: [mockUser1 as UserProfile],
        escalationReason: 'Escalation reason',
      });

      expect(inAppNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'エスカレーション: Test Project',
          message: 'Escalation reason',
          type: 'system',
        }),
      );
    });
  });
});
