import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ValidateResetTokenDto {
  @ApiProperty({ example: 'reset-token-here' })
  @IsString()
  @IsNotEmpty({ message: 'リセットトークンを入力してください' })
  token: string;
}
