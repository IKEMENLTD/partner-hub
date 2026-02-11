import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsNumber,
  IsEnum,
  MaxLength,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CustomFieldDefinitionDto {
  @ApiProperty({ description: 'フィールド名', example: '補助金名' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'フィールドタイプ',
    enum: ['text', 'number', 'date', 'select'],
    example: 'text',
  })
  @IsEnum(['text', 'number', 'date', 'select'])
  type: string;

  @ApiPropertyOptional({ description: '必須フラグ', default: false })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiProperty({ description: '表示順序', example: 1 })
  @IsNumber()
  order: number;

  @ApiPropertyOptional({ description: '最小値（numberタイプ用）' })
  @IsOptional()
  @IsNumber()
  min?: number;

  @ApiPropertyOptional({ description: '最大値（numberタイプ用）' })
  @IsOptional()
  @IsNumber()
  max?: number;

  @ApiPropertyOptional({ description: '最小文字数（textタイプ用）' })
  @IsOptional()
  @IsNumber()
  minLength?: number;

  @ApiPropertyOptional({ description: '最大文字数（textタイプ用）' })
  @IsOptional()
  @IsNumber()
  maxLength?: number;

  @ApiPropertyOptional({
    description: 'セレクトタイプの場合の選択肢',
    example: ['選択肢1', '選択肢2'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];
}

export class CreateCustomFieldTemplateDto {
  @ApiProperty({ description: 'テンプレート名', example: '補助金案件フィールド' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({
    description: '説明',
    example: '補助金申請案件用のカスタムフィールドセット',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'カスタムフィールド定義の配列',
    type: [CustomFieldDefinitionDto],
  })
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => CustomFieldDefinitionDto)
  fields: CustomFieldDefinitionDto[];
}
