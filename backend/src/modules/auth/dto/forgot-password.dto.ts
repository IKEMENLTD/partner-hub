import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: '有効なメールアドレスを入力してください' })
  @IsNotEmpty({ message: 'メールアドレスを入力してください' })
  email: string;
}
