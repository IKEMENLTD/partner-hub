import { Controller, Get, Post, Patch, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { NotificationSettingsService } from './services/notification-settings.service';
import { EmailService } from './services/email.service';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Notification Settings')
@Controller('users/me/notification-settings')
@ApiBearerAuth()
export class NotificationSettingsController {
  constructor(
    private readonly notificationSettingsService: NotificationSettingsService,
    private readonly emailService: EmailService,
  ) {}

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

  @Post('test-email')
  @Public()
  @ApiOperation({ summary: 'テストメールを送信（デバッグ用）' })
  @ApiQuery({ name: 'to', required: true, description: '送信先メールアドレス' })
  @ApiResponse({
    status: 200,
    description: 'テストメール送信結果',
  })
  async sendTestEmail(@Query('to') to: string) {
    try {
      const result = await this.emailService.sendEmail({
        to,
        subject: '【テスト】Partner Hub メール送信確認',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #667eea;">メール送信テスト成功</h1>
            <p>Partner Hub からのテストメールです。</p>
            <p>送信日時: ${new Date().toLocaleString('ja-JP')}</p>
          </div>
        `,
        text: 'Partner Hub からのテストメールです。',
      });
      return ApiResponseDto.success({ sent: result }, 'テストメールを送信しました');
    } catch (error) {
      return ApiResponseDto.error(`メール送信失敗: ${error.message}`, 'EMAIL_SEND_FAILED');
    }
  }

  @Get('email-config')
  @Public()
  @ApiOperation({ summary: 'メール設定状態を確認（デバッグ用）' })
  async getEmailConfig() {
    const isConnected = await this.emailService.verifyConnection();
    return ApiResponseDto.success(
      {
        connectionVerified: isConnected,
        timestamp: new Date().toISOString(),
      },
      'メール設定状態',
    );
  }
}
