import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ReminderController } from './reminder.controller';
import { ReminderService } from './reminder.service';
import { Reminder } from './entities/reminder.entity';
import { Task } from '../task/entities/task.entity';
import { Project } from '../project/entities/project.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Reminder, Task, Project]),
    ScheduleModule.forRoot(),
  ],
  controllers: [ReminderController],
  providers: [ReminderService],
  exports: [ReminderService],
})
export class ReminderModule {}
