import { Controller, Get, Put, Post, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { SystemSettingsService } from './system-settings.service';
import { UpdateSystemSettingsDto } from './dto/update-system-settings.dto';
import { SystemSettings } from './entities/system-settings.entity';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../auth/enums/user-role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserProfile } from '../auth/entities/user-profile.entity';

@ApiTags('system-settings')
@ApiBearerAuth()
@Controller('system-settings')
@UseGuards(RolesGuard)
export class SystemSettingsController {
  constructor(private readonly systemSettingsService: SystemSettingsService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'システム設定を取得' })
  @ApiResponse({ status: 200, description: 'システム設定', type: SystemSettings })
  async getSettings(@CurrentUser() user: UserProfile): Promise<SystemSettings> {
    if (!user.organizationId) {
      throw new BadRequestException('組織に所属していません');
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
      throw new BadRequestException('組織に所属していません');
    }
    return this.systemSettingsService.updateSettings(user.organizationId, dto);
  }

  @Post('test-slack')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Slack Webhook URLをテスト' })
  @ApiResponse({ status: 200, description: 'テスト結果' })
  async testSlackWebhook(
    @CurrentUser() user: UserProfile,
    @Body('webhookUrl') webhookUrl: string,
  ): Promise<{ success: boolean; message: string }> {
    if (!webhookUrl) {
      throw new BadRequestException('Webhook URLを指定してください');
    }

    const success = await this.systemSettingsService.testSlackWebhook(webhookUrl);

    return {
      success,
      message: success
        ? 'テスト送信が成功しました'
        : 'テスト送信に失敗しました。URLを確認してください',
    };
  }
}
