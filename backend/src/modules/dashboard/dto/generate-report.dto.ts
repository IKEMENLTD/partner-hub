import { IsEnum, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ReportType {
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  CUSTOM = 'custom',
}

export enum ReportFormat {
  PDF = 'pdf',
  EXCEL = 'excel',
  CSV = 'csv',
}

export class GenerateReportDto {
  @ApiProperty({
    description: 'Type of report to generate',
    enum: ReportType,
    example: ReportType.WEEKLY,
  })
  @IsEnum(ReportType)
  reportType: ReportType;

  @ApiProperty({
    description: 'Output format of the report',
    enum: ReportFormat,
    example: ReportFormat.PDF,
  })
  @IsEnum(ReportFormat)
  format: ReportFormat;

  @ApiPropertyOptional({
    description: 'Start date for custom report (required for custom reportType)',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for custom report (required for custom reportType)',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export interface ReportGenerationResult {
  success: boolean;
  fileName: string;
  fileContent: Buffer;
  mimeType: string;
}
