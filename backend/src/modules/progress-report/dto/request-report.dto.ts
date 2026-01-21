import { IsEmail, IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestReportDto {
  @ApiProperty({ description: 'Task ID to request report for' })
  @IsUUID()
  @IsNotEmpty()
  taskId: string;

  @ApiProperty({ description: 'Partner email address to send the report request' })
  @IsEmail()
  @IsNotEmpty()
  partnerEmail: string;

  @ApiProperty({ description: 'Partner name', required: false })
  @IsString()
  partnerName?: string;
}
