import { IsOptional, IsPositive, Min, IsString, Max, IsIn, Matches } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  @Min(1)
  @Max(100, { message: 'Limit cannot exceed 100 items per page' })
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Sort field (alphanumeric and underscore only)' })
  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z_][a-zA-Z0-9_]*$/, {
    message: 'Sort field must be a valid column name (alphanumeric and underscore only)',
  })
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Sort order', enum: ['ASC', 'DESC'], default: 'DESC' })
  @IsOptional()
  @IsIn(['ASC', 'DESC'], { message: 'Sort order must be ASC or DESC' })
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

/**
 * API仕様書準拠のページネーションレスポンス
 *
 * @example
 * {
 *   "data": [...],
 *   "pagination": {
 *     "total": 150,
 *     "limit": 20,
 *     "offset": 0,
 *     "hasMore": true
 *   }
 * }
 */
export class PaginatedResponseDto<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };

  constructor(data: T[], total: number, page: number, limit: number) {
    const offset = (page - 1) * limit;
    this.data = data;
    this.pagination = {
      total,
      limit,
      offset,
      hasMore: offset + data.length < total,
    };
  }

  /**
   * offset/limit ベースで直接構築する場合
   */
  static fromOffset<T>(data: T[], total: number, offset: number, limit: number): PaginatedResponseDto<T> {
    const response = new PaginatedResponseDto<T>([], total, 1, limit);
    response.data = data;
    response.pagination = {
      total,
      limit,
      offset,
      hasMore: offset + data.length < total,
    };
    return response;
  }
}
