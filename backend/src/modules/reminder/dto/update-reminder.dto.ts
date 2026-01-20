import { PartialType } from '@nestjs/swagger';
import { CreateReminderDto } from './create-reminder.dto';
import { IsBoolean, IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ReminderStatus } from '../enums/reminder-type.enum';

export class UpdateReminderDto extends PartialType(CreateReminderDto) {
  @ApiPropertyOptional({ description: 'Reminder status', enum: ReminderStatus })
  @IsOptional()
  @IsEnum(ReminderStatus)
  status?: ReminderStatus;

  @ApiPropertyOptional({ description: 'Mark as read' })
  @IsOptional()
  @IsBoolean()
  isRead?: boolean;
}
