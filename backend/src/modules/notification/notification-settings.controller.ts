import { Controller, Get, Patch, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationSettingsService } from './services/notification-settings.service';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiResponseDto } from '../../common/dto/api-response.dto';

@ApiTags('Notification Settings')
@Controller('users/me/notification-settings')
@ApiBearerAuth()
export class NotificationSettingsController {
  constructor(private readonly notificationSettingsService: NotificationSettingsService) {}

  @Get()
  @ApiOperation({ summary: '現在のユーザーの通知設定を取得' })
  @ApiResponse({
    status: 200,
    description: '通知設定を返す',
  })
  async getSettings(@CurrentUser('id') userId: string) {
    const settings = await this.notificationSettingsService.getSettingsByUserId(userId);
    return ApiResponseDto.success(
      this.notificationSettingsService.mapToResponse(settings),
      '通知設定を取得しました',
    );
  }

  @Patch()
  @ApiOperation({ summary: '現在のユーザーの通知設定を更新' })
  @ApiResponse({
    status: 200,
    description: '通知設定が正常に更新された',
  })
  @ApiResponse({
    status: 400,
    description: 'バリデーションエラー',
  })
  async updateSettings(
    @CurrentUser('id') userId: string,
    @Body() updateDto: UpdateNotificationSettingsDto,
  ) {
    const settings = await this.notificationSettingsService.updateSettings(userId, updateDto);
    return ApiResponseDto.success(
      this.notificationSettingsService.mapToResponse(settings),
      '通知設定を更新しました',
    );
  }
}
