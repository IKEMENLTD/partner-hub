import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  ValidateNested,
  MaxLength,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectType } from '../../project/enums/project-type.enum';

export class TemplateTaskDto {
  @ApiProperty({ description: 'Task name', example: 'Requirements gathering' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ description: 'Task description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Estimated days to complete', example: 5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedDays?: number;

  @ApiProperty({ description: 'Task order within phase', example: 1 })
  @IsNumber()
  @Min(0)
  order: number;
}

export class TemplatePhaseDto {
  @ApiProperty({ description: 'Phase name', example: 'Planning' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'Phase order', example: 1 })
  @IsNumber()
  @Min(0)
  order: number;

  @ApiProperty({ description: 'Tasks in this phase', type: [TemplateTaskDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateTaskDto)
  tasks: TemplateTaskDto[];
}

export class CreateTemplateDto {
  @ApiProperty({ description: 'Template name', example: 'Standard Development Project' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ description: 'Template description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Project type this template is for', enum: ProjectType })
  @IsOptional()
  @IsEnum(ProjectType)
  projectType?: ProjectType;

  @ApiPropertyOptional({ description: 'Template phases with tasks', type: [TemplatePhaseDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplatePhaseDto)
  phases?: TemplatePhaseDto[];

  @ApiPropertyOptional({ description: 'Whether the template is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
