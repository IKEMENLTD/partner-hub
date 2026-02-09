import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserRole } from '../../auth/enums/user-role.enum';
import { PartnerReportService } from '../services/partner-report.service';
import { PartnerReportTokenService } from '../services/partner-report-token.service';
import { QueryReportDto } from '../dto';
import { ConfigService } from '@nestjs/config';

@ApiTags('Partner Reports')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('partner-reports')
export class PartnerReportController {
  constructor(
    private readonly reportService: PartnerReportService,
    private readonly tokenService: PartnerReportTokenService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MEMBER)
  @ApiOperation({ summary: '報告一覧を取得' })
  @ApiResponse({ status: 200, description: '報告一覧' })
  async findAll(@Query() queryDto: QueryReportDto, @CurrentUser('id') userId: string) {
    return this.reportService.findAll(queryDto, userId);
  }

  @Get('unread-count')
  @Roles(UserRole.ADMIN, UserRole.MEMBER)
  @ApiOperation({ summary: '未読報告数を取得' })
  @ApiResponse({ status: 200, description: '未読報告数' })
  async getUnreadCount(@CurrentUser('id') userId: string) {
    const count = await this.reportService.getUnreadCount(userId);
    return { unreadCount: count };
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MEMBER)
  @ApiOperation({ summary: '報告詳細を取得' })
  @ApiParam({ name: 'id', description: '報告ID' })
  @ApiResponse({ status: 200, description: '報告詳細' })
  @ApiResponse({ status: 404, description: '報告が見つかりません' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) {
    return this.reportService.findOne(id, userId);
  }

  @Patch(':id/read')
  @Roles(UserRole.ADMIN, UserRole.MEMBER)
  @ApiOperation({ summary: '報告を既読にする' })
  @ApiParam({ name: 'id', description: '報告ID' })
  @ApiResponse({ status: 200, description: '既読にしました' })
  async markAsRead(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) {
    const report = await this.reportService.markAsRead(id, userId);
    return { message: '既読にしました', report };
  }

  @Post('mark-read')
  @Roles(UserRole.ADMIN, UserRole.MEMBER)
  @ApiOperation({ summary: '複数の報告を既読にする' })
  @ApiResponse({ status: 200, description: '既読にしました' })
  async markMultipleAsRead(@Body() body: { ids: string[] }, @CurrentUser('id') userId: string) {
    await this.reportService.markMultipleAsRead(body.ids, userId);
    return { message: `${body.ids.length}件を既読にしました` };
  }
}

@ApiTags('Partner Report Tokens')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('partners/:partnerId/report-token')
export class PartnerReportTokenController {
  constructor(
    private readonly tokenService: PartnerReportTokenService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'パートナーの報告用トークンを取得' })
  @ApiParam({ name: 'partnerId', description: 'パートナーID' })
  @ApiResponse({ status: 200, description: '報告用トークン情報' })
  async getToken(@Param('partnerId', ParseUUIDPipe) partnerId: string) {
    const token = await this.tokenService.getTokenByPartnerId(partnerId);

    if (!token) {
      return { token: null, reportUrl: null };
    }

    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
    const reportUrl = this.tokenService.getReportUrl(token.token, frontendUrl);

    return {
      token: {
        id: token.id,
        token: token.token,
        expiresAt: token.expiresAt,
        isActive: token.isActive,
        lastUsedAt: token.lastUsedAt,
        createdAt: token.createdAt,
      },
      reportUrl,
    };
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '報告用トークンを生成' })
  @ApiParam({ name: 'partnerId', description: 'パートナーID' })
  @ApiResponse({ status: 201, description: 'トークンを生成しました' })
  async generateToken(
    @Param('partnerId', ParseUUIDPipe) partnerId: string,
    @Body() body: { projectId?: string; expiresInDays?: number },
  ) {
    const token = await this.tokenService.generateToken(
      partnerId,
      body.projectId,
      body.expiresInDays,
    );

    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
    const reportUrl = this.tokenService.getReportUrl(token.token, frontendUrl);

    return {
      message: '報告用トークンを生成しました',
      token: {
        id: token.id,
        token: token.token,
        expiresAt: token.expiresAt,
      },
      reportUrl,
    };
  }

  @Post('regenerate')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '報告用トークンを再生成' })
  @ApiParam({ name: 'partnerId', description: 'パートナーID' })
  @ApiResponse({ status: 201, description: 'トークンを再生成しました' })
  async regenerateToken(
    @Param('partnerId', ParseUUIDPipe) partnerId: string,
    @Body() body: { projectId?: string; expiresInDays?: number },
  ) {
    const token = await this.tokenService.regenerateToken(
      partnerId,
      body.projectId,
      body.expiresInDays,
    );

    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
    const reportUrl = this.tokenService.getReportUrl(token.token, frontendUrl);

    return {
      message: '報告用トークンを再生成しました',
      token: {
        id: token.id,
        token: token.token,
        expiresAt: token.expiresAt,
      },
      reportUrl,
    };
  }

  @Post('deactivate')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '報告用トークンを無効化' })
  @ApiParam({ name: 'partnerId', description: 'パートナーID' })
  @ApiResponse({ status: 200, description: 'トークンを無効化しました' })
  async deactivateToken(@Param('partnerId', ParseUUIDPipe) partnerId: string) {
    await this.tokenService.deactivateToken(partnerId);
    return { message: '報告用トークンを無効化しました' };
  }
}
