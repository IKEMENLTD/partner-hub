import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { PartnerReport, PartnerReportToken } from './entities';
import { ReportSchedule } from './entities/report-schedule.entity';
import { ReportRequest } from './entities/report-request.entity';
import { PartnerReportService } from './services/partner-report.service';
import { PartnerReportTokenService } from './services/partner-report-token.service';
import { ReportReminderService } from './services/report-reminder.service';
import {
  PartnerReportController,
  PartnerReportTokenController,
} from './controllers/partner-report.controller';
import { PartnerReportPublicController } from './controllers/partner-report-public.controller';
import { ReportTokenGuard } from './guards/report-token.guard';
import { Partner } from '../partner/entities/partner.entity';
import { Project } from '../project/entities/project.entity';
import { Task } from '../task/entities/task.entity';
import { UserProfile } from '../auth/entities/user-profile.entity';
import { AuthModule } from '../auth/auth.module';
import { PartnerModule } from '../partner/partner.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PartnerReport,
      PartnerReportToken,
      ReportSchedule,
      ReportRequest,
      Partner,
      Project,
      Task,
      UserProfile,
    ]),
    ConfigModule,
    forwardRef(() => AuthModule),
    forwardRef(() => PartnerModule),
    NotificationModule,
  ],
  controllers: [
    PartnerReportController,
    PartnerReportTokenController,
    PartnerReportPublicController,
  ],
  providers: [
    PartnerReportService,
    PartnerReportTokenService,
    ReportReminderService,
    ReportTokenGuard,
  ],
  exports: [PartnerReportService, PartnerReportTokenService, ReportReminderService],
})
export class PartnerReportModule {}
