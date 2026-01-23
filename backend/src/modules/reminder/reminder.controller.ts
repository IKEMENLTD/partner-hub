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
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create a new reminder' })
  @ApiResponse({ status: 201, description: 'Reminder created successfully' })
  async create(@Body() createReminderDto: CreateReminderDto, @CurrentUser('id') userId: string) {
    return this.reminderService.create(createReminderDto, userId);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get all reminders with pagination and filters' })
  @ApiResponse({ status: 200, description: 'List of reminders' })
  async findAll(@Query() queryDto: QueryReminderDto) {
    return this.reminderService.findAll(queryDto);
  }

  @Get('statistics')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get reminder statistics' })
  @ApiResponse({ status: 200, description: 'Reminder statistics' })
  async getStatistics() {
    return this.reminderService.getReminderStatistics();
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
    return { message: 'All reminders marked as read' };
  }

  @Get('user/:userId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get reminders for a specific user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'List of user reminders' })
  async getUserReminders(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('unreadOnly') unreadOnly?: boolean,
  ) {
    return this.reminderService.getUserReminders(userId, unreadOnly === true);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get reminder by ID' })
  @ApiParam({ name: 'id', description: 'Reminder ID' })
  @ApiResponse({ status: 200, description: 'Reminder details' })
  @ApiResponse({ status: 404, description: 'Reminder not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.reminderService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update reminder' })
  @ApiParam({ name: 'id', description: 'Reminder ID' })
  @ApiResponse({ status: 200, description: 'Reminder updated successfully' })
  @ApiResponse({ status: 404, description: 'Reminder not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateReminderDto: UpdateReminderDto,
  ) {
    return this.reminderService.update(id, updateReminderDto);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark reminder as read' })
  @ApiParam({ name: 'id', description: 'Reminder ID' })
  @ApiResponse({ status: 200, description: 'Reminder marked as read' })
  @ApiResponse({ status: 404, description: 'Reminder not found' })
  async markAsRead(@Param('id', ParseUUIDPipe) id: string) {
    return this.reminderService.markAsRead(id);
  }

  @Patch(':id/cancel')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Cancel reminder' })
  @ApiParam({ name: 'id', description: 'Reminder ID' })
  @ApiResponse({ status: 200, description: 'Reminder cancelled' })
  @ApiResponse({ status: 404, description: 'Reminder not found' })
  async cancel(@Param('id', ParseUUIDPipe) id: string) {
    return this.reminderService.cancel(id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete reminder' })
  @ApiParam({ name: 'id', description: 'Reminder ID' })
  @ApiResponse({ status: 204, description: 'Reminder deleted successfully' })
  @ApiResponse({ status: 404, description: 'Reminder not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.reminderService.remove(id);
  }
}
