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

@Controller('reports')
export class ReportController {
  constructor(
    private readonly reportService: ReportService,
    private readonly reportSchedulerService: ReportSchedulerService,
  ) {}

  // ==================== Report Configs ====================

  @Get('configs')
  async getConfigs(@Query() query: QueryReportConfigDto) {
    return this.reportService.findAllConfigs(query);
  }

  @Post('configs')
  async createConfig(@Body() dto: CreateReportConfigDto, @CurrentUser() user: UserProfile) {
    return this.reportService.createConfig(dto, user.id);
  }

  @Get('configs/:id')
  async getConfig(@Param('id') id: string) {
    return this.reportService.findConfigById(id);
  }

  @Put('configs/:id')
  async updateConfig(@Param('id') id: string, @Body() dto: UpdateReportConfigDto) {
    return this.reportService.updateConfig(id, dto);
  }

  @Delete('configs/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteConfig(@Param('id') id: string) {
    await this.reportService.deleteConfig(id);
  }

  // ==================== Generated Reports ====================

  @Get()
  async getGeneratedReports(@Query() query: QueryGeneratedReportDto) {
    return this.reportService.findAllGeneratedReports(query);
  }

  @Get(':id')
  async getGeneratedReport(@Param('id') id: string) {
    return this.reportService.findGeneratedReportById(id);
  }

  @Post('generate')
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
  async triggerScheduledReports() {
    await this.reportSchedulerService.processScheduledReports();
    return { message: 'Scheduled report processing triggered' };
  }
}
