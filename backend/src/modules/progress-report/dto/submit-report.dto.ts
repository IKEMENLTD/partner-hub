import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  Max,
  IsArray,
  IsOptional,
  IsUrl,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubmitReportDto {
  @ApiProperty({ description: 'Reporter name' })
  @IsString()
  @IsNotEmpty()
  reporterName: string;

  @ApiProperty({ description: 'Progress percentage (0-100)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  progress: number;

  @ApiProperty({ description: 'Comment about the progress', required: false })
  @IsString()
  @IsOptional()
  comment?: string;

  @ApiProperty({
    description: 'List of attachment URLs',
    required: false,
    type: [String],
  })
  @IsArray()
  @IsOptional()
  @IsUrl({}, { each: true })
  attachmentUrls?: string[];
}
