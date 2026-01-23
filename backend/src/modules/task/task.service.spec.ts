import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskService } from './task.service';
import { Task } from './entities/task.entity';
import { TaskStatus, TaskPriority, TaskType } from './enums/task-status.enum';
import { NotFoundException } from '@nestjs/common';

describe('TaskService', () => {
  let service: TaskService;
  let repository: Repository<Task>;

  const mockTask: Partial<Task> = {
    id: 'test-task-uuid',
    title: 'Test Task',
    description: 'Test description',
    status: TaskStatus.TODO,
    priority: TaskPriority.HIGH,
    type: TaskType.FEATURE,
    dueDate: new Date('2024-12-31'),
    progress: 0,
    estimatedHours: 8,
    actualHours: 0,
    subtasks: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[mockTask], 1]),
      getMany: jest.fn().mockResolvedValue([mockTask]),
      getCount: jest.fn().mockResolvedValue(10),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskService,
        {
          provide: getRepositoryToken(Task),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<TaskService>(TaskService);
    repository = module.get<Repository<Task>>(getRepositoryToken(Task));

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto = {
      title: 'New Task',
      description: 'New task description',
      priority: TaskPriority.MEDIUM,
    };

    it('should create a task successfully', async () => {
      mockRepository.create.mockReturnValue({ ...mockTask, ...createDto });
      mockRepository.save.mockResolvedValue({ ...mockTask, ...createDto });
      mockRepository.findOne.mockResolvedValue({ ...mockTask, ...createDto });

      const result = await service.create(createDto, 'user-uuid');

      expect(result).toBeDefined();
      expect(mockRepository.create).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a task when found', async () => {
      mockRepository.findOne.mockResolvedValue(mockTask);

      const result = await service.findOne('test-task-uuid');

      expect(result).toEqual(mockTask);
    });

    it('should throw NotFoundException when task not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent-uuid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return paginated tasks', async () => {
      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('updateStatus', () => {
    it('should update task status', async () => {
      mockRepository.findOne.mockResolvedValue({ ...mockTask });
      mockRepository.save.mockResolvedValue({
        ...mockTask,
        status: TaskStatus.IN_PROGRESS,
      });

      const result = await service.updateStatus('test-task-uuid', TaskStatus.IN_PROGRESS);

      expect(result.status).toBe(TaskStatus.IN_PROGRESS);
    });

    it('should set completedAt and progress when completing', async () => {
      const task = { ...mockTask };
      mockRepository.findOne.mockResolvedValue(task);
      mockRepository.save.mockImplementation((t) => Promise.resolve(t));

      await service.updateStatus('test-task-uuid', TaskStatus.COMPLETED);

      expect(task.completedAt).toBeDefined();
      expect(task.progress).toBe(100);
    });
  });

  describe('updateProgress', () => {
    it('should update task progress', async () => {
      mockRepository.findOne.mockResolvedValue({ ...mockTask });
      mockRepository.save.mockResolvedValue({
        ...mockTask,
        progress: 50,
      });

      const result = await service.updateProgress('test-task-uuid', 50);

      expect(result.progress).toBe(50);
    });

    it('should mark task as completed when progress is 100', async () => {
      const task = { ...mockTask };
      mockRepository.findOne.mockResolvedValue(task);
      mockRepository.save.mockImplementation((t) => Promise.resolve(t));

      await service.updateProgress('test-task-uuid', 100);

      expect(task.status).toBe(TaskStatus.COMPLETED);
      expect(task.completedAt).toBeDefined();
    });
  });

  describe('assignTask', () => {
    it('should assign task to user', async () => {
      mockRepository.findOne.mockResolvedValue({ ...mockTask });
      mockRepository.save.mockResolvedValue({
        ...mockTask,
        assigneeId: 'assignee-uuid',
      });

      const result = await service.assignTask('test-task-uuid', 'assignee-uuid');

      expect(mockRepository.save).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete a task', async () => {
      mockRepository.findOne.mockResolvedValue(mockTask);

      await service.remove('test-task-uuid');

      expect(mockRepository.remove).toHaveBeenCalledWith(mockTask);
    });
  });

  describe('getOverdueTasks', () => {
    it('should return overdue tasks', async () => {
      mockRepository.find.mockResolvedValue([mockTask]);

      const result = await service.getOverdueTasks();

      expect(result).toHaveLength(1);
    });
  });
});
