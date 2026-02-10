import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsUUID,
  IsNumber,
  IsDateString,
  IsInt,
  IsBoolean,
  MaxLength,
  Min,
  Max,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectStatus, ProjectPriority } from '../enums/project-status.enum';
import { ProjectType } from '../enums/project-type.enum';
import { CompanyRole } from '../enums/company-role.enum';

export class CreateProjectStakeholderDto {
  @ApiProperty({ description: 'Partner ID' })
  @IsUUID()
  partnerId: string;

  @ApiPropertyOptional({ description: 'Tier level (1-3)', example: 1, minimum: 1, maximum: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3)
  tier?: number;

  @ApiPropertyOptional({ description: 'Role description' })
  @IsOptional()
  @IsString()
  roleDescription?: string;

  @ApiPropertyOptional({ description: 'Is primary stakeholder' })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class CreateProjectDto {
  @ApiProperty({ description: 'Project name', example: 'New Website Development' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ description: 'Project description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Project status', enum: ProjectStatus })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @ApiPropertyOptional({ description: 'Project priority', enum: ProjectPriority })
  @IsOptional()
  @IsEnum(ProjectPriority)
  priority?: ProjectPriority;

  @ApiPropertyOptional({ description: 'Project type', enum: ProjectType })
  @IsOptional()
  @IsEnum(ProjectType)
  projectType?: ProjectType;

  @ApiPropertyOptional({ description: 'Company role in project', enum: CompanyRole })
  @IsOptional()
  @IsEnum(CompanyRole)
  companyRole?: CompanyRole;

  @ApiPropertyOptional({ description: 'Project start date', example: '2024-01-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Project end date', example: '2024-12-31' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Project budget' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  budget?: number;

  @ApiPropertyOptional({ description: 'Project owner ID' })
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @ApiPropertyOptional({ description: 'Project manager ID' })
  @IsOptional()
  @IsUUID()
  managerId?: string;

  @ApiPropertyOptional({ description: 'Partner IDs assigned to the project (backward compat)', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  partnerIds?: string[];

  @ApiPropertyOptional({ description: 'Stakeholders with partner + tier info', type: [CreateProjectStakeholderDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProjectStakeholderDto)
  stakeholders?: CreateProjectStakeholderDto[];

  @ApiPropertyOptional({ description: 'Project tags', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
