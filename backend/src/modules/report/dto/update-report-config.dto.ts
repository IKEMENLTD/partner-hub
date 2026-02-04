import { PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateReportConfigDto } from './create-report-config.dto';
import { ReportStatus } from '../entities/report-config.entity';

export class UpdateReportConfigDto extends PartialType(CreateReportConfigDto) {
  @ApiPropertyOptional({ description: 'Report configuration status', enum: ReportStatus })
  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus;
}
