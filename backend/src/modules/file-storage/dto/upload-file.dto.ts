import { IsString, IsOptional, IsUUID, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FileCategory } from '../enums/file-category.enum';

export class UploadFileDto {
  @ApiProperty({ description: 'Project ID' })
  @IsUUID()
  projectId: string;

  @ApiPropertyOptional({ description: 'Task ID (optional)' })
  @IsOptional()
  @IsUUID()
  taskId?: string;

  @ApiPropertyOptional({
    description: 'File category',
    enum: FileCategory,
    default: FileCategory.OTHER,
  })
  @IsOptional()
  @IsEnum(FileCategory)
  category?: FileCategory;
}
