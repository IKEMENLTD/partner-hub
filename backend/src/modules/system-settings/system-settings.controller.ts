import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
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
}
