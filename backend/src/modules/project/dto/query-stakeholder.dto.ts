import {
  IsOptional,
  IsInt,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryStakeholderDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by tier level',
    example: 1,
    minimum: 1,
    maximum: 3,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3)
  tier?: number;

  @ApiPropertyOptional({ description: 'Filter by primary stakeholders only' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isPrimary?: boolean;
}
