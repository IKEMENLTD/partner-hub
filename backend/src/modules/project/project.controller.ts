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
import { ProjectService } from './project.service';
import { HealthScoreService } from './services/health-score.service';
import {
  CreateProjectDto,
  UpdateProjectDto,
  QueryProjectDto,
  UpdateProjectStatusDto,
  UpdateProjectProgressDto,
} from './dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ProjectAccessGuard } from './guards/project-access.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../auth/enums/user-role.enum';
import { TaskService } from '../task/task.service';
import { CreateTaskDto, QueryTaskDto } from '../task/dto';

@ApiTags('Projects')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('projects')
export class ProjectController {
  constructor(
    private readonly projectService: ProjectService,
    private readonly healthScoreService: HealthScoreService,
    private readonly taskService: TaskService,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MEMBER)
  @ApiOperation({ summary: 'Create a new project' })
  @ApiResponse({ status: 201, description: 'Project created successfully' })
  async create(@Body() createProjectDto: CreateProjectDto, @CurrentUser('id') userId: string) {
    return this.projectService.create(createProjectDto, userId);
  }

  @Get('templates')
  @Roles(UserRole.ADMIN, UserRole.MEMBER)
  @ApiOperation({ summary: 'Get active project templates' })
  @ApiResponse({ status: 200, description: 'List of active project templates' })
  async getTemplates() {
    return this.projectService.getTemplates();
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MEMBER)
  @ApiOperation({ summary: 'Get all projects with pagination and filters' })
  @ApiResponse({ status: 200, description: 'List of projects' })
  async findAll(
    @Query() queryDto: QueryProjectDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
  ) {
    return this.projectService.findAll(queryDto, userId, userRole);
  }

  @Get('statistics')
  @Roles(UserRole.ADMIN, UserRole.MEMBER)
  @ApiOperation({ summary: 'Get project statistics' })
  @ApiResponse({ status: 200, description: 'Project statistics' })
  async getStatistics() {
    return this.projectService.getProjectStatistics();
  }

  @Get('health-statistics')
  @Roles(UserRole.ADMIN, UserRole.MEMBER)
  @ApiOperation({ summary: 'Get health score statistics across all projects' })
  @ApiResponse({ status: 200, description: 'Health score statistics' })
  async getHealthStatistics() {
    return this.healthScoreService.getHealthScoreStatistics();
  }

  @Post('recalculate-all-health')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Recalculate health scores for all active projects' })
  @ApiResponse({ status: 200, description: 'Health scores recalculated for all projects' })
  async recalculateAllHealthScores() {
    return this.healthScoreService.updateAllProjectHealthScores();
  }

  @Get('overdue')
  @Roles(UserRole.ADMIN, UserRole.MEMBER)
  @ApiOperation({ summary: 'Get overdue projects' })
  @ApiResponse({ status: 200, description: 'List of overdue projects' })
  async getOverdueProjects() {
    return this.projectService.getOverdueProjects();
  }

