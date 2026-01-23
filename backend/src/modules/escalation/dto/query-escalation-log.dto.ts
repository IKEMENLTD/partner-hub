import { IsOptional, IsEnum, IsUUID, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { EscalationAction, EscalationLogStatus } from '../enums/escalation.enum';

export class QueryEscalationLogDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filter by project ID' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Filter by task ID' })
  @IsOptional()
  @IsUUID()
  taskId?: string;

  @ApiPropertyOptional({ description: 'Filter by rule ID' })
  @IsOptional()
  @IsUUID()
  ruleId?: string;

  @ApiPropertyOptional({ description: 'Filter by action', enum: EscalationAction })
  @IsOptional()
  @IsEnum(EscalationAction)
  action?: EscalationAction;

  @ApiPropertyOptional({ description: 'Filter by status', enum: EscalationLogStatus })
  @IsOptional()
  @IsEnum(EscalationLogStatus)
  status?: EscalationLogStatus;

  @ApiPropertyOptional({ description: 'Filter by date from' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Filter by date to' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
