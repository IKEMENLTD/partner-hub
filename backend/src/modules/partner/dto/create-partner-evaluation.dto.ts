import { IsInt, Min, Max, IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePartnerEvaluationDto {
  @ApiProperty({ description: 'Communication score (1-5)', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  communication: number;

  @ApiProperty({ description: 'Deliverable quality score (1-5)', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  deliverableQuality: number;

  @ApiProperty({ description: 'Response speed score (1-5)', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  responseSpeed: number;

  @ApiProperty({ description: 'Reliability score (1-5)', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  reliability: number;

  @ApiPropertyOptional({ description: 'Evaluation comment' })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiPropertyOptional({ description: 'Evaluation period start date' })
  @IsOptional()
  @IsDateString()
  evaluationPeriodStart?: string;

  @ApiPropertyOptional({ description: 'Evaluation period end date' })
  @IsOptional()
  @IsDateString()
  evaluationPeriodEnd?: string;
}
