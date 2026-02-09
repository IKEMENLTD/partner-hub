import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseUUIDPipe,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { TaskService } from './task.service';
import {
  CreateTaskDto,
  UpdateTaskDto,
  QueryTaskDto,
  UpdateTaskStatusDto,
  UpdateTaskProgressDto,
  AssignTaskDto,
  AssignPartnerDto,
} from './dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TaskAccessGuard } from './guards/task-access.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../auth/enums/user-role.enum';

@ApiTags('Tasks')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MEMBER)
  @ApiOperation({ summary: 'Create a new task' })
  @ApiResponse({ status: 201, description: 'Task created successfully' })
  async create(@Body() createTaskDto: CreateTaskDto, @CurrentUser('id') userId: string) {
    return this.taskService.create(createTaskDto, userId);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MEMBER)
  @ApiOperation({ summary: 'Get all tasks with pagination and filters' })
  @ApiResponse({ status: 200, description: 'List of tasks' })
  async findAll(@Query() queryDto: QueryTaskDto) {
    return this.taskService.findAll(queryDto);
  }

  @Get('statistics')
  @Roles(UserRole.ADMIN, UserRole.MEMBER)
  @ApiOperation({ summary: 'Get task statistics' })
  @ApiQuery({ name: 'projectId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Task statistics' })
  async getStatistics(@Query('projectId') projectId?: string) {
    return this.taskService.getTaskStatistics(projectId);
  }

  @Get('overdue')
  @Roles(UserRole.ADMIN, UserRole.MEMBER)
  @ApiOperation({ summary: 'Get overdue tasks' })
  @ApiResponse({ status: 200, description: 'List of overdue tasks' })
  async getOverdueTasks() {
    return this.taskService.getOverdueTasks();
  }

  @Get('upcoming')
  @Roles(UserRole.ADMIN, UserRole.MEMBER)
  @ApiOperation({ summary: 'Get tasks with upcoming deadlines' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of upcoming tasks' })
  async getUpcomingTasks(@Query('days') days?: number) {
    return this.taskService.getUpcomingTasks(days || 7);
  }

  @Get('by-project/:projectId')
  @Roles(UserRole.ADMIN, UserRole.MEMBER)
  @ApiOperation({ summary: 'Get tasks by project ID' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'List of tasks for the project' })
  async getTasksByProject(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.taskService.getTasksByProject(projectId);
  }

  @Get('by-assignee/:assigneeId')
  @Roles(UserRole.ADMIN, UserRole.MEMBER)
  @ApiOperation({ summary: 'Get tasks by assignee ID' })
  @ApiParam({ name: 'assigneeId', description: 'Assignee user ID' })
  @ApiResponse({ status: 200, description: 'List of tasks for the assignee' })
  async getTasksByAssignee(@Param('assigneeId', ParseUUIDPipe) assigneeId: string) {
    return this.taskService.getTasksByAssignee(assigneeId);
  }

  @Get('by-partner/:partnerId')
  @Roles(UserRole.ADMIN, UserRole.MEMBER)
  @ApiOperation({ summary: 'Get tasks by partner ID' })
  @ApiParam({ name: 'partnerId', description: 'Partner ID' })
  @ApiResponse({ status: 200, description: 'List of tasks for the partner' })
  async getTasksByPartner(@Param('partnerId', ParseUUIDPipe) partnerId: string) {
    return this.taskService.getTasksByPartner(partnerId);
  }

  @Get(':id/subtasks')
  @UseGuards(TaskAccessGuard)
  @ApiOperation({ summary: 'Get subtasks of a task' })
  @ApiParam({ name: 'id', description: 'Parent Task ID' })
  @ApiResponse({ status: 200, description: 'List of subtasks' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async getSubtasks(@Param('id', ParseUUIDPipe) id: string) {
    return this.taskService.getSubtasks(id);
  }

  @Get(':id')
  @UseGuards(TaskAccessGuard)
  @ApiOperation({ summary: 'Get task by ID' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Task details' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.taskService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(TaskAccessGuard)
  @ApiOperation({ summary: 'Update task' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Task updated successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() updateTaskDto: UpdateTaskDto) {
    return this.taskService.update(id, updateTaskDto);
  }

  @Patch(':id/status')
  @UseGuards(TaskAccessGuard)
  @ApiOperation({ summary: 'Update task status' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Task status updated' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiResponse({ status: 400, description: 'Invalid status value' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateStatusDto: UpdateTaskStatusDto,
  ) {
    return this.taskService.updateStatus(id, updateStatusDto.status);
  }

  @Patch(':id/progress')
  @UseGuards(TaskAccessGuard)
  @ApiOperation({ summary: 'Update task progress' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Task progress updated' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiResponse({ status: 400, description: 'Invalid progress value (must be 0-100)' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async updateProgress(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProgressDto: UpdateTaskProgressDto,
  ) {
    return this.taskService.updateProgress(id, updateProgressDto.progress);
  }

  @Patch(':id/assign')
  @UseGuards(TaskAccessGuard)
  @Roles(UserRole.ADMIN, UserRole.MEMBER)
  @ApiOperation({ summary: 'Assign task to user' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Task assigned successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiResponse({ status: 400, description: 'Invalid assignee ID' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async assignTask(@Param('id', ParseUUIDPipe) id: string, @Body() assignTaskDto: AssignTaskDto) {
    return this.taskService.assignTask(id, assignTaskDto.assigneeId);
  }

  @Patch(':id/assign-partner')
  @UseGuards(TaskAccessGuard)
  @Roles(UserRole.ADMIN, UserRole.MEMBER)
  @ApiOperation({ summary: 'Assign task to partner' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Task assigned to partner successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiResponse({ status: 400, description: 'Invalid partner ID' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async assignToPartner(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() assignPartnerDto: AssignPartnerDto,
  ) {
    return this.taskService.assignToPartner(id, assignPartnerDto.partnerId);
  }

  @Delete(':id')
  @UseGuards(TaskAccessGuard)
  @Roles(UserRole.ADMIN, UserRole.MEMBER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete task' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({ status: 204, description: 'Task deleted successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.taskService.remove(id);
  }
}
