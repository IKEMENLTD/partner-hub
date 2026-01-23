import { IsOptional, IsEnum, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import {
  EscalationAction,
  EscalationTriggerType,
  EscalationRuleStatus,
} from '../enums/escalation.enum';

export class QueryEscalationRuleDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filter by project ID' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Filter by trigger type', enum: EscalationTriggerType })
  @IsOptional()
  @IsEnum(EscalationTriggerType)
  triggerType?: EscalationTriggerType;

  @ApiPropertyOptional({ description: 'Filter by action', enum: EscalationAction })
  @IsOptional()
  @IsEnum(EscalationAction)
  action?: EscalationAction;

  @ApiPropertyOptional({ description: 'Filter by status', enum: EscalationRuleStatus })
  @IsOptional()
  @IsEnum(EscalationRuleStatus)
  status?: EscalationRuleStatus;
}
