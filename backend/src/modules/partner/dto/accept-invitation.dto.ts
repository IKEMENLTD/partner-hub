import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AcceptInvitationDto {
  @ApiProperty({
    description: 'Invitation token from the email link',
    example: 'abc123def456...',
  })
  @IsString()
  @IsNotEmpty()
  token: string;
}
