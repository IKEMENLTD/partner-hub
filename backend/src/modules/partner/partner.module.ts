import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PartnerController } from './partner.controller';
import { PartnerEvaluationController } from './partner-evaluation.controller';
import { PartnerService } from './partner.service';
import { PartnerEvaluationService } from './services/partner-evaluation.service';
import { PartnerInvitationService } from './services/partner-invitation.service';
import { PartnerAccessGuard } from './guards/partner-access.guard';
import { Partner, PartnerEvaluation, PartnerInvitation } from './entities';
import { Project } from '../project/entities/project.entity';
import { Task } from '../task/entities/task.entity';
import { UserProfile } from '../auth/entities/user-profile.entity';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Partner, PartnerEvaluation, PartnerInvitation, Project, Task, UserProfile]),
    NotificationModule,
  ],
  controllers: [PartnerController, PartnerEvaluationController],
  providers: [PartnerService, PartnerEvaluationService, PartnerInvitationService, PartnerAccessGuard],
  exports: [PartnerService, PartnerEvaluationService, PartnerInvitationService, PartnerAccessGuard],
})
export class PartnerModule {}
