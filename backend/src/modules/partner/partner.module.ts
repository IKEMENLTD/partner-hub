import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { PartnerController } from './partner.controller';
import { PartnerEvaluationController } from './partner-evaluation.controller';
import { PartnerContactSetupController } from './controllers/partner-contact-setup.controller';
import { PartnerService } from './partner.service';
import { PartnerEvaluationService } from './services/partner-evaluation.service';
import { PartnerContactSetupService } from './services/partner-contact-setup.service';
import { PartnerAccessGuard } from './guards/partner-access.guard';
import { Partner, PartnerEvaluation } from './entities';
import { Project } from '../project/entities/project.entity';
import { Task } from '../task/entities/task.entity';
import { UserProfile } from '../auth/entities/user-profile.entity';
import { NotificationModule } from '../notification/notification.module';
import { PartnerReportModule } from '../partner-report/partner-report.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Partner,
      PartnerEvaluation,
      Project,
      Task,
      UserProfile,
    ]),
    ConfigModule,
    NotificationModule,
    forwardRef(() => PartnerReportModule),
  ],
  controllers: [PartnerController, PartnerEvaluationController, PartnerContactSetupController],
  providers: [
    PartnerService,
    PartnerEvaluationService,
    PartnerContactSetupService,
    PartnerAccessGuard,
  ],
  exports: [
    PartnerService,
    PartnerEvaluationService,
    PartnerContactSetupService,
    PartnerAccessGuard,
  ],
})
export class PartnerModule {}
