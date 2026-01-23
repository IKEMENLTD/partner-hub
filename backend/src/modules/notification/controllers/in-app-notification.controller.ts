import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { InAppNotificationService } from '../services/in-app-notification.service';

@Controller('notifications')
export class InAppNotificationController {
  constructor(
    private readonly notificationService: InAppNotificationService,
  ) {}

  @Get()
  async getNotifications(
    @Req() req: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      return { notifications: [], total: 0, unreadCount: 0 };
    }

    return this.notificationService.getByUserId(userId, {
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0,
      unreadOnly: unreadOnly === 'true',
    });
  }

  @Get('unread-count')
  async getUnreadCount(@Req() req: any) {
    const userId = req.user?.id;
    if (!userId) {
      return { count: 0 };
    }

    const count = await this.notificationService.getUnreadCount(userId);
    return { count };
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  async markAsRead(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id;
    if (!userId) {
      return { success: false };
    }

    const success = await this.notificationService.markAsRead(id, userId);
    return { success };
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  async markAllAsRead(@Req() req: any) {
    const userId = req.user?.id;
    if (!userId) {
      return { success: false, count: 0 };
    }

    const count = await this.notificationService.markAllAsRead(userId);
    return { success: true, count };
  }

  @Delete(':id')
  async deleteNotification(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id;
    if (!userId) {
      return { success: false };
    }

    const success = await this.notificationService.delete(id, userId);
    return { success };
  }

  @Delete('read')
  async deleteAllRead(@Req() req: any) {
    const userId = req.user?.id;
    if (!userId) {
      return { success: false, count: 0 };
    }

    const count = await this.notificationService.deleteAllRead(userId);
    return { success: true, count };
  }
}
