import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EscalationController } from './escalation.controller';
import { EscalationService } from './escalation.service';
import { EscalationRuleService } from './services/escalation-rule.service';
import { EscalationExecutorService } from './services/escalation-executor.service';
import { EscalationRule } from './entities/escalation-rule.entity';
import { EscalationLog } from './entities/escalation-log.entity';
import { Task } from '../task/entities/task.entity';
import { Project } from '../project/entities/project.entity';
import { ProjectStakeholder } from '../project/entities/project-stakeholder.entity';
import { Partner } from '../partner/entities/partner.entity';
import { ReminderModule } from '../reminder/reminder.module';
import { NotificationModule } from '../notification/notification.module';
import { SystemSettingsModule } from '../system-settings/system-settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([EscalationRule, EscalationLog, Task, Project, ProjectStakeholder, Partner]),
    ReminderModule,
    NotificationModule,
    SystemSettingsModule,
  ],
  controllers: [EscalationController],
  providers: [EscalationService, EscalationRuleService, EscalationExecutorService],
  exports: [EscalationService, EscalationRuleService, EscalationExecutorService],
})
export class EscalationModule {}
