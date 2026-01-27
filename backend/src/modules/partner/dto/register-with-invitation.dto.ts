import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength, MaxLength, Validate, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';

/**
 * カスタムパスワードバリデータ
 * 4条件（大文字、小文字、数字、特殊文字）のうち2つ以上を満たす必要がある
 */
@ValidatorConstraint({ name: 'passwordStrength', async: false })
export class PasswordStrengthValidator implements ValidatorConstraintInterface {
  validate(password: string): boolean {
    if (!password) return false;

    const conditions = [
      /[a-z]/.test(password),  // 小文字
      /[A-Z]/.test(password),  // 大文字
      /\d/.test(password),     // 数字
      /[@$!%*?&#^()_+\-=\[\]{}|;:'",.<>?/\\`~]/.test(password), // 特殊文字
    ];

    const conditionsMet = conditions.filter(Boolean).length;
    return conditionsMet >= 2;
  }

  defaultMessage(): string {
    return 'パスワードは大文字、小文字、数字、特殊文字のうち2種類以上を含めてください';
  }
}

export class RegisterWithInvitationDto {
  @ApiProperty({
    description: '招待メールのトークン',
    example: 'abc123def456...',
  })
  @IsString()
  @IsNotEmpty({ message: '招待トークンは必須です' })
  token: string;

  @ApiProperty({
    description: 'アカウントのパスワード',
    example: 'SecurePassword123!',
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: 'パスワードは8文字以上で入力してください' })
  @MaxLength(128, { message: 'パスワードは128文字以内で入力してください' })
  @Validate(PasswordStrengthValidator)
  password: string;

  @ApiProperty({
    description: '姓',
    example: '山田',
  })
  @IsString()
  @IsNotEmpty({ message: '姓は必須です' })
  @MaxLength(100, { message: '姓は100文字以内で入力してください' })
  firstName: string;

  @ApiProperty({
    description: '名',
    example: '太郎',
  })
  @IsString()
  @IsNotEmpty({ message: '名は必須です' })
  @MaxLength(100, { message: '名は100文字以内で入力してください' })
  lastName: string;
}

export class InvitationRegisterResponseDto {
  @ApiProperty({ description: 'Success message' })
  message: string;

  @ApiProperty({ description: 'User information' })
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };

  @ApiProperty({ description: 'Partner information' })
  partner: {
    id: string;
    name: string;
    email: string;
  };

  @ApiProperty({ description: 'Authentication session (may be undefined if session creation fails)', required: false })
  session?: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    expiresAt: number;
  };
}
