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
  @IsString({ message: 'Current password must be a string' })
  @MinLength(8, { message: 'Current password must be at least 8 characters long' })
  currentPassword: string;

  @ApiPropertyOptional({ description: 'New password' })
  @IsString({ message: 'New password must be a string' })
  @MinLength(8, { message: 'New password must be at least 8 characters long' })
  @MaxLength(50, { message: 'New password must be at most 50 characters long' })
  newPassword: string;
}
