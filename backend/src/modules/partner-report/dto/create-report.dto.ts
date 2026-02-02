import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsUUID,
  IsArray,
  IsObject,
  MaxLength,
  ValidateIf,
  IsNotEmpty,
} from 'class-validator';
import { ReportType, ProgressStatus } from '../entities/partner-report.entity';

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

  @ApiPropertyOptional({
    description: '進捗ステータス（クイック報告用）',
    enum: ProgressStatus,
    example: ProgressStatus.ON_TRACK,
  })
  @IsOptional()
  @IsEnum(ProgressStatus, {
    message: '進捗ステータスは on_track, slightly_delayed, has_issues のいずれかを指定してください',
  })
  progressStatus?: ProgressStatus;

  @ApiPropertyOptional({
    description: '報告内容（従来形式）',
    example: '本日、デザインカンプの初稿を完成しました。',
    maxLength: 10000,
  })
  @IsOptional()
  @IsString({ message: '報告内容は文字列で入力してください' })
  @MaxLength(10000, { message: '報告内容は10000文字以内で入力してください' })
  content?: string;

  @ApiPropertyOptional({
    description: '今週の実施内容（順調以外は必須）',
    example: 'デザインカンプの初稿を作成しました。',
    maxLength: 5000,
  })
  @ValidateIf((o) => o.progressStatus && o.progressStatus !== ProgressStatus.ON_TRACK)
  @IsNotEmpty({ message: '順調以外の場合は今週の実施内容を入力してください' })
  @IsOptional()
  @IsString({ message: '今週の実施内容は文字列で入力してください' })
  @MaxLength(5000, { message: '今週の実施内容は5000文字以内で入力してください' })
  weeklyAccomplishments?: string;

  @ApiPropertyOptional({
    description: '来週の予定',
    example: 'クライアントレビューを実施予定です。',
    maxLength: 5000,
  })
  @IsOptional()
  @IsString({ message: '来週の予定は文字列で入力してください' })
  @MaxLength(5000, { message: '来週の予定は5000文字以内で入力してください' })
  nextWeekPlan?: string;

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
