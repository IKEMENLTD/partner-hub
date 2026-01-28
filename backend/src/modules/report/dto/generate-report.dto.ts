import { IsOptional, IsEnum, IsDateString, IsArray, IsString, IsBoolean } from 'class-validator';
import { ReportPeriod } from '../entities/report-config.entity';

export class GenerateReportDto {
  @IsOptional()
  @IsEnum(ReportPeriod)
  period?: ReportPeriod = ReportPeriod.WEEKLY;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recipients?: string[];

  @IsOptional()
  @IsBoolean()
  sendEmail?: boolean = false;

  @IsOptional()
  @IsString()
  reportConfigId?: string;
}
