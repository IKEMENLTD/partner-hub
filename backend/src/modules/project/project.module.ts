import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { Project } from './entities/project.entity';
import { ProjectStakeholder } from './entities/project-stakeholder.entity';
import { ProjectTemplate } from './entities/project-template.entity';
import { Partner } from '../partner/entities/partner.entity';
import { TaskModule } from '../task/task.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, ProjectStakeholder, ProjectTemplate, Partner]),
    TaskModule,
  ],
  controllers: [ProjectController],
  providers: [ProjectService],
  exports: [ProjectService],
})
export class ProjectModule {}
