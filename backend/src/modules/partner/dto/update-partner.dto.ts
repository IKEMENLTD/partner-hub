import { PartialType, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreatePartnerDto } from './create-partner.dto';
import { IsNumber, IsOptional, Min, Max, IsEnum } from 'class-validator';
import { PartnerStatus } from '../enums/partner-status.enum';

export class UpdatePartnerDto extends PartialType(CreatePartnerDto) {
  @ApiPropertyOptional({ description: 'Partner rating (1-5)', minimum: 1, maximum: 5 })
  @IsOptional()
  @IsNumber({}, { message: 'Rating must be a number' })
  @Min(1, { message: 'Rating must be at least 1' })
  @Max(5, { message: 'Rating must be at most 5' })
  rating?: number;
}

// DTO for PATCH /partners/:id/status endpoint
export class UpdatePartnerStatusDto {
  @ApiProperty({ description: 'Partner status', enum: PartnerStatus })
  @IsEnum(PartnerStatus, { message: 'Invalid partner status' })
  status: PartnerStatus;
}

// DTO for PATCH /partners/:id/rating endpoint
export class UpdatePartnerRatingDto {
  @ApiProperty({ description: 'Partner rating (1-5)', minimum: 1, maximum: 5 })
  @IsNumber({}, { message: 'Rating must be a number' })
  @Min(1, { message: 'Rating must be at least 1' })
  @Max(5, { message: 'Rating must be at most 5' })
  rating: number;
}
