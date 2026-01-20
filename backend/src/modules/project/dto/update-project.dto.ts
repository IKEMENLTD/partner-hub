import { PartialType, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateProjectDto } from './create-project.dto';
import { IsNumber, IsOptional, Min, Max, IsDateString, IsEnum } from 'class-validator';
import { ProjectStatus } from '../enums/project-status.enum';

export class UpdateProjectDto extends PartialType(CreateProjectDto) {
  @ApiPropertyOptional({ description: 'Project progress (0-100)', minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber({}, { message: 'Progress must be a number' })
  @Min(0, { message: 'Progress must be at least 0' })
  @Max(100, { message: 'Progress cannot exceed 100' })
  progress?: number;

  @ApiPropertyOptional({ description: 'Actual project cost', minimum: 0 })
  @IsOptional()
  @IsNumber({}, { message: 'Actual cost must be a number' })
  @Min(0, { message: 'Actual cost cannot be negative' })
  actualCost?: number;

  @ApiPropertyOptional({ description: 'Actual end date', example: '2024-12-31' })
  @IsOptional()
  @IsDateString({}, { message: 'Actual end date must be a valid date string' })
  actualEndDate?: string;
}

// DTO for PATCH /projects/:id/status endpoint
export class UpdateProjectStatusDto {
  @ApiProperty({ description: 'Project status', enum: ProjectStatus })
  @IsEnum(ProjectStatus, { message: 'Invalid project status' })
  status: ProjectStatus;
}

// DTO for PATCH /projects/:id/progress endpoint
export class UpdateProjectProgressDto {
  @ApiProperty({ description: 'Project progress (0-100)', minimum: 0, maximum: 100 })
  @IsNumber({}, { message: 'Progress must be a number' })
  @Min(0, { message: 'Progress must be at least 0' })
  @Max(100, { message: 'Progress cannot exceed 100' })
  progress: number;
}
