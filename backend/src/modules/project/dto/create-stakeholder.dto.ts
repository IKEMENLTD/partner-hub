import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsNumber,
  IsUUID,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStakeholderDto {
  @ApiProperty({ description: 'Project ID', example: 'uuid' })
  @IsUUID()
  projectId: string;

  @ApiPropertyOptional({ description: 'Partner ID', example: 'uuid' })
  @IsOptional()
  @IsUUID()
  partnerId?: string;

  @ApiPropertyOptional({
    description: 'Tier level (1=primary, 2=secondary, 3=tertiary)',
    example: 1,
    minimum: 1,
    maximum: 3,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3)
  tier?: number;

  @ApiPropertyOptional({ description: 'Parent stakeholder ID for hierarchy', example: 'uuid' })
  @IsOptional()
  @IsUUID()
  parentStakeholderId?: string;

  @ApiPropertyOptional({ description: 'Role description', example: 'Project Sponsor' })
  @IsOptional()
  @IsString()
  roleDescription?: string;

  @ApiPropertyOptional({ description: 'Contract amount', example: 100000.00 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  contractAmount?: number;

  @ApiPropertyOptional({ description: 'Is primary stakeholder', example: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
