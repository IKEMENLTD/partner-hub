import { IsString, MinLength, MaxLength, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../enums/user-role.enum';

export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'User first name' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  firstName?: string;

  @ApiPropertyOptional({ description: 'User last name' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  lastName?: string;

  @ApiPropertyOptional({ description: 'User role', enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ description: 'User active status' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ChangePasswordDto {
  @ApiPropertyOptional({ description: 'Current password' })
  @IsString({ message: '現在のパスワードを入力してください' })
  @MinLength(8, { message: '現在のパスワードは8文字以上で入力してください' })
  currentPassword: string;

  @ApiPropertyOptional({ description: 'New password' })
  @IsString({ message: '新しいパスワードを入力してください' })
  @MinLength(8, { message: '新しいパスワードは8文字以上で入力してください' })
  @MaxLength(50, { message: '新しいパスワードは50文字以内で入力してください' })
  newPassword: string;
}
