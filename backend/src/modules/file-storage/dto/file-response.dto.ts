import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FileCategory } from '../enums/file-category.enum';

export class FileResponseDto {
  @ApiProperty({ description: 'File ID' })
  id: string;

  @ApiProperty({ description: 'Project ID' })
  projectId: string;

  @ApiPropertyOptional({ description: 'Task ID' })
  taskId?: string;

  @ApiProperty({ description: 'Uploader ID' })
  uploaderId: string;

  @ApiProperty({ description: 'File name (UUID-based)' })
  fileName: string;

  @ApiProperty({ description: 'Original file name' })
  originalName: string;

  @ApiProperty({ description: 'MIME type' })
  mimeType: string;

  @ApiProperty({ description: 'File size in bytes' })
  fileSize: number;

  @ApiProperty({ description: 'Storage path in Supabase' })
  storagePath: string;

  @ApiPropertyOptional({ description: 'Public URL' })
  publicUrl?: string;

  @ApiProperty({ description: 'File category', enum: FileCategory })
  category: FileCategory;

  @ApiProperty({ description: 'Created at' })
  createdAt: Date;

  @ApiPropertyOptional({ description: 'Uploader information' })
  uploader?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}
