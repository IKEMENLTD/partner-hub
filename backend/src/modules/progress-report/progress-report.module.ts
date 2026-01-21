import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProgressReportController } from './progress-report.controller';
import { ProgressReportService } from './progress-report.service';
import { ProgressReport } from './entities/progress-report.entity';
import { Task } from '../task/entities/task.entity';
import { UserProfile } from '../auth/entities/user-profile.entity';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProgressReport, Task, UserProfile]),
    NotificationModule,
  ],
  controllers: [ProgressReportController],
  providers: [ProgressReportService],
  exports: [ProgressReportService],
})
export class ProgressReportModule {}
