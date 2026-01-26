import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PartnerController } from './partner.controller';
import { PartnerEvaluationController } from './partner-evaluation.controller';
import { PartnerService } from './partner.service';
import { PartnerEvaluationService } from './services/partner-evaluation.service';
import { PartnerAccessGuard } from './guards/partner-access.guard';
import { Partner, PartnerEvaluation } from './entities';
import { Project } from '../project/entities/project.entity';
import { Task } from '../task/entities/task.entity';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Partner, PartnerEvaluation, Project, Task]),
    NotificationModule,
  ],
  controllers: [PartnerController, PartnerEvaluationController],
  providers: [PartnerService, PartnerEvaluationService, PartnerAccessGuard],
  exports: [PartnerService, PartnerEvaluationService, PartnerAccessGuard],
})
export class PartnerModule {}
