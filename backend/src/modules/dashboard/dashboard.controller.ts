import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { DashboardQueryDto, ReportType, ReportFormat } from './dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../auth/enums/user-role.enum';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get dashboard overview statistics' })
  @ApiResponse({ status: 200, description: 'Dashboard overview data' })
  async getOverview(@CurrentUser('id') userId: string) {
    return this.dashboardService.getOverview(userId);
  }

  @Get('project-summaries')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get project summaries for dashboard' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Project summaries' })
  async getProjectSummaries(@Query('limit') limit?: number) {
    return this.dashboardService.getProjectSummaries(limit || 10);
  }

  @Get('partner-performance')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get partner performance metrics' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Partner performance data' })
  async getPartnerPerformance(@Query('limit') limit?: number) {
    return this.dashboardService.getPartnerPerformance(limit || 10);
  }

  @Get('upcoming-deadlines')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get upcoming deadlines' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Upcoming deadlines' })
  async getUpcomingDeadlines(@Query('days') days?: number) {
    return this.dashboardService.getUpcomingDeadlines(days || 7);
  }

  @Get('overdue')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get overdue projects and tasks' })
  @ApiResponse({ status: 200, description: 'Overdue items' })
  async getOverdueItems() {
    return this.dashboardService.getOverdueItems();
  }

  @Get('recent-activity')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get recent activity' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Recent activity list' })
  async getRecentActivity(@Query('limit') limit?: number) {
    return this.dashboardService.getRecentActivity(limit || 20);
  }

  @Get('task-distribution')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get task distribution statistics' })
  @ApiResponse({ status: 200, description: 'Task distribution data' })
  async getTaskDistribution() {
    return this.dashboardService.getTaskDistribution();
  }

  @Get('project-progress')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get project progress statistics' })
  @ApiResponse({ status: 200, description: 'Project progress data' })
  async getProjectProgress() {
    return this.dashboardService.getProjectProgress();
  }

  @Get('my-dashboard')
  @ApiOperation({ summary: 'Get personalized user dashboard' })
  @ApiResponse({ status: 200, description: 'User dashboard data' })
  async getUserDashboard(@CurrentUser('id') userId: string) {
    return this.dashboardService.getUserDashboard(userId);
  }

  @Get('my-today')
  @ApiOperation({ summary: 'Get today tasks and alerts for logged-in user' })
  @ApiResponse({ status: 200, description: 'Today dashboard data' })
  async getMyToday(@CurrentUser('id') userId: string) {
    return this.dashboardService.getMyToday(userId);
  }

  @Get('today')
  @ApiOperation({ summary: 'Get today tasks and alerts (alias for my-today)' })
  @ApiResponse({ status: 200, description: 'Today dashboard data' })
  async getToday(@CurrentUser('id') userId: string) {
    return this.dashboardService.getMyToday(userId);
  }

  @Get('stats')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get dashboard statistics (alias for overview)' })
  @ApiResponse({ status: 200, description: 'Dashboard statistics' })
  async getStats(@CurrentUser('id') userId: string) {
    return this.dashboardService.getOverview(userId);
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Get user alerts' })
  @ApiResponse({ status: 200, description: 'User alerts list' })
  async getAlerts(@CurrentUser('id') userId: string) {
    return this.dashboardService.getUserAlerts(userId);
  }

  @Patch('alerts/:alertId/read')
  @ApiOperation({ summary: 'Mark alert as read' })
  @ApiResponse({ status: 200, description: 'Alert marked as read' })
  async markAlertAsRead(@CurrentUser('id') userId: string, @Param('alertId') alertId: string) {
    return this.dashboardService.markAlertAsRead(userId, alertId);
  }

  @Patch('alerts/read-all')
  @ApiOperation({ summary: 'Mark all alerts as read' })
  @ApiResponse({ status: 200, description: 'All alerts marked as read' })
  async markAllAlertsAsRead(@CurrentUser('id') userId: string) {
    return this.dashboardService.markAllAlertsAsRead(userId);
  }

  @Get('manager')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get manager dashboard' })
  @ApiResponse({ status: 200, description: 'Manager dashboard data' })
  async getManagerDashboard(@Query('period') period?: string) {
    return this.dashboardService.getManagerDashboard(period || 'month');
  }

  @Get('reports/generate')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Generate dashboard report' })
  @ApiQuery({
    name: 'reportType',
    required: true,
    enum: ReportType,
    description: 'Type of report (weekly, monthly, custom)',
  })
  @ApiQuery({
    name: 'format',
    required: true,
    enum: ReportFormat,
    description: 'Output format (csv)',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Start date for custom report (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'End date for custom report (YYYY-MM-DD)',
  })
  @ApiResponse({ status: 200, description: 'Report file download' })
  @ApiResponse({ status: 400, description: 'Invalid parameters' })
  async generateReport(
    @Query('reportType') reportType: ReportType,
    @Query('format') format: ReportFormat,
    @Query('startDate') startDate: string | undefined,
    @Query('endDate') endDate: string | undefined,
    @Res() res: Response,
  ) {
    const result = await this.dashboardService.generateReport({
      reportType,
      format,
      startDate,
      endDate,
    });

    // Set response headers for file download
    res.setHeader('Content-Type', result.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(result.fileName)}`,
    );
    res.setHeader('Content-Length', result.fileContent.length);

    return res.status(HttpStatus.OK).send(result.fileContent);
  }
}
