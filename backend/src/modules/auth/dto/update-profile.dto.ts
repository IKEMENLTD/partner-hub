import { IsString, IsOptional, MaxLength, IsEnum, IsBoolean, IsUrl, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../enums/user-role.enum';

export class UpdateProfileDto {
  @ApiPropertyOptional({ description: 'User first name' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  firstName?: string;

  @ApiPropertyOptional({ description: 'User last name' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  lastName?: string;

  @ApiPropertyOptional({ description: 'Avatar URL (must be a valid HTTPS URL)' })
  @IsOptional()
  @ValidateIf((o) => o.avatarUrl !== null && o.avatarUrl !== '')
  @IsUrl(
    { protocols: ['https'], require_protocol: true },
    { message: 'アバターURLは有効なHTTPS URLである必要があります' }
  )
  @MaxLength(500)
  avatarUrl?: string;

  @ApiPropertyOptional({ description: 'User role (admin only)', enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ description: 'User active status (admin only)' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
