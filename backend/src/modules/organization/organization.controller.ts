import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { OrganizationService } from './organization.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { QueryInvitationDto } from './dto/query-invitation.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { UserRole } from '../auth/enums/user-role.enum';

@ApiTags('Organizations')
@ApiBearerAuth()
@Controller('organizations')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Post(':orgId/invitations')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '組織への招待を作成' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiResponse({ status: 201, description: '招待を作成しました' })
  async createInvitation(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Body() dto: CreateInvitationDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.organizationService.createInvitation(orgId, dto, userId);
  }

  @Get(':orgId/invitations')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '招待一覧を取得' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: '招待一覧' })
  async listInvitations(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Query() query: QueryInvitationDto,
  ) {
    return this.organizationService.listInvitations(orgId, query);
  }

  @Public()
  @Get('invitations/validate/:token')
  @ApiOperation({ summary: '招待トークンを検証' })
  @ApiParam({ name: 'token', description: 'Invitation token' })
  @ApiResponse({ status: 200, description: 'トークン検証結果' })
  async validateInvitation(@Param('token') token: string) {
    const result = await this.organizationService.validateInvitation(token);
    return {
      valid: result.valid,
      organizationName: result.organizationName,
      email: result.email,
    };
  }

  @Post('invitations/:id/cancel')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '招待をキャンセル' })
  @ApiParam({ name: 'id', description: 'Invitation ID' })
  @ApiResponse({ status: 200, description: '招待をキャンセルしました' })
  async cancelInvitation(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('organizationId') orgId: string,
  ) {
    await this.organizationService.cancelInvitation(id, orgId);
    return { message: '招待をキャンセルしました' };
  }

  @Post('invitations/:id/resend')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: '招待を再送信' })
  @ApiParam({ name: 'id', description: 'Invitation ID' })
  @ApiResponse({ status: 200, description: '招待を再送信しました' })
  async resendInvitation(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('organizationId') orgId: string,
  ) {
    await this.organizationService.resendInvitation(id, orgId);
    return { message: '招待を再送信しました' };
  }
}
