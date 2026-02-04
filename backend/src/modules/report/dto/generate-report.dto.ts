import { IsOptional, IsEnum, IsDateString, IsArray, IsString, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ReportPeriod } from '../entities/report-config.entity';

export class GenerateReportDto {
  @ApiPropertyOptional({ description: 'Report period', enum: ReportPeriod, default: 'weekly' })
  @IsOptional()
  @IsEnum(ReportPeriod)
  period?: ReportPeriod = ReportPeriod.WEEKLY;

  @ApiPropertyOptional({ description: 'Report start date (ISO 8601)', example: '2024-01-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Report end date (ISO 8601)', example: '2024-01-31' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Email recipients for the report', type: [String], example: ['user@example.com'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recipients?: string[];

  @ApiPropertyOptional({ description: 'Send report via email', default: false })
  @IsOptional()
  @IsBoolean()
  sendEmail?: boolean = false;

  @ApiPropertyOptional({ description: 'Use existing report configuration ID to generate report' })
  @IsOptional()
  @IsString()
  reportConfigId?: string;
}
