import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { ProgressReportService } from './progress-report.service';
import { RequestReportDto } from './dto/request-report.dto';
import { SubmitReportDto } from './dto/submit-report.dto';
import { ReviewReportDto } from './dto/review-report.dto';
import { Public } from '../../common/decorators/public.decorator';
import { SkipThrottle } from '@nestjs/throttler';

@ApiTags('Progress Reports')
@Controller('progress-reports')
export class ProgressReportController {
  constructor(private readonly progressReportService: ProgressReportService) {}

  @Post('request')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Request a progress report from a partner' })
  @ApiResponse({
    status: 201,
    description: 'Report request sent successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Task not found',
  })
  async requestReport(@Body() dto: RequestReportDto, @Request() req: any) {
    const report = await this.progressReportService.requestReport(dto, req.user.id);
    return {
      success: true,
      data: {
        id: report.id,
        taskId: report.taskId,
        reporterEmail: report.reporterEmail,
        tokenExpiresAt: report.tokenExpiresAt,
      },
      message: '進捗報告リクエストを送信しました',
    };
  }

  @Get('form/:token')
  @Public()
  @SkipThrottle()
  @ApiOperation({ summary: 'Get form data for progress report (no auth required)' })
  @ApiParam({ name: 'token', description: 'Report token' })
  @ApiResponse({
    status: 200,
    description: 'Form data retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Invalid or expired token',
  })
  @ApiResponse({
    status: 403,
    description: 'Token has expired',
  })
  async getFormData(@Param('token') token: string) {
    const { report, task } = await this.progressReportService.getFormData(token);
    return {
      success: true,
      data: {
        reportId: report.id,
        reporterName: report.reporterName,
        reporterEmail: report.reporterEmail,
        tokenExpiresAt: report.tokenExpiresAt,
        task: {
          id: task.id,
          title: task.title,
          description: task.description,
          dueDate: task.dueDate,
          project: task.project
            ? {
                id: task.project.id,
                name: task.project.name,
              }
            : null,
        },
      },
    };
  }

  @Post('submit/:token')
  @Public()
  @SkipThrottle()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit a progress report (no auth required)' })
  @ApiParam({ name: 'token', description: 'Report token' })
  @ApiResponse({
    status: 200,
    description: 'Report submitted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Report already submitted',
  })
  @ApiResponse({
    status: 403,
    description: 'Token has expired',
  })
  @ApiResponse({
    status: 404,
    description: 'Invalid token',
  })
  async submitReport(@Param('token') token: string, @Body() dto: SubmitReportDto) {
    const report = await this.progressReportService.submitReport(token, dto);
    return {
      success: true,
      data: {
        id: report.id,
        progress: report.progress,
        submittedAt: report.updatedAt,
      },
      message: '進捗報告を送信しました。ご協力ありがとうございます。',
    };
  }

  @Get('task/:taskId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all progress reports for a task' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiResponse({
    status: 200,
    description: 'Reports retrieved successfully',
  })
  async getReportsByTask(@Param('taskId') taskId: string) {
    const reports = await this.progressReportService.getReportsByTask(taskId);
    return {
      success: true,
      data: reports.map((report) => ({
        id: report.id,
        reporterName: report.reporterName,
        reporterEmail: report.reporterEmail,
        progress: report.progress,
        status: report.status,
        comment: report.comment,
        attachmentUrls: report.attachmentUrls,
        reviewerComment: report.reviewerComment,
        reviewedAt: report.reviewedAt,
        createdAt: report.createdAt,
        updatedAt: report.updatedAt,
      })),
    };
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a single progress report by ID' })
  @ApiParam({ name: 'id', description: 'Report ID' })
  @ApiResponse({
    status: 200,
    description: 'Report retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Report not found',
  })
  async getReportById(@Param('id') id: string) {
    const report = await this.progressReportService.getReportById(id);
    return {
      success: true,
      data: report,
    };
  }

  @Patch(':id/review')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Review a progress report' })
  @ApiParam({ name: 'id', description: 'Report ID' })
  @ApiResponse({
    status: 200,
    description: 'Report reviewed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot review an unsubmitted report',
  })
  @ApiResponse({
    status: 404,
    description: 'Report not found',
  })
  async reviewReport(@Param('id') id: string, @Body() dto: ReviewReportDto, @Request() req: any) {
    const report = await this.progressReportService.reviewReport(id, dto, req.user.id);
    return {
      success: true,
      data: {
        id: report.id,
        status: report.status,
        reviewerComment: report.reviewerComment,
        reviewedAt: report.reviewedAt,
      },
      message: '進捗報告をレビューしました',
    };
  }
}
