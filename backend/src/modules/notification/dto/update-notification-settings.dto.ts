import {
  IsBoolean,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsIn,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DigestTime } from '../entities/notification-settings.entity';

export class UpdateNotificationSettingsDto {
  @ApiPropertyOptional({
    description: 'ダイジェストメール配信の有効/無効',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  digestEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'ダイジェストメール配信時刻',
    example: '07:00',
    enum: ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00'],
  })
  @IsOptional()
  @IsIn(['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00'])
  digestTime?: DigestTime;

  @ApiPropertyOptional({
    description: '期限通知の有効/無効',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  deadlineNotification?: boolean;

  @ApiPropertyOptional({
    description: '担当者変更通知の有効/無効',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  assigneeChangeNotification?: boolean;

  @ApiPropertyOptional({
    description: 'メンション通知の有効/無効',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  mentionNotification?: boolean;

  @ApiPropertyOptional({
    description: 'ステータス変更通知の有効/無効',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  statusChangeNotification?: boolean;

  @ApiPropertyOptional({
    description: 'リマインド上限回数 (1-10)',
    example: 3,
    minimum: 1,
    maximum: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  reminderMaxCount?: number;

  @ApiPropertyOptional({
    description: 'メール通知の有効/無効',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  emailNotification?: boolean;

  @ApiPropertyOptional({
    description: 'プッシュ通知の有効/無効',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  pushNotification?: boolean;
}
