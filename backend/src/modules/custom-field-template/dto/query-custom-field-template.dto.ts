import { IsOptional, IsString, IsBoolean, IsNumber, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryCustomFieldTemplateDto {
  @ApiPropertyOptional({ description: 'ページ番号', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: '1ページあたりの件数', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({ description: '検索キーワード（名前）' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'アクティブフラグでフィルタ' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'ソート順',
    enum: ['name', 'usageCount', 'createdAt'],
    default: 'usageCount',
  })
  @IsOptional()
  @IsString()
  sortBy?: 'name' | 'usageCount' | 'createdAt' = 'usageCount';

  @ApiPropertyOptional({
    description: 'ソート方向',
    enum: ['ASC', 'DESC'],
    default: 'DESC',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
