import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { DashboardOverviewService } from './services/dashboard-overview.service';
import { DashboardActivityService } from './services/dashboard-activity.service';
import { DashboardReportService } from './services/dashboard-report.service';
import { Project } from '../project/entities/project.entity';
import { Task } from '../task/entities/task.entity';
import { Partner } from '../partner/entities/partner.entity';
import { UserProfile } from '../auth/entities/user-profile.entity';
import { Reminder } from '../reminder/entities/reminder.entity';
import { ProjectModule } from '../project/project.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, Task, Partner, UserProfile, Reminder]),
    forwardRef(() => ProjectModule),
  ],
  controllers: [DashboardController],
  providers: [
    DashboardService,
    DashboardOverviewService,
    DashboardActivityService,
    DashboardReportService,
  ],
  exports: [
    DashboardService,
    DashboardOverviewService,
    DashboardActivityService,
    DashboardReportService,
  ],
})
export class DashboardModule {}