  @Get('upcoming-deadlines')
  @Roles(UserRole.ADMIN, UserRole.MEMBER)
  @ApiOperation({ summary: 'Get projects with upcoming deadlines' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of projects with upcoming deadlines' })
  async getUpcomingDeadlines(@Query('days') days?: number) {
    return this.projectService.getUpcomingDeadlines(days || 7);
  }

  @Get('by-partner/:partnerId')
  @Roles(UserRole.ADMIN, UserRole.MEMBER)
  @ApiOperation({ summary: 'Get projects by partner ID' })
  @ApiParam({ name: 'partnerId', description: 'Partner ID' })
  @ApiResponse({ status: 200, description: 'List of projects for the partner' })
  async getProjectsByPartner(@Param('partnerId', ParseUUIDPipe) partnerId: string) {
    return this.projectService.getProjectsByPartner(partnerId);
  }

  @Get('deleted')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get soft-deleted projects' })
  @ApiResponse({ status: 200, description: 'List of soft-deleted projects' })
  async findDeleted() {
    return this.projectService.findDeleted();
  }

  @Patch(':id/restore')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Restore a soft-deleted project' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'Project restored successfully' })
  @ApiResponse({ status: 404, description: 'Deleted project not found' })
  async restore(@Param('id', ParseUUIDPipe) id: string) {
    return this.projectService.restore(id);
  }

  @Get(':id/timeline')
  @UseGuards(ProjectAccessGuard)
  @ApiOperation({ summary: 'Get project timeline/history' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'Project timeline' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async getTimeline(@Param('id', ParseUUIDPipe) id: string) {
    return this.projectService.getProjectTimeline(id);
  }

  @Get(':id')
  @UseGuards(ProjectAccessGuard)
  @ApiOperation({ summary: 'Get project by ID' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'Project details' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) {
    return this.projectService.findOne(id, userId);
  }

  @Patch(':id')
  @UseGuards(ProjectAccessGuard)
  @Roles(UserRole.ADMIN, UserRole.MEMBER)
  @ApiOperation({ summary: 'Update project' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'Project updated successfully' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() updateProjectDto: UpdateProjectDto) {
    return this.projectService.update(id, updateProjectDto);
  }

  @Patch(':id/status')
  @UseGuards(ProjectAccessGuard)
  @Roles(UserRole.ADMIN, UserRole.MEMBER)
  @ApiOperation({ summary: 'Update project status' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'Project status updated' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({ status: 400, description: 'Invalid status value' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateStatusDto: UpdateProjectStatusDto,
  ) {
    return this.projectService.updateStatus(id, updateStatusDto.status);
  }

  @Patch(':id/progress')
  @UseGuards(ProjectAccessGuard)
  @Roles(UserRole.ADMIN, UserRole.MEMBER)
  @ApiOperation({ summary: 'Update project progress' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'Project progress updated' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({ status: 400, description: 'Invalid progress value (must be 0-100)' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async updateProgress(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProgressDto: UpdateProjectProgressDto,
  ) {
    return this.projectService.updateProgress(id, updateProgressDto.progress);
  }

  @Post(':id/partners/:partnerId')
  @UseGuards(ProjectAccessGuard)
  @Roles(UserRole.ADMIN, UserRole.MEMBER)
  @ApiOperation({ summary: 'Add partner to project' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiParam({ name: 'partnerId', description: 'Partner ID' })
  @ApiResponse({ status: 200, description: 'Partner added to project' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async addPartner(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('partnerId', ParseUUIDPipe) partnerId: string,
  ) {
    return this.projectService.addPartner(id, partnerId);
  }

  @Delete(':id/partners/:partnerId')
  @UseGuards(ProjectAccessGuard)
  @Roles(UserRole.ADMIN, UserRole.MEMBER)
  @ApiOperation({ summary: 'Remove partner from project' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiParam({ name: 'partnerId', description: 'Partner ID' })
  @ApiResponse({ status: 200, description: 'Partner removed from project' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async removePartner(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('partnerId', ParseUUIDPipe) partnerId: string,
  ) {
    return this.projectService.removePartner(id, partnerId);
  }

  @Post(':id/members')
  @UseGuards(ProjectAccessGuard)
  @Roles(UserRole.ADMIN, UserRole.MEMBER)
  @ApiOperation({ summary: 'Add member to project' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'Member added to project' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async addMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.projectService.addMember(id, userId);
  }

  @Delete(':id/members/:memberId')
  @UseGuards(ProjectAccessGuard)
  @Roles(UserRole.ADMIN, UserRole.MEMBER)
  @ApiOperation({ summary: 'Remove member from project' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiParam({ name: 'memberId', description: 'Member ID' })
  @ApiResponse({ status: 200, description: 'Member removed from project' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ) {
    return this.projectService.removeMember(id, memberId);
  }

  @Delete(':id')
  @UseGuards(ProjectAccessGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete project' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({ status: 204, description: 'Project deleted successfully' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.projectService.remove(id);
  }

  // Health Score endpoints
  @Post(':id/recalculate-health')
  @UseGuards(ProjectAccessGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Recalculate health score for a project' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'Health score recalculated successfully' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async recalculateHealthScore(@Param('id', ParseUUIDPipe) id: string) {
    return this.healthScoreService.updateProjectHealthScore(id);
  }

  @Get(':id/health-breakdown')
  @UseGuards(ProjectAccessGuard)
  @ApiOperation({ summary: 'Get detailed health score breakdown for a project' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'Health score breakdown' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async getHealthBreakdown(@Param('id', ParseUUIDPipe) id: string) {
    return this.healthScoreService.calculateHealthScore(id);
  }

  // Task endpoints under project
  @Get(':projectId/tasks')
  @UseGuards(ProjectAccessGuard)
  @ApiOperation({ summary: 'Get tasks for a project' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'List of tasks' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async getProjectTasks(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() queryDto: QueryTaskDto,
  ) {
    return this.taskService.findAll({ ...queryDto, projectId });
  }

  @Post(':projectId/tasks')
  @UseGuards(ProjectAccessGuard)
  @ApiOperation({ summary: 'Create a task for a project' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 201, description: 'Task created successfully' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async createProjectTask(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() createTaskDto: CreateTaskDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.taskService.create({ ...createTaskDto, projectId }, userId);
  }
}
