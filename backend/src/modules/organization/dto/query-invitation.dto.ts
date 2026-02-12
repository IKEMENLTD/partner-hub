import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { InvitationStatus } from '../entities/organization-invitation.entity';

export class QueryInvitationDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'ステータスでフィルタ', enum: InvitationStatus })
  @IsOptional()
  @IsEnum(InvitationStatus)
  status?: InvitationStatus;
}
