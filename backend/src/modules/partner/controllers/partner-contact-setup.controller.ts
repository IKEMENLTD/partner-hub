import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PartnerContactSetupService } from '../services/partner-contact-setup.service';
import {
  PartnerContactSetupDto,
  PartnerContactSetupResponseDto,
  PartnerContactSetupTokenInfoDto,
} from '../dto/partner-contact-setup.dto';
import { Public } from '../../../common/decorators/public.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { UserRole } from '../../auth/enums/user-role.enum';

@ApiTags('partner-contact-setup')
@Controller('partner-contact-setup')
export class PartnerContactSetupController {
  constructor(private readonly partnerContactSetupService: PartnerContactSetupService) {}

  /**
   * トークンを検証してパートナー情報を取得（公開エンドポイント）
   */
  @Get('verify/:token')
  @Public()
  @ApiOperation({ summary: 'セットアップトークンを検証' })
  @ApiResponse({
    status: 200,
    description: 'トークン検証結果',
    type: PartnerContactSetupTokenInfoDto,
  })
  async verifyToken(@Param('token') token: string): Promise<PartnerContactSetupTokenInfoDto> {
    return this.partnerContactSetupService.verifySetupToken(token);
  }

  /**
   * 連絡先設定を完了（公開エンドポイント）
   */
  @Post('complete/:token')
  @Public()
  @ApiOperation({ summary: '連絡先設定を完了' })
  @ApiResponse({ status: 200, description: '設定完了', type: PartnerContactSetupResponseDto })
  async completeSetup(
    @Param('token') token: string,
    @Body() dto: PartnerContactSetupDto,
  ): Promise<PartnerContactSetupResponseDto> {
    return this.partnerContactSetupService.completeContactSetup(token, dto);
  }

  /**
   * セットアップメールを送信（管理者/マネージャーのみ）
   */
  @Post('send/:partnerId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'パートナーにセットアップメールを送信' })
  @ApiResponse({ status: 200, description: 'メール送信完了' })
  async sendSetupEmail(@Param('partnerId') partnerId: string): Promise<{ message: string }> {
    await this.partnerContactSetupService.sendContactSetupEmail(partnerId);
    return { message: 'セットアップメールを送信しました' };
  }

  /**
   * セットアップメールを再送信（管理者/マネージャーのみ）
   */
  @Post('resend/:partnerId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'セットアップメールを再送信' })
  @ApiResponse({ status: 200, description: 'メール再送信完了' })
  async resendSetupEmail(@Param('partnerId') partnerId: string): Promise<{ message: string }> {
    await this.partnerContactSetupService.resendSetupEmail(partnerId);
    return { message: 'セットアップメールを再送信しました' };
  }

  /**
   * パートナーの連絡先設定状況を取得（管理者/マネージャーのみ）
   */
  @Get('status/:partnerId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'パートナーの連絡先設定状況を取得' })
  async getSetupStatus(@Param('partnerId') partnerId: string) {
    return this.partnerContactSetupService.getContactSetupStatus(partnerId);
  }
}
