import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator';
import { ReportTokenGuard } from '../guards/report-token.guard';
import { PartnerReportService } from '../services/partner-report.service';
import { CreateReportDto } from '../dto';
import { ReportSource } from '../entities/partner-report.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../../project/entities/project.entity';

@ApiTags('Partner Reports (Public)')
@Controller('report')
export class PartnerReportPublicController {
  constructor(
    private readonly reportService: PartnerReportService,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
  ) {}

  @Get(':token')
  @Public()
  @UseGuards(ReportTokenGuard)
  @ApiOperation({ summary: '報告フォーム情報を取得（トークン認証）' })
  @ApiParam({ name: 'token', description: '報告用トークン' })
  @ApiResponse({ status: 200, description: '報告フォーム情報' })
  @ApiResponse({ status: 401, description: 'トークンが無効または期限切れ' })
  @ApiResponse({ status: 404, description: 'トークンが見つかりません' })
  async getReportFormInfo(@Req() req: any) {
    const { partner, reportToken } = req;

    // パートナーが担当している案件を取得
    const projects = await this.projectRepository
      .createQueryBuilder('project')
      .innerJoin('project.partners', 'partners')
      .where('partners.id = :partnerId', { partnerId: partner.id })
      .andWhere('project.status != :status', { status: 'completed' })
      .select(['project.id', 'project.name', 'project.status'])
      .getMany();

    return {
      partner: {
        id: partner.id,
        name: partner.name,
        email: partner.email,
        companyName: partner.companyName,
      },
      projects,
      reportTypes: [
        { value: 'progress', label: '進捗報告' },
        { value: 'issue', label: '課題・問題報告' },
        { value: 'completion', label: '完了報告' },
        { value: 'general', label: 'その他' },
      ],
      tokenInfo: {
        expiresAt: reportToken.expiresAt,
        projectRestriction: reportToken.projectId ? true : false,
      },
    };
  }

  @Post(':token')
  @Public()
  @UseGuards(ReportTokenGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '報告を送信（トークン認証）' })
  @ApiParam({ name: 'token', description: '報告用トークン' })
  @ApiResponse({ status: 201, description: '報告が送信されました' })
  @ApiResponse({ status: 400, description: '入力データが不正です' })
  @ApiResponse({ status: 401, description: 'トークンが無効または期限切れ' })
  async submitReport(@Req() req: any, @Body() dto: CreateReportDto) {
    const { partner, reportToken, organizationId } = req;

    // プロジェクト制限がある場合、そのプロジェクトのみ許可
    if (reportToken.projectId && dto.projectId !== reportToken.projectId) {
      dto.projectId = reportToken.projectId;
    }

    const report = await this.reportService.createFromPartner(
      partner.id,
      organizationId,
      dto,
      ReportSource.WEB_FORM,
    );

    return {
      message: '報告を送信しました',
      report: {
        id: report.id,
        reportType: report.reportType,
        createdAt: report.createdAt,
      },
    };
  }

  @Get(':token/projects')
  @Public()
  @UseGuards(ReportTokenGuard)
  @ApiOperation({ summary: '担当案件一覧を取得（トークン認証）' })
  @ApiParam({ name: 'token', description: '報告用トークン' })
  @ApiResponse({ status: 200, description: '担当案件一覧' })
  async getPartnerProjects(@Req() req: any) {
    const { partner, reportToken } = req;

    // プロジェクト制限がある場合
    if (reportToken.projectId) {
      const project = await this.projectRepository.findOne({
        where: { id: reportToken.projectId },
        select: ['id', 'name', 'status', 'description'],
      });
      return { projects: project ? [project] : [] };
    }

    // パートナーが担当している案件を取得
    const projects = await this.projectRepository
      .createQueryBuilder('project')
      .innerJoin('project.partners', 'partners')
      .where('partners.id = :partnerId', { partnerId: partner.id })
      .select(['project.id', 'project.name', 'project.status', 'project.description'])
      .orderBy('project.createdAt', 'DESC')
      .getMany();

    return { projects };
  }

  @Get(':token/history')
  @Public()
  @UseGuards(ReportTokenGuard)
  @ApiOperation({ summary: '自分の報告履歴を取得（トークン認証）' })
  @ApiParam({ name: 'token', description: '報告用トークン' })
  @ApiResponse({ status: 200, description: '報告履歴' })
  async getReportHistory(@Req() req: any) {
    const { partner } = req;

    const reports = await this.reportService.getPartnerReportHistory(partner.id, 20);

    return {
      reports: reports.map((r) => ({
        id: r.id,
        reportType: r.reportType,
        content: r.content.substring(0, 100) + (r.content.length > 100 ? '...' : ''),
        projectName: r.project?.name || null,
        createdAt: r.createdAt,
      })),
    };
  }
}
