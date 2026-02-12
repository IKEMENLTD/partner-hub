import { IsEmail, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../auth/enums/user-role.enum';

export class CreateInvitationDto {
  @ApiProperty({ description: '招待するメールアドレス' })
  @IsEmail({}, { message: '有効なメールアドレスを入力してください' })
  email: string;

  @ApiPropertyOptional({ description: '招待するロール', enum: [UserRole.MEMBER, UserRole.MANAGER] })
  @IsOptional()
  @IsEnum([UserRole.MEMBER, UserRole.MANAGER], { message: 'ロールはmemberまたはmanagerを指定してください' })
  role?: UserRole;

  @ApiPropertyOptional({ description: '招待メッセージ' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}
