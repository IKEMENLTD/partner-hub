import {
  IsString,
  IsOptional,
  IsUUID,
  IsDateString,
  IsNumber,
  IsArray,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApplyTemplateDto {
  @ApiProperty({ description: 'Name for the new project', example: 'New Client Website' })
  @IsString()
  @MaxLength(200)
  projectName: string;

  @ApiPropertyOptional({ description: 'Project description' })
  @IsOptional()
  @IsString()
  projectDescription?: string;

  @ApiPropertyOptional({ description: 'Partner ID to associate with the project' })
  @IsOptional()
  @IsUUID()
  partnerId?: string;

  @ApiPropertyOptional({ description: 'Partner IDs to associate with the project', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  partnerIds?: string[];

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

  @ApiPropertyOptional({ description: 'Project manager ID' })
  @IsOptional()
  @IsUUID()
  managerId?: string;
}
