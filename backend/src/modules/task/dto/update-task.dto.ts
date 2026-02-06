import { PartialType, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateTaskDto } from './create-task.dto';
import { IsNumber, IsOptional, Min, Max, IsDateString, IsEnum, IsUUID } from 'class-validator';
import { TaskStatus } from '../enums/task-status.enum';

export class UpdateTaskDto extends PartialType(CreateTaskDto) {
  @ApiPropertyOptional({ description: 'Task progress (0-100)', minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber({}, { message: '進捗は数値で入力してください' })
  @Min(0, { message: '進捗は0以上で入力してください' })
  @Max(100, { message: '進捗は100以下で入力してください' })
  progress?: number;

  @ApiPropertyOptional({ description: 'Actual hours spent', minimum: 0 })
  @IsOptional()
  @IsNumber({}, { message: '実績時間は数値で入力してください' })
  @Min(0, { message: '実績時間は0以上で入力してください' })
  actualHours?: number;

  @ApiPropertyOptional({ description: 'Completion date', example: '2024-12-31' })
  @IsOptional()
  @IsDateString({}, { message: '完了日は有効な日付形式で入力してください' })
  completedAt?: string;
}

// DTO for PATCH /tasks/:id/status endpoint
export class UpdateTaskStatusDto {
  @ApiProperty({ description: 'Task status', enum: TaskStatus })
  @IsEnum(TaskStatus, { message: '無効なタスクステータスです' })
  status: TaskStatus;
}

// DTO for PATCH /tasks/:id/progress endpoint
export class UpdateTaskProgressDto {
  @ApiProperty({ description: 'Task progress (0-100)', minimum: 0, maximum: 100 })
  @IsNumber({}, { message: '進捗は数値で入力してください' })
  @Min(0, { message: '進捗は0以上で入力してください' })
  @Max(100, { message: '進捗は100以下で入力してください' })
  progress: number;
}

// DTO for PATCH /tasks/:id/assign endpoint
export class AssignTaskDto {
  @ApiProperty({ description: 'Assignee user ID' })
  @IsUUID('4', { message: '担当者IDが無効です' })
  assigneeId: string;
}

// DTO for PATCH /tasks/:id/assign-partner endpoint
export class AssignPartnerDto {
  @ApiProperty({ description: 'Partner ID' })
  @IsUUID('4', { message: 'パートナーIDが無効です' })
  partnerId: string;
}
