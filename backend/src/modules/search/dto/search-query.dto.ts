import { IsString, IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum SearchType {
  ALL = 'all',
  PROJECTS = 'projects',
  PARTNERS = 'partners',
  TASKS = 'tasks',
}

export class SearchQueryDto {
  @ApiProperty({
    description: 'Search keyword',
    example: 'project',
  })
  @IsString()
  q: string;

  @ApiPropertyOptional({
    description: 'Type of resources to search',
    enum: SearchType,
    default: SearchType.ALL,
  })
  @IsOptional()
  @IsEnum(SearchType)
  type?: SearchType = SearchType.ALL;

  @ApiPropertyOptional({
    description: 'Maximum number of results per type',
    default: 10,
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}
