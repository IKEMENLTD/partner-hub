import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { StakeholderController } from './stakeholder.controller';
import { StakeholderService } from './stakeholder.service';
import { HealthScoreService } from './services/health-score.service';
import { ProjectStatisticsService } from './services/project-statistics.service';
import { ProjectAccessGuard } from './guards/project-access.guard';
import { Project } from './entities/project.entity';
import { ProjectTemplate } from './entities/project-template.entity';
import { ProjectStakeholder } from './entities/project-stakeholder.entity';
import { Partner } from '../partner/entities/partner.entity';
import { UserProfile } from '../auth/entities/user-profile.entity';
import { Task } from '../task/entities/task.entity';
import { TaskModule } from '../task/task.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, ProjectTemplate, ProjectStakeholder, Partner, UserProfile, Task]),
    forwardRef(() => TaskModule),
    NotificationModule,
  ],
  controllers: [ProjectController, StakeholderController],
  providers: [
    ProjectService,
    StakeholderService,
    HealthScoreService,
    ProjectStatisticsService,
    ProjectAccessGuard,
  ],
  exports: [
    ProjectService,
    StakeholderService,
    HealthScoreService,
    ProjectStatisticsService,
    ProjectAccessGuard,
  ],
})
export class ProjectModule {}
