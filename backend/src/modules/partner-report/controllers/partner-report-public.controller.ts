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
import { Repository, In } from 'typeorm';
import { Project } from '../../project/entities/project.entity';
import { Task } from '../../task/entities/task.entity';
import { TaskStatus } from '../../task/enums/task-status.enum';

@ApiTags('Partner Reports (Public)')
@Controller('report')
export class PartnerReportPublicController {
  constructor(
    private readonly reportService: PartnerReportService,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
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
      reports: reports.map((r) => {
        const content = r.content || '';
        const weeklyAccomplishments = r.weeklyAccomplishments || '';
        const displayContent = weeklyAccomplishments || content;

        return {
          id: r.id,
          reportType: r.reportType,
          progressStatus: r.progressStatus || null,
          content: displayContent
            ? displayContent.substring(0, 100) + (displayContent.length > 100 ? '...' : '')
            : null,
          weeklyAccomplishments: weeklyAccomplishments
            ? weeklyAccomplishments.substring(0, 100) + (weeklyAccomplishments.length > 100 ? '...' : '')
            : null,
          projectName: r.project?.name || null,
          createdAt: r.createdAt,
        };
      }),
    };
  }

  @Get(':token/tasks')
  @Public()
  @UseGuards(ReportTokenGuard)
  @ApiOperation({ summary: '担当タスク一覧を取得（トークン認証）' })
  @ApiParam({ name: 'token', description: '報告用トークン' })
  @ApiResponse({ status: 200, description: '担当タスク一覧' })
  async getPartnerTasks(@Req() req: any) {
    const { partner, reportToken } = req;

    const queryBuilder = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.project', 'project')
      .where('task.partnerId = :partnerId', { partnerId: partner.id });

    // プロジェクト制限がある場合
    if (reportToken.projectId) {
      queryBuilder.andWhere('task.projectId = :projectId', {
        projectId: reportToken.projectId,
      });
    }

    const tasks = await queryBuilder
      .orderBy('task.dueDate', 'ASC', 'NULLS LAST')
      .addOrderBy('task.priority', 'DESC')
      .getMany();

    return {
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description
          ? t.description.substring(0, 150) + (t.description.length > 150 ? '...' : '')
          : null,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate,
        projectId: t.projectId,
        projectName: t.project?.name || null,
      })),
    };
  }

  @Get(':token/dashboard')
  @Public()
  @UseGuards(ReportTokenGuard)
  @ApiOperation({ summary: 'ダッシュボードデータを取得（トークン認証）' })
  @ApiParam({ name: 'token', description: '報告用トークン' })
  @ApiResponse({ status: 200, description: 'ダッシュボードデータ' })
  async getDashboard(@Req() req: any) {
    const { partner, reportToken } = req;

    // パートナーが担当している案件を取得
    let projectsQuery = this.projectRepository
      .createQueryBuilder('project')
      .innerJoin('project.partners', 'partners')
      .where('partners.id = :partnerId', { partnerId: partner.id });

    if (reportToken.projectId) {
      projectsQuery = projectsQuery.andWhere('project.id = :projectId', {
        projectId: reportToken.projectId,
      });
    }

    const projects = await projectsQuery
      .select([
        'project.id',
        'project.name',
        'project.status',
        'project.description',
        'project.startDate',
        'project.endDate',
      ])
      .orderBy('project.createdAt', 'DESC')
      .getMany();

    // パートナー担当のタスクを取得
    let tasksQuery = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.project', 'project')
      .where('task.partnerId = :partnerId', { partnerId: partner.id });

    if (reportToken.projectId) {
      tasksQuery = tasksQuery.andWhere('task.projectId = :projectId', {
        projectId: reportToken.projectId,
      });
    }

    const tasks = await tasksQuery
      .orderBy('task.dueDate', 'ASC', 'NULLS LAST')
      .getMany();

    // 直近の報告を取得
    const recentReports = await this.reportService.getPartnerReportHistory(
      partner.id,
      5,
    );

    // 統計情報を計算
    const now = new Date();
    const taskStats = {
      total: tasks.length,
      completed: tasks.filter((t) => t.status === TaskStatus.DONE).length,
      inProgress: tasks.filter((t) => t.status === TaskStatus.IN_PROGRESS).length,
      todo: tasks.filter((t) => t.status === TaskStatus.TODO).length,
      overdue: tasks.filter(
        (t) =>
          t.dueDate &&
          new Date(t.dueDate) < now &&
          t.status !== TaskStatus.DONE,
      ).length,
    };

    const upcomingTasks = tasks
      .filter(
        (t) =>
          t.dueDate &&
          new Date(t.dueDate) >= now &&
          new Date(t.dueDate) <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) &&
          t.status !== TaskStatus.DONE,
      )
      .slice(0, 5);

    return {
      partner: {
        id: partner.id,
        name: partner.name,
        email: partner.email,
        companyName: partner.companyName,
      },
      tokenInfo: {
        expiresAt: reportToken.expiresAt,
        projectRestriction: !!reportToken.projectId,
      },
      stats: {
        projects: projects.length,
        tasks: taskStats,
        reportsThisMonth: recentReports.filter(
          (r) =>
            new Date(r.createdAt).getMonth() === now.getMonth() &&
            new Date(r.createdAt).getFullYear() === now.getFullYear(),
        ).length,
      },
      projects: projects.map((p) => ({
        id: p.id,
        name: p.name,
        status: p.status,
        description: p.description
          ? p.description.substring(0, 100) + (p.description.length > 100 ? '...' : '')
          : null,
        startDate: p.startDate,
        endDate: p.endDate,
      })),
      upcomingTasks: upcomingTasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate,
        projectName: t.project?.name || null,
      })),
      recentReports: recentReports.map((r) => ({
        id: r.id,
        reportType: r.reportType,
        progressStatus: r.progressStatus || null,
        projectName: r.project?.name || null,
        createdAt: r.createdAt,
      })),
    };
  }
}
