import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  IsBoolean,
  IsInt,
  Min,
  Max,
  Matches,
  ArrayMinSize,
  IsEmail,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportPeriod } from '../entities/report-config.entity';

export class CreateReportConfigDto {
  @ApiProperty({ description: 'Report configuration name', example: 'Weekly Project Summary' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Report description', example: 'Weekly summary of all active projects' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Report period', enum: ReportPeriod, example: 'weekly' })
  @IsEnum(ReportPeriod)
  period: ReportPeriod;

  @ApiPropertyOptional({ description: 'Day of week for weekly reports (0=Sunday, 6=Saturday)', minimum: 0, maximum: 6, example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @ApiPropertyOptional({ description: 'Day of month for monthly reports (1-28)', minimum: 1, maximum: 28, example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(28)
  dayOfMonth?: number;

  @ApiPropertyOptional({ description: 'Time to send the report (HH:mm format)', example: '09:00' })
  @IsOptional()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'sendTime must be in HH:mm format',
  })
  sendTime?: string;

  @ApiProperty({ description: 'List of email recipients', type: [String], example: ['user@example.com'] })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one recipient is required' })
  @IsEmail({}, { each: true })
  recipients: string[];

  @ApiPropertyOptional({ description: 'Include project summary section', default: true })
  @IsOptional()
  @IsBoolean()
  includeProjectSummary?: boolean;

  @ApiPropertyOptional({ description: 'Include task summary section', default: true })
  @IsOptional()
  @IsBoolean()
  includeTaskSummary?: boolean;

  @ApiPropertyOptional({ description: 'Include partner performance section', default: false })
  @IsOptional()
  @IsBoolean()
  includePartnerPerformance?: boolean;

  @ApiPropertyOptional({ description: 'Include highlights section', default: true })
  @IsOptional()
  @IsBoolean()
  includeHighlights?: boolean;

  @ApiPropertyOptional({ description: 'Filter by specific project IDs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  projectIds?: string[];

  @ApiPropertyOptional({ description: 'Filter by specific partner IDs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  partnerIds?: string[];
}
