import { PartialType, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateProjectDto } from './create-project.dto';
import { IsNumber, IsOptional, Min, Max, IsDateString, IsEnum } from 'class-validator';
import { ProjectStatus } from '../enums/project-status.enum';

export class UpdateProjectDto extends PartialType(CreateProjectDto) {
  @ApiPropertyOptional({ description: 'Project progress (0-100)', minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber({}, { message: '進捗は数値で入力してください' })
  @Min(0, { message: '進捗は0以上で入力してください' })
  @Max(100, { message: '進捗は100以下で入力してください' })
  progress?: number;

  @ApiPropertyOptional({ description: 'Actual project cost', minimum: 0 })
  @IsOptional()
  @IsNumber({}, { message: '実績コストは数値で入力してください' })
  @Min(0, { message: '実績コストは0以上で入力してください' })
  actualCost?: number;

  @ApiPropertyOptional({ description: 'Actual end date', example: '2024-12-31' })
  @IsOptional()
  @IsDateString({}, { message: '実績終了日は有効な日付形式で入力してください' })
  actualEndDate?: string;
}

// DTO for PATCH /projects/:id/status endpoint
export class UpdateProjectStatusDto {
  @ApiProperty({ description: 'Project status', enum: ProjectStatus })
  @IsEnum(ProjectStatus, { message: '無効な案件ステータスです' })
  status: ProjectStatus;
}

// DTO for PATCH /projects/:id/progress endpoint
export class UpdateProjectProgressDto {
  @ApiProperty({ description: 'Project progress (0-100)', minimum: 0, maximum: 100 })
  @IsNumber({}, { message: '進捗は数値で入力してください' })
  @Min(0, { message: '進捗は0以上で入力してください' })
  @Max(100, { message: '進捗は100以下で入力してください' })
  progress: number;
}
