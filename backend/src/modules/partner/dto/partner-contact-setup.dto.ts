import { IsEnum, IsOptional, IsString, Matches, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PreferredChannel } from '../enums/preferred-channel.enum';

export class PartnerContactSetupDto {
  @ApiProperty({
    enum: PreferredChannel,
    description: '通常連絡用チャネル',
    example: PreferredChannel.EMAIL,
  })
  @IsEnum(PreferredChannel, { message: '有効な連絡チャネルを選択してください' })
  preferredChannel: PreferredChannel;

  @ApiPropertyOptional({
    description: 'LINE User ID（LINE連携時に設定）',
    example: 'U1234567890abcdef',
  })
  @IsOptional()
  @IsString()
  lineUserId?: string;

  @ApiProperty({
    description: '緊急連絡用電話番号（必須）',
    example: '09012345678',
  })
  @IsNotEmpty({ message: '緊急連絡先として電話番号は必須です' })
  @IsString()
  @Matches(/^[0-9\-+\s()]+$/, { message: '有効な電話番号を入力してください' })
  smsPhoneNumber: string;
}

export class VerifyContactSetupTokenDto {
  @ApiProperty({ description: 'セットアップトークン' })
  @IsNotEmpty()
  @IsString()
  token: string;
}

export class PartnerContactSetupResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiPropertyOptional()
  partner?: {
    id: string;
    name: string;
    email: string;
    preferredChannel: PreferredChannel;
  };
}

export class PartnerContactSetupTokenInfoDto {
  @ApiProperty()
  valid: boolean;

  @ApiPropertyOptional()
  partner?: {
    id: string;
    name: string;
    email: string;
    companyName?: string;
  };

  @ApiPropertyOptional()
  expiresAt?: Date;

  @ApiPropertyOptional()
  message?: string;
}
