import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsInt,
  IsArray,
  IsEmail,
  IsObject,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  EscalationAction,
  EscalationTriggerType,
  EscalationRuleStatus,
} from '../enums/escalation.enum';

export class CreateEscalationRuleDto {
  @ApiProperty({ description: 'Rule name', example: 'Overdue Task Escalation' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ description: 'Rule description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Project ID to apply this rule to (null for global)' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiProperty({
    description: 'Trigger type',
    enum: EscalationTriggerType,
    example: EscalationTriggerType.DAYS_AFTER_DUE,
  })
  @IsEnum(EscalationTriggerType)
  triggerType: EscalationTriggerType;

  @ApiProperty({ description: 'Trigger value (e.g., days)', example: 3 })
  @IsInt()
  @Min(1)
  triggerValue: number;

  @ApiProperty({
    description: 'Action to take when triggered',
    enum: EscalationAction,
    example: EscalationAction.NOTIFY_OWNER,
  })
  @IsEnum(EscalationAction)
  action: EscalationAction;

  @ApiPropertyOptional({
    description: 'Rule status',
    enum: EscalationRuleStatus,
    default: EscalationRuleStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(EscalationRuleStatus)
  status?: EscalationRuleStatus;

  @ApiPropertyOptional({ description: 'Priority (lower is higher priority)', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  priority?: number;

  @ApiPropertyOptional({ description: 'Email addresses to notify', type: [String] })
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  notifyEmails?: string[];

  @ApiPropertyOptional({ description: 'User ID to escalate to' })
  @IsOptional()
  @IsUUID()
  escalateToUserId?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
