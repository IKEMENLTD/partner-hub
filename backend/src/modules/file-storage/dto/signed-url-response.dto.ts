import { ApiProperty } from '@nestjs/swagger';

export class SignedUrlResponseDto {
  @ApiProperty({ description: 'Signed download URL' })
  signedUrl: string;

  @ApiProperty({ description: 'URL expiration time in seconds' })
  expiresIn: number;
}
