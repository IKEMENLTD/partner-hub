import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ProgressReportStatus } from '../enums/progress-report-status.enum';

export class ReviewReportDto {
  @ApiProperty({
    description: 'Review status',
    enum: [ProgressReportStatus.REVIEWED, ProgressReportStatus.REJECTED],
  })
  @IsEnum(ProgressReportStatus)
  @IsNotEmpty()
  status: ProgressReportStatus.REVIEWED | ProgressReportStatus.REJECTED;

  @ApiProperty({ description: 'Reviewer comment', required: false })
  @IsString()
  @IsOptional()
  reviewerComment?: string;
}
