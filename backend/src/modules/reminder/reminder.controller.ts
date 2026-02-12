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
import { ReminderService } from './reminder.service';
import { CreateReminderDto, UpdateReminderDto, QueryReminderDto } from './dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../auth/enums/user-role.enum';

@ApiTags('Reminders')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('reminders')
export class ReminderController {
  constructor(private readonly reminderService: ReminderService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new reminder' })
  @ApiResponse({ status: 201, description: 'Reminder created successfully' })
  async create(@Body() createReminderDto: CreateReminderDto, @CurrentUser('id') userId: string) {
    return this.reminderService.create(createReminderDto, userId);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all reminders with pagination and filters' })
  @ApiResponse({ status: 200, description: 'List of reminders' })
  async findAll(
    @Query() queryDto: QueryReminderDto,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.reminderService.findAll(queryDto, organizationId);
  }

  @Get('statistics')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get reminder statistics' })
  @ApiResponse({ status: 200, description: 'Reminder statistics' })
  async getStatistics(@CurrentUser('organizationId') organizationId: string) {
    return this.reminderService.getReminderStatistics(organizationId);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get current user reminders' })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'List of user reminders' })
  async getMyReminders(
    @CurrentUser('id') userId: string,
    @Query('unreadOnly') unreadOnly?: boolean,
  ) {
    return this.reminderService.getUserReminders(userId, unreadOnly === true);
  }

  @Get('my/unread-count')
  @ApiOperation({ summary: 'Get unread reminder count for current user' })
  @ApiResponse({ status: 200, description: 'Unread count' })
  async getUnreadCount(@CurrentUser('id') userId: string) {
    const count = await this.reminderService.getUnreadCount(userId);
    return { count };
  }

  @Post('my/mark-all-read')
  @ApiOperation({ summary: 'Mark all reminders as read for current user' })
  @ApiResponse({ status: 200, description: 'All reminders marked as read' })
  async markAllAsRead(@CurrentUser('id') userId: string) {
    await this.reminderService.markAllAsRead(userId);
    return { message: 'すべてのリマインダーを既読にしました' };
  }

  @Get('user/:userId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get reminders for a specific user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'List of user reminders' })
  async getUserReminders(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('unreadOnly') unreadOnly?: boolean,
    @CurrentUser('organizationId') organizationId?: string,
  ) {
    return this.reminderService.getUserReminders(userId, unreadOnly === true, organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get reminder by ID' })
  @ApiParam({ name: 'id', description: 'Reminder ID' })
  @ApiResponse({ status: 200, description: 'Reminder details' })
  @ApiResponse({ status: 404, description: 'Reminder not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.reminderService.findOne(id, organizationId);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update reminder' })
  @ApiParam({ name: 'id', description: 'Reminder ID' })
  @ApiResponse({ status: 200, description: 'Reminder updated successfully' })
  @ApiResponse({ status: 404, description: 'Reminder not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateReminderDto: UpdateReminderDto,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    // Validate org access before updating
    await this.reminderService.findOne(id, organizationId);
    return this.reminderService.update(id, updateReminderDto);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark reminder as read' })
  @ApiParam({ name: 'id', description: 'Reminder ID' })
  @ApiResponse({ status: 200, description: 'Reminder marked as read' })
  @ApiResponse({ status: 404, description: 'Reminder not found' })
  async markAsRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    // Validate org access before marking as read
    await this.reminderService.findOne(id, organizationId);
    return this.reminderService.markAsRead(id);
  }

  @Patch(':id/cancel')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Cancel reminder' })
  @ApiParam({ name: 'id', description: 'Reminder ID' })
  @ApiResponse({ status: 200, description: 'Reminder cancelled' })
  @ApiResponse({ status: 404, description: 'Reminder not found' })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    // Validate org access before cancelling
    await this.reminderService.findOne(id, organizationId);
    return this.reminderService.cancel(id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete reminder' })
  @ApiParam({ name: 'id', description: 'Reminder ID' })
  @ApiResponse({ status: 204, description: 'Reminder deleted successfully' })
  @ApiResponse({ status: 404, description: 'Reminder not found' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    // Validate org access before removing
    await this.reminderService.findOne(id, organizationId);
    await this.reminderService.remove(id);
  }

  @Post('trigger/generate')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'リマインダー自動生成を手動実行（テスト用）' })
  @ApiResponse({ status: 200, description: '生成結果' })
  async triggerGenerate() {
    const results: Record<string, string> = {};
    try {
      await this.reminderService.createTaskDueReminders();
      results.taskDue = 'OK';
    } catch (e) {
      results.taskDue = `ERROR: ${e.message}`;
    }
    try {
      await this.reminderService.createOverdueTaskReminders();
      results.taskOverdue = 'OK';
    } catch (e) {
      results.taskOverdue = `ERROR: ${e.message}`;
    }
    try {
      await this.reminderService.createProjectDeadlineReminders();
      results.projectDeadline = 'OK';
    } catch (e) {
      results.projectDeadline = `ERROR: ${e.message}`;
    }
    try {
      await this.reminderService.createStagnantProjectReminders();
      results.projectStagnant = 'OK';
    } catch (e) {
      results.projectStagnant = `ERROR: ${e.message}`;
    }
    return { message: 'リマインダー自動生成を実行しました', results };
  }

  @Post('trigger/process')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '未送信リマインダーを手動処理（テスト用）' })
  @ApiResponse({ status: 200, description: '処理結果' })
  async triggerProcess() {
    await this.reminderService.processReminders();
    return { message: 'リマインダー処理を実行しました' };
  }
}
