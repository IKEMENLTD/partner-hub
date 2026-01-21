import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PartnerController } from './partner.controller';
import { PartnerEvaluationController } from './partner-evaluation.controller';
import { PartnerService } from './partner.service';
import { PartnerEvaluationService } from './services/partner-evaluation.service';
import { Partner, PartnerEvaluation } from './entities';
import { Project } from '../project/entities/project.entity';
import { Task } from '../task/entities/task.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Partner, PartnerEvaluation, Project, Task])],
  controllers: [PartnerController, PartnerEvaluationController],
  providers: [PartnerService, PartnerEvaluationService],
  exports: [PartnerService, PartnerEvaluationService],
})
export class PartnerModule {}
