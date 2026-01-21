import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { StakeholderController } from './stakeholder.controller';
import { StakeholderService } from './stakeholder.service';
import { HealthScoreService } from './services/health-score.service';
import { Project } from './entities/project.entity';
import { ProjectStakeholder } from './entities/project-stakeholder.entity';
import { ProjectTemplate } from './entities/project-template.entity';
import { Partner } from '../partner/entities/partner.entity';
import { Task } from '../task/entities/task.entity';
import { TaskModule } from '../task/task.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, ProjectStakeholder, ProjectTemplate, Partner, Task]),
    forwardRef(() => TaskModule),
  ],
  controllers: [ProjectController, StakeholderController],
  providers: [ProjectService, StakeholderService, HealthScoreService],
  exports: [ProjectService, StakeholderService, HealthScoreService],
})
export class ProjectModule {}
