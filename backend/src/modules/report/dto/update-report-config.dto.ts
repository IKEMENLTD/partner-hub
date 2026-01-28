import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateReportConfigDto } from './create-report-config.dto';
import { ReportStatus } from '../entities/report-config.entity';

export class UpdateReportConfigDto extends PartialType(CreateReportConfigDto) {
  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus;
}
