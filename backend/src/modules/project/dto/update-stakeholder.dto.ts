import { PartialType } from '@nestjs/swagger';
import {
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CreateStakeholderDto } from './create-stakeholder.dto';

export class UpdateStakeholderDto extends PartialType(CreateStakeholderDto) {}

export class UpdateStakeholderTierDto {
  @ApiProperty({
    description: 'New tier level (1=primary, 2=secondary, 3=tertiary)',
    example: 2,
    minimum: 1,
    maximum: 3,
  })
  @IsInt()
  @Min(1)
  @Max(3)
  tier: number;
}
