import { Controller, Get, Post, Delete, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { InAppNotificationService } from '../services/in-app-notification.service';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('Notifications')
@Controller('notifications')
@ApiBearerAuth()
export class InAppNotificationController {
  constructor(private readonly notificationService: InAppNotificationService) {}

  @Get()
  @ApiOperation({ summary: 'Get notifications', description: 'Retrieve paginated list of notifications for the current user' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of items to return', example: 20 })
  @ApiQuery({ name: 'offset', required: false, description: 'Number of items to skip', example: 0 })
  @ApiQuery({ name: 'unreadOnly', required: false, description: 'Filter to unread notifications only', example: 'false' })
  @ApiResponse({ status: 200, description: 'Notifications retrieved successfully' })
  async getNotifications(
    @CurrentUser('id') userId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.notificationService.getByUserId(userId, {
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0,
      unreadOnly: unreadOnly === 'true',
    });
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count', description: 'Get the count of unread notifications for the current user' })
  @ApiResponse({ status: 200, description: 'Unread count retrieved successfully' })
  async getUnreadCount(@CurrentUser('id') userId: string) {
    const count = await this.notificationService.getUnreadCount(userId);
    return { count };
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark notification as read', description: 'Mark a specific notification as read' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async markAsRead(@Param('id') id: string, @CurrentUser('id') userId: string) {
    const success = await this.notificationService.markAsRead(id, userId);
    return { success };
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read', description: 'Mark all notifications as read for the current user' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllAsRead(@CurrentUser('id') userId: string) {
    const count = await this.notificationService.markAllAsRead(userId);
    return { success: true, count };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a notification', description: 'Delete a specific notification' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({ status: 200, description: 'Notification deleted successfully' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async deleteNotification(@Param('id') id: string, @CurrentUser('id') userId: string) {
    const success = await this.notificationService.delete(id, userId);
    return { success };
  }

  @Delete('read')
  @ApiOperation({ summary: 'Delete all read notifications', description: 'Delete all read notifications for the current user' })
  @ApiResponse({ status: 200, description: 'Read notifications deleted successfully' })
  async deleteAllRead(@CurrentUser('id') userId: string) {
    const count = await this.notificationService.deleteAllRead(userId);
    return { success: true, count };
  }
}
