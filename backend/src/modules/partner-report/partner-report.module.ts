import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { PartnerReport, PartnerReportToken } from './entities';
import { PartnerReportService } from './services/partner-report.service';
import { PartnerReportTokenService } from './services/partner-report-token.service';
import {
  PartnerReportController,
  PartnerReportTokenController,
} from './controllers/partner-report.controller';
import { PartnerReportPublicController } from './controllers/partner-report-public.controller';
import { ReportTokenGuard } from './guards/report-token.guard';
import { Partner } from '../partner/entities/partner.entity';
import { Project } from '../project/entities/project.entity';
import { UserProfile } from '../auth/entities/user-profile.entity';
import { AuthModule } from '../auth/auth.module';
import { PartnerModule } from '../partner/partner.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PartnerReport,
      PartnerReportToken,
      Partner,
      Project,
      UserProfile,
    ]),
    ConfigModule,
    forwardRef(() => AuthModule),
    forwardRef(() => PartnerModule),
  ],
  controllers: [
    PartnerReportController,
    PartnerReportTokenController,
    PartnerReportPublicController,
  ],
  providers: [
    PartnerReportService,
    PartnerReportTokenService,
    ReportTokenGuard,
  ],
  exports: [
    PartnerReportService,
    PartnerReportTokenService,
  ],
})
export class PartnerReportModule {}
