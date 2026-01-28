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
import { ReportPeriod } from '../entities/report-config.entity';

export class CreateReportConfigDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(ReportPeriod)
  period: ReportPeriod;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(28)
  dayOfMonth?: number;

  @IsOptional()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'sendTime must be in HH:mm format',
  })
  sendTime?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'At least one recipient is required' })
  @IsEmail({}, { each: true })
  recipients: string[];

  @IsOptional()
  @IsBoolean()
  includeProjectSummary?: boolean;

  @IsOptional()
  @IsBoolean()
  includeTaskSummary?: boolean;

  @IsOptional()
  @IsBoolean()
  includePartnerPerformance?: boolean;

  @IsOptional()
  @IsBoolean()
  includeHighlights?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  projectIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  partnerIds?: string[];
}
