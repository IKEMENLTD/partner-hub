import { PartialType, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreatePartnerDto } from './create-partner.dto';
import { IsNumber, IsOptional, Min, Max, IsEnum } from 'class-validator';
import { PartnerStatus } from '../enums/partner-status.enum';

export class UpdatePartnerDto extends PartialType(CreatePartnerDto) {
  @ApiPropertyOptional({ description: 'Partner rating (1-5)', minimum: 1, maximum: 5 })
  @IsOptional()
  @IsNumber({}, { message: '評価は数値で入力してください' })
  @Min(1, { message: '評価は1以上で入力してください' })
  @Max(5, { message: '評価は5以下で入力してください' })
  rating?: number;
}

// DTO for PATCH /partners/:id/status endpoint
export class UpdatePartnerStatusDto {
  @ApiProperty({ description: 'Partner status', enum: PartnerStatus })
  @IsEnum(PartnerStatus, { message: '無効なパートナーステータスです' })
  status: PartnerStatus;
}

// DTO for PATCH /partners/:id/rating endpoint
export class UpdatePartnerRatingDto {
  @ApiProperty({ description: 'Partner rating (1-5)', minimum: 1, maximum: 5 })
  @IsNumber({}, { message: '評価は数値で入力してください' })
  @Min(1, { message: '評価は1以上で入力してください' })
  @Max(5, { message: '評価は5以下で入力してください' })
  rating: number;
}
