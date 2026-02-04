import { IsOptional, IsEnum, IsInt, Min, Max, IsString, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ReportPeriod } from '../entities/report-config.entity';
import { GeneratedReportStatus } from '../entities/generated-report.entity';

export class QueryGeneratedReportDto {
  @ApiPropertyOptional({ description: 'Page number', minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', minimum: 1, maximum: 100, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Filter by report configuration ID' })
  @IsOptional()
  @IsString()
  reportConfigId?: string;

  @ApiPropertyOptional({ description: 'Filter by report period', enum: ReportPeriod })
  @IsOptional()
  @IsEnum(ReportPeriod)
  period?: ReportPeriod;

  @ApiPropertyOptional({ description: 'Filter by report status', enum: GeneratedReportStatus })
  @IsOptional()
  @IsEnum(GeneratedReportStatus)
  status?: GeneratedReportStatus;

  @ApiPropertyOptional({ description: 'Filter from date (ISO 8601)', example: '2024-01-01' })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ description: 'Filter to date (ISO 8601)', example: '2024-12-31' })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({ description: 'Sort by field', default: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ description: 'Sort order', enum: ['ASC', 'DESC'], default: 'DESC' })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
