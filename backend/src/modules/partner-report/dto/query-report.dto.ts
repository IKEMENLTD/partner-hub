import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsEnum, IsBoolean } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { ReportType, ReportSource } from '../entities/partner-report.entity';

export class QueryReportDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'パートナーIDでフィルター',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID('4', { message: 'パートナーIDの形式が正しくありません' })
  partnerId?: string;

  @ApiPropertyOptional({
    description: '案件IDでフィルター',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsOptional()
  @IsUUID('4', { message: '案件IDの形式が正しくありません' })
  projectId?: string;

  @ApiPropertyOptional({
    description: '報告種別でフィルター',
    enum: ReportType,
  })
  @IsOptional()
  @IsEnum(ReportType, {
    message: '報告種別は progress, issue, completion, general のいずれかを指定してください',
  })
  reportType?: ReportType;

  @ApiPropertyOptional({
    description: '報告元でフィルター',
    enum: ReportSource,
  })
  @IsOptional()
  @IsEnum(ReportSource, {
    message: '報告元は web_form, email, line, teams, api のいずれかを指定してください',
  })
  source?: ReportSource;

  @ApiPropertyOptional({
    description: '未読のみ表示',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({ message: '未読フラグはtrue/falseで指定してください' })
  unreadOnly?: boolean;
}
