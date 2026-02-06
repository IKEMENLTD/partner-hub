import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ReportService } from './report.service';
import { ReportSchedulerService } from './report-scheduler.service';
import {
  CreateReportConfigDto,
  UpdateReportConfigDto,
  QueryReportConfigDto,
  QueryGeneratedReportDto,
  GenerateReportDto,
} from './dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserProfile } from '../auth/entities/user-profile.entity';

@ApiTags('Reports')
@Controller('reports')
export class ReportController {
  constructor(
    private readonly reportService: ReportService,
    private readonly reportSchedulerService: ReportSchedulerService,
  ) {}

  // ==================== Report Configs ====================

  @Get('configs')
  @ApiOperation({ summary: 'Get all report configurations', description: 'Retrieve a paginated list of report configurations with optional filtering' })
  @ApiResponse({ status: 200, description: 'Report configurations retrieved successfully' })
  async getConfigs(@Query() query: QueryReportConfigDto) {
    return this.reportService.findAllConfigs(query);
  }

  @Post('configs')
  @ApiOperation({ summary: 'Create a report configuration', description: 'Create a new scheduled report configuration' })
  @ApiResponse({ status: 201, description: 'Report configuration created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async createConfig(@Body() dto: CreateReportConfigDto, @CurrentUser() user: UserProfile) {
    return this.reportService.createConfig(dto, user.id);
  }

  @Get('configs/:id')
  @ApiOperation({ summary: 'Get a report configuration', description: 'Retrieve a specific report configuration by ID' })
  @ApiParam({ name: 'id', description: 'Report configuration ID' })
  @ApiResponse({ status: 200, description: 'Report configuration retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Report configuration not found' })
  async getConfig(@Param('id') id: string) {
    return this.reportService.findConfigById(id);
  }

  @Put('configs/:id')
  @ApiOperation({ summary: 'Update a report configuration', description: 'Update an existing report configuration' })
  @ApiParam({ name: 'id', description: 'Report configuration ID' })
  @ApiResponse({ status: 200, description: 'Report configuration updated successfully' })
  @ApiResponse({ status: 404, description: 'Report configuration not found' })
  async updateConfig(@Param('id') id: string, @Body() dto: UpdateReportConfigDto) {
    return this.reportService.updateConfig(id, dto);
  }

  @Delete('configs/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a report configuration', description: 'Delete a report configuration by ID' })
  @ApiParam({ name: 'id', description: 'Report configuration ID' })
  @ApiResponse({ status: 204, description: 'Report configuration deleted successfully' })
  @ApiResponse({ status: 404, description: 'Report configuration not found' })
  async deleteConfig(@Param('id') id: string) {
    await this.reportService.deleteConfig(id);
  }

  // ==================== Generated Reports ====================

  @Get()
  @ApiOperation({ summary: 'Get all generated reports', description: 'Retrieve a paginated list of generated reports with optional filtering' })
  @ApiResponse({ status: 200, description: 'Generated reports retrieved successfully' })
  async getGeneratedReports(@Query() query: QueryGeneratedReportDto) {
    return this.reportService.findAllGeneratedReports(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a generated report', description: 'Retrieve a specific generated report by ID' })
  @ApiParam({ name: 'id', description: 'Generated report ID' })
  @ApiResponse({ status: 200, description: 'Generated report retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Generated report not found' })
  async getGeneratedReport(@Param('id') id: string) {
    return this.reportService.findGeneratedReportById(id);
  }

  @Post('generate')
  @ApiOperation({ summary: 'Generate a report', description: 'Generate a report manually or based on an existing configuration' })
  @ApiResponse({ status: 201, description: 'Report generated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 404, description: 'Report configuration not found' })
  async generateReport(@Body() dto: GenerateReportDto, @CurrentUser() user: UserProfile) {
    // If a config ID is provided, use that config to generate
    if (dto.reportConfigId) {
      const config = await this.reportService.findConfigById(dto.reportConfigId);
      return this.reportSchedulerService.generateAndSendReport(config);
    }

    // Otherwise, generate a manual report
    return this.reportService.generateReport(dto, user.id);
  }

  // ==================== Trigger for Testing ====================

  @Post('trigger-scheduled')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger scheduled reports', description: 'Manually trigger the processing of all scheduled reports (for testing purposes)' })
  @ApiResponse({ status: 200, description: 'Scheduled report processing triggered' })
  async triggerScheduledReports() {
    await this.reportSchedulerService.processScheduledReports();
    return { message: 'スケジュールレポートの処理を開始しました' };
  }
}
