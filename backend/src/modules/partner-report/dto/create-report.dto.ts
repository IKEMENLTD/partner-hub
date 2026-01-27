import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsUUID,
  IsArray,
  IsObject,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ReportType } from '../entities/partner-report.entity';

export class CreateReportDto {
  @ApiPropertyOptional({
    description: '関連する案件ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID('4', { message: '案件IDの形式が正しくありません' })
  projectId?: string;

  @ApiPropertyOptional({
    description: '関連するタスクID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsOptional()
  @IsUUID('4', { message: 'タスクIDの形式が正しくありません' })
  taskId?: string;

  @ApiProperty({
    description: '報告種別',
    enum: ReportType,
    example: ReportType.PROGRESS,
  })
  @IsEnum(ReportType, {
    message: '報告種別は progress, issue, completion, general のいずれかを指定してください',
  })
  reportType: ReportType;

  @ApiProperty({
    description: '報告内容',
    example: '本日、デザインカンプの初稿を完成しました。',
    minLength: 1,
    maxLength: 10000,
  })
  @IsString({ message: '報告内容は文字列で入力してください' })
  @MinLength(1, { message: '報告内容を入力してください' })
  @MaxLength(10000, { message: '報告内容は10000文字以内で入力してください' })
  content: string;

  @ApiPropertyOptional({
    description: '添付ファイルURL一覧',
    type: [String],
    example: ['https://storage.example.com/files/design.pdf'],
  })
  @IsOptional()
  @IsArray({ message: '添付ファイルは配列で指定してください' })
  @IsString({ each: true, message: '添付ファイルURLは文字列で指定してください' })
  attachments?: string[];

  @ApiPropertyOptional({
    description: '追加メタデータ',
    type: 'object',
    example: { progressPercentage: 50 },
  })
  @IsOptional()
  @IsObject({ message: 'メタデータはオブジェクト形式で指定してください' })
  metadata?: Record<string, any>;
}
