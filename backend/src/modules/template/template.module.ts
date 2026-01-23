import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TemplateController } from './template.controller';
import { TemplateService } from './template.service';
import { Template } from './entities/template.entity';
import { Project } from '../project/entities/project.entity';
import { Task } from '../task/entities/task.entity';
import { Partner } from '../partner/entities/partner.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Template, Project, Task, Partner])],
  controllers: [TemplateController],
  providers: [TemplateService],
  exports: [TemplateService],
})
export class TemplateModule {}
