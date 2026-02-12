import { Test, TestingModule } from '@nestjs/testing';
import { TaskController } from './task.controller';
import { TaskService } from './task.service';
import { TaskAccessGuard } from './guards/task-access.guard';

describe('TaskController', () => {
  let controller: TaskController;

  const mockTask = {
    id: 'task-uuid-1',
    title: 'Test Task',
    status: 'todo',
    progress: 0,
    projectId: 'proj-1',
  };

  const mockTaskService = {
    create: jest.fn(),
    bulkCreate: jest.fn(),
    findAll: jest.fn(),
    getTaskStatistics: jest.fn(),
    getOverdueTasks: jest.fn(),
    getUpcomingTasks: jest.fn(),
    getTasksByProject: jest.fn(),
    getTasksByAssignee: jest.fn(),
    getTasksByPartner: jest.fn(),
    findDeleted: jest.fn(),
    restore: jest.fn(),
    getSubtasks: jest.fn(),
    addSubtask: jest.fn(),
    toggleSubtask: jest.fn(),
    addComment: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn(),
    updateProgress: jest.fn(),
    assignTask: jest.fn(),
    assignToPartner: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TaskController],
      providers: [
        { provide: TaskService, useValue: mockTaskService },
      ],
    })
      .overrideGuard(TaskAccessGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TaskController>(TaskController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new task', async () => {
      const createDto = { title: 'New Task', projectId: 'proj-1' };
      mockTaskService.create.mockResolvedValue(mockTask);

      const result = await controller.create(createDto as any, 'user-1');

      expect(result).toEqual(mockTask);
      expect(mockTaskService.create).toHaveBeenCalledWith(createDto, 'user-1');
    });
  });

  describe('bulkCreate', () => {
    it('should bulk create tasks', async () => {
      const bulkDto = { tasks: [{ title: 'Task 1' }, { title: 'Task 2' }] };
      const expected = [mockTask, { ...mockTask, id: 'task-2' }];
      mockTaskService.bulkCreate.mockResolvedValue(expected);

      const result = await controller.bulkCreate(bulkDto as any, 'user-1');

      expect(result).toEqual(expected);
      expect(mockTaskService.bulkCreate).toHaveBeenCalledWith(bulkDto, 'user-1');
    });
  });

  describe('findAll', () => {
    it('should return paginated tasks', async () => {
      const expected = { data: [mockTask], total: 1 };
      mockTaskService.findAll.mockResolvedValue(expected);

      const result = await controller.findAll({} as any);

      expect(result).toEqual(expected);
    });
  });

  describe('getStatistics', () => {
    it('should return task statistics without projectId', async () => {
      const stats = { total: 10 };
      mockTaskService.getTaskStatistics.mockResolvedValue(stats);

      const result = await controller.getStatistics(undefined);

      expect(result).toEqual(stats);
      expect(mockTaskService.getTaskStatistics).toHaveBeenCalledWith(undefined);
    });

    it('should return task statistics with projectId', async () => {
      mockTaskService.getTaskStatistics.mockResolvedValue({ total: 5 });

      await controller.getStatistics('proj-1');

      expect(mockTaskService.getTaskStatistics).toHaveBeenCalledWith('proj-1');
    });
  });

  describe('getOverdueTasks', () => {
    it('should return overdue tasks', async () => {
      mockTaskService.getOverdueTasks.mockResolvedValue([mockTask]);

      const result = await controller.getOverdueTasks();

      expect(result).toEqual([mockTask]);
    });
  });

  describe('getUpcomingTasks', () => {
    it('should return upcoming tasks with default days', async () => {
      mockTaskService.getUpcomingTasks.mockResolvedValue([]);

      await controller.getUpcomingTasks(undefined);

      expect(mockTaskService.getUpcomingTasks).toHaveBeenCalledWith(7);
    });

    it('should return upcoming tasks with custom days', async () => {
      mockTaskService.getUpcomingTasks.mockResolvedValue([]);

      await controller.getUpcomingTasks(14);

      expect(mockTaskService.getUpcomingTasks).toHaveBeenCalledWith(14);
    });
  });

  describe('getTasksByProject', () => {
    it('should return tasks by project', async () => {
      mockTaskService.getTasksByProject.mockResolvedValue([mockTask]);

      const result = await controller.getTasksByProject('proj-1');

      expect(result).toEqual([mockTask]);
    });
  });

  describe('getTasksByAssignee', () => {
    it('should return tasks by assignee', async () => {
      mockTaskService.getTasksByAssignee.mockResolvedValue([mockTask]);

      const result = await controller.getTasksByAssignee('user-1');

      expect(result).toEqual([mockTask]);
    });
  });

  describe('getTasksByPartner', () => {
    it('should return tasks by partner', async () => {
      mockTaskService.getTasksByPartner.mockResolvedValue([mockTask]);

      const result = await controller.getTasksByPartner('partner-1');

      expect(result).toEqual([mockTask]);
    });
  });

  describe('findDeleted', () => {
    it('should return soft-deleted tasks', async () => {
      mockTaskService.findDeleted.mockResolvedValue([]);

      const result = await controller.findDeleted();

      expect(result).toEqual([]);
    });
  });

  describe('restore', () => {
    it('should restore a soft-deleted task', async () => {
      mockTaskService.restore.mockResolvedValue(mockTask);

      const result = await controller.restore('task-1');

      expect(result).toEqual(mockTask);
    });
  });

  describe('getSubtasks', () => {
    it('should return subtasks of a task', async () => {
      const subtasks = [{ id: 'sub-1', title: 'Subtask 1' }];
      mockTaskService.getSubtasks.mockResolvedValue(subtasks);

      const result = await controller.getSubtasks('task-1');

      expect(result).toEqual(subtasks);
    });
  });

  describe('addSubtask', () => {
    it('should add a subtask', async () => {
      const subtask = { id: 'sub-1', title: 'New Subtask' };
      mockTaskService.addSubtask.mockResolvedValue(subtask);

      const result = await controller.addSubtask('task-1', 'New Subtask');

      expect(result).toEqual(subtask);
      expect(mockTaskService.addSubtask).toHaveBeenCalledWith('task-1', 'New Subtask');
    });
  });

  describe('toggleSubtask', () => {
    it('should toggle subtask completion', async () => {
      mockTaskService.toggleSubtask.mockResolvedValue({ id: 'sub-1', completed: true });

      const result = await controller.toggleSubtask('task-1', 'sub-1');

      expect(mockTaskService.toggleSubtask).toHaveBeenCalledWith('task-1', 'sub-1');
    });
  });

  describe('addComment', () => {
    it('should add a comment to a task', async () => {
      const comment = { id: 'comment-1', content: 'Test comment' };
      mockTaskService.addComment.mockResolvedValue(comment);

      const result = await controller.addComment('task-1', 'Test comment', 'user-1');

      expect(result).toEqual(comment);
      expect(mockTaskService.addComment).toHaveBeenCalledWith('task-1', 'Test comment', 'user-1');
    });
  });

  describe('findOne', () => {
    it('should return a task by id', async () => {
      mockTaskService.findOne.mockResolvedValue(mockTask);

      const result = await controller.findOne('task-1');

      expect(result).toEqual(mockTask);
    });

    it('should propagate not found errors', async () => {
      mockTaskService.findOne.mockRejectedValue(new Error('Not found'));

      await expect(controller.findOne('invalid')).rejects.toThrow('Not found');
    });
  });

  describe('update', () => {
    it('should update a task', async () => {
      const updateDto = { title: 'Updated Task' };
      mockTaskService.update.mockResolvedValue({ ...mockTask, ...updateDto });

      const result = await controller.update('task-1', updateDto as any);

      expect(result.title).toBe('Updated Task');
    });
  });

  describe('updateStatus', () => {
    it('should update task status', async () => {
      mockTaskService.updateStatus.mockResolvedValue({ ...mockTask, status: 'in_progress' });

      await controller.updateStatus('task-1', { status: 'in_progress' } as any);

      expect(mockTaskService.updateStatus).toHaveBeenCalledWith('task-1', 'in_progress');
    });
  });

  describe('updateProgress', () => {
    it('should update task progress', async () => {
      mockTaskService.updateProgress.mockResolvedValue({ ...mockTask, progress: 75 });

      await controller.updateProgress('task-1', { progress: 75 } as any);

      expect(mockTaskService.updateProgress).toHaveBeenCalledWith('task-1', 75);
    });
  });

  describe('assignTask', () => {
    it('should assign a task to a user', async () => {
      mockTaskService.assignTask.mockResolvedValue({ ...mockTask, assigneeId: 'user-2' });

      await controller.assignTask('task-1', { assigneeId: 'user-2' } as any);

      expect(mockTaskService.assignTask).toHaveBeenCalledWith('task-1', 'user-2');
    });
  });

  describe('assignToPartner', () => {
    it('should assign a task to a partner', async () => {
      mockTaskService.assignToPartner.mockResolvedValue({ ...mockTask, partnerId: 'partner-1' });

      await controller.assignToPartner('task-1', { partnerId: 'partner-1' } as any);

      expect(mockTaskService.assignToPartner).toHaveBeenCalledWith('task-1', 'partner-1');
    });
  });

  describe('remove', () => {
    it('should delete a task', async () => {
      mockTaskService.remove.mockResolvedValue(undefined);

      await controller.remove('task-1');

      expect(mockTaskService.remove).toHaveBeenCalledWith('task-1');
    });
  });
});
