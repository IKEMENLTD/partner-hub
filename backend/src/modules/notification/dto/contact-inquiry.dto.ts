import { IsString, IsEmail, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ContactInquiryDto {
  @ApiProperty({ description: 'お名前' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'メールアドレス' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: '件名' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  subject: string;

  @ApiProperty({ description: 'お問い合わせ内容' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  message: string;
}
