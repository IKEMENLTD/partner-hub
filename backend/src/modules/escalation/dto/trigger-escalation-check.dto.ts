import { IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class TriggerEscalationCheckDto {
  @ApiPropertyOptional({ description: 'Specific project ID to check (optional)' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Specific task ID to check (optional)' })
  @IsOptional()
  @IsUUID()
  taskId?: string;
}
