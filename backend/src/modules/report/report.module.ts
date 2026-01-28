import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { ReportSchedulerService } from './report-scheduler.service';
import { ReportConfig } from './entities/report-config.entity';
import { GeneratedReport } from './entities/generated-report.entity';
import { Project } from '../project/entities/project.entity';
import { Task } from '../task/entities/task.entity';
import { Partner } from '../partner/entities/partner.entity';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ReportConfig,
      GeneratedReport,
      Project,
      Task,
      Partner,
    ]),
    NotificationModule,
  ],
  controllers: [ReportController],
  providers: [ReportService, ReportSchedulerService],
  exports: [ReportService, ReportSchedulerService],
})
export class ReportModule {}
