import { Controller, Get, Put, Post, Body, UseGuards } from '@nestjs/common';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { SystemSettingsService } from './system-settings.service';
import { UpdateSystemSettingsDto } from './dto/update-system-settings.dto';
import { SystemSettings } from './entities/system-settings.entity';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../auth/enums/user-role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserProfile } from '../auth/entities/user-profile.entity';
import { SmsService } from '../notification/services/sms.service';

@ApiTags('system-settings')
@ApiBearerAuth()
@Controller('system-settings')
@UseGuards(RolesGuard)
export class SystemSettingsController {
  constructor(
    private readonly systemSettingsService: SystemSettingsService,
    private readonly smsService: SmsService,
  ) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'システム設定を取得' })
  @ApiResponse({ status: 200, description: 'システム設定', type: SystemSettings })
  async getSettings(@CurrentUser() user: UserProfile): Promise<SystemSettings> {
    if (!user.organizationId) {
      throw new BusinessException('AUTH_006', {
        message: 'ユーザーは組織に所属していません',
        userMessage: '組織に所属していません',
      });
    }
    return this.systemSettingsService.getSettings(user.organizationId);
  }

  @Put()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'システム設定を更新' })
  @ApiResponse({ status: 200, description: '更新されたシステム設定', type: SystemSettings })
  async updateSettings(
    @CurrentUser() user: UserProfile,
    @Body() dto: UpdateSystemSettingsDto,
  ): Promise<SystemSettings> {
    if (!user.organizationId) {
      throw new BusinessException('AUTH_006', {
        message: 'ユーザーは組織に所属していません',
        userMessage: '組織に所属していません',
      });
    }
    return this.systemSettingsService.updateSettings(user.organizationId, dto);
  }

  @Post('test-sms')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'SMS送信テスト' })
  @ApiResponse({ status: 200, description: 'テスト結果' })
  async testSms(
    @CurrentUser() user: UserProfile,
    @Body('phoneNumber') phoneNumber: string,
  ): Promise<{ success: boolean; message: string }> {
    if (!user.organizationId) {
      throw new BusinessException('AUTH_006', {
        message: 'ユーザーは組織に所属していません',
        userMessage: '組織に所属していません',
      });
    }

    if (!phoneNumber) {
      throw new BusinessException('VALIDATION_001', {
        message: '送信先電話番号は必須です',
        userMessage: '送信先電話番号を入力してください',
      });
    }

    if (!this.smsService.isValidPhoneNumber(phoneNumber)) {
      throw new BusinessException('VALIDATION_001', {
        message: '無効な電話番号形式です',
        userMessage: '有効な電話番号を入力してください（例: 09012345678）',
      });
    }

    const twilioSettings = await this.systemSettingsService.getTwilioSettings(
      user.organizationId,
    );

    if (!twilioSettings.accountSid || !twilioSettings.authToken || !twilioSettings.phoneNumber) {
      return {
        success: false,
        message: 'Twilio設定が保存されていません。先に設定を保存してください。',
      };
    }

    const result = await this.smsService.sendSms(
      {
        accountSid: twilioSettings.accountSid,
        authToken: twilioSettings.authToken,
        phoneNumber: twilioSettings.phoneNumber,
      },
      {
        to: phoneNumber,
        message: 'Partner Hub: SMS送信テストです。この通知が届いていれば設定は正常です。',
      },
    );

    return {
      success: result.success,
      message: result.success
        ? 'テストSMSを送信しました'
        : `送信に失敗しました: ${result.error}`,
    };
  }
}
