import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EscalationController } from './escalation.controller';
import { EscalationService } from './escalation.service';
import { EscalationRule } from './entities/escalation-rule.entity';
import { EscalationLog } from './entities/escalation-log.entity';
import { Task } from '../task/entities/task.entity';
import { Project } from '../project/entities/project.entity';
import { ProjectStakeholder } from '../project/entities/project-stakeholder.entity';
import { ReminderModule } from '../reminder/reminder.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([EscalationRule, EscalationLog, Task, Project, ProjectStakeholder]),
    ReminderModule,
  ],
  controllers: [EscalationController],
  providers: [EscalationService],
  exports: [EscalationService],
})
export class EscalationModule {}
