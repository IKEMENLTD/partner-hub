import { IsEmail, IsString, MinLength, MaxLength, Validate, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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

export class RegisterDto {
  @ApiProperty({ description: 'メールアドレス', example: 'user@example.com' })
  @IsEmail({}, { message: '有効なメールアドレスを入力してください' })
  email: string;

  @ApiProperty({ description: 'パスワード', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'パスワードは8文字以上で入力してください' })
  @MaxLength(50, { message: 'パスワードは50文字以内で入力してください' })
  @Validate(PasswordStrengthValidator)
  password: string;

  @ApiProperty({ description: '姓', example: '山田' })
  @IsString()
  @MinLength(1, { message: '姓は必須です' })
  @MaxLength(50, { message: '姓は50文字以内で入力してください' })
  firstName: string;

  @ApiProperty({ description: '名', example: '太郎' })
  @IsString()
  @MinLength(1, { message: '名は必須です' })
  @MaxLength(50, { message: '名は50文字以内で入力してください' })
  lastName: string;

  // SECURITY FIX: Removed role from registration DTO
  // Users should not be able to self-assign roles during registration
  // Role assignment should only be done by administrators through separate endpoints
}
