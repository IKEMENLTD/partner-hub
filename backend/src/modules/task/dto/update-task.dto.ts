import { PartialType, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateTaskDto } from './create-task.dto';
import { IsNumber, IsOptional, Min, Max, IsDateString, IsEnum, IsUUID } from 'class-validator';
import { TaskStatus } from '../enums/task-status.enum';

export class UpdateTaskDto extends PartialType(CreateTaskDto) {
  @ApiPropertyOptional({ description: 'Task progress (0-100)', minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber({}, { message: 'Progress must be a number' })
  @Min(0, { message: 'Progress must be at least 0' })
  @Max(100, { message: 'Progress cannot exceed 100' })
  progress?: number;

  @ApiPropertyOptional({ description: 'Actual hours spent', minimum: 0 })
  @IsOptional()
  @IsNumber({}, { message: 'Actual hours must be a number' })
  @Min(0, { message: 'Actual hours cannot be negative' })
  actualHours?: number;

  @ApiPropertyOptional({ description: 'Completion date', example: '2024-12-31' })
  @IsOptional()
  @IsDateString({}, { message: 'Completed at must be a valid date string' })
  completedAt?: string;
}

// DTO for PATCH /tasks/:id/status endpoint
export class UpdateTaskStatusDto {
  @ApiProperty({ description: 'Task status', enum: TaskStatus })
  @IsEnum(TaskStatus, { message: 'Invalid task status' })
  status: TaskStatus;
}

// DTO for PATCH /tasks/:id/progress endpoint
export class UpdateTaskProgressDto {
  @ApiProperty({ description: 'Task progress (0-100)', minimum: 0, maximum: 100 })
  @IsNumber({}, { message: 'Progress must be a number' })
  @Min(0, { message: 'Progress must be at least 0' })
  @Max(100, { message: 'Progress cannot exceed 100' })
  progress: number;
}

// DTO for PATCH /tasks/:id/assign endpoint
export class AssignTaskDto {
  @ApiProperty({ description: 'Assignee user ID' })
  @IsUUID('4', { message: 'Assignee ID must be a valid UUID' })
  assigneeId: string;
}

// DTO for PATCH /tasks/:id/assign-partner endpoint
export class AssignPartnerDto {
  @ApiProperty({ description: 'Partner ID' })
  @IsUUID('4', { message: 'Partner ID must be a valid UUID' })
  partnerId: string;
}
