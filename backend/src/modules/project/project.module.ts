import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { StakeholderController } from './stakeholder.controller';
import { StakeholderService } from './stakeholder.service';
import { HealthScoreService } from './services/health-score.service';
import { ProjectAccessGuard } from './guards/project-access.guard';
import { Project } from './entities/project.entity';
import { ProjectStakeholder } from './entities/project-stakeholder.entity';
import { Partner } from '../partner/entities/partner.entity';
import { Task } from '../task/entities/task.entity';
import { TaskModule } from '../task/task.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, ProjectStakeholder, Partner, Task]),
    forwardRef(() => TaskModule),
    NotificationModule,
  ],
  controllers: [ProjectController, StakeholderController],
  providers: [ProjectService, StakeholderService, HealthScoreService, ProjectAccessGuard],
  exports: [ProjectService, StakeholderService, HealthScoreService, ProjectAccessGuard],
})
export class ProjectModule {}
