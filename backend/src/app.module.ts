import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { WinstonModule } from 'nest-winston';

// Config
import { databaseConfig, appConfig, supabaseConfig, emailConfig, redisConfig } from './config';
import { winstonConfig } from './common/logger/winston.config';

// Entities
import { UserProfile } from './modules/auth/entities/user-profile.entity';

// Common
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { MetricsInterceptor } from './common/interceptors/metrics.interceptor';
import { SupabaseAuthGuard } from './common/guards/supabase-auth.guard';
import { UserProfileCacheModule } from './common/services/user-profile-cache.service';

// Modules
import { AuthModule } from './modules/auth/auth.module';
import { PartnerModule } from './modules/partner/partner.module';
import { ProjectModule } from './modules/project/project.module';
import { TaskModule } from './modules/task/task.module';
import { ReminderModule } from './modules/reminder/reminder.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { SupabaseModule } from './modules/supabase/supabase.module';
import { EscalationModule } from './modules/escalation/escalation.module';
import { FileStorageModule } from './modules/file-storage/file-storage.module';
import { ProgressReportModule } from './modules/progress-report/progress-report.module';
import { AuditModule } from './modules/audit/audit.module';
import { NotificationModule } from './modules/notification/notification.module';
import { CustomFieldTemplateModule } from './modules/custom-field-template/custom-field-template.module';
import { PartnerReportModule } from './modules/partner-report/partner-report.module';
import { SearchModule } from './modules/search/search.module';
import { ReportModule } from './modules/report/report.module';
import { SystemSettingsModule } from './modules/system-settings/system-settings.module';
import { HealthModule } from './modules/health/health.module';
import { OrganizationModule } from './modules/organization/organization.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
      load: [databaseConfig, appConfig, supabaseConfig, emailConfig, redisConfig],
    }),

    // Winston Logger
    WinstonModule.forRoot(winstonConfig),

    // Database - uses configuration from database.config.ts
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        // Get the full database config registered via ConfigModule.forRoot
        const dbConfig = configService.get('database');
        if (dbConfig) {
          return dbConfig;
        }

        // Fallback for direct environment variables (shouldn't reach here normally)
        const databaseUrl = process.env.DATABASE_URL;
        const nodeEnv = process.env.NODE_ENV || 'production';
        const isProduction = nodeEnv === 'production';

        return {
          type: 'postgres' as const,
          url: databaseUrl,
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: false,
          logging: !isProduction,
          autoLoadEntities: true,
          // SSL for Supabase - encrypted connection but flexible certificate validation
          ssl: { rejectUnauthorized: false },
        };
      },
      inject: [ConfigService],
    }),

    // Scheduler
    ScheduleModule.forRoot(),

    // SECURITY FIX: Rate limiting to prevent brute force attacks
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 second
        limit: 3, // 3 requests per second
      },
      {
        name: 'medium',
        ttl: 10000, // 10 seconds
        limit: 20, // 20 requests per 10 seconds
      },
      {
        name: 'long',
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),

    // Supabase
    SupabaseModule,

    // Global user profile cache (shared between guard and auth service)
    UserProfileCacheModule,

    // UserProfile entity for SupabaseAuthGuard
    TypeOrmModule.forFeature([UserProfile]),

    // Feature Modules
    AuthModule,
    PartnerModule,
    ProjectModule,
    TaskModule,
    ReminderModule,
    DashboardModule,
    EscalationModule,
    FileStorageModule,
    ProgressReportModule,
    AuditModule,
    NotificationModule,
    CustomFieldTemplateModule,
    PartnerReportModule,
    SearchModule,
    ReportModule,
    SystemSettingsModule,
    HealthModule,
    OrganizationModule,
  ],
  providers: [
    // Global Exception Filter
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    // SECURITY FIX: Global Rate Limiting Guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // Global Supabase JWT Auth Guard
    {
      provide: APP_GUARD,
      useClass: SupabaseAuthGuard,
    },
    // Global Logging Interceptor
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    // Global Transform Interceptor
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    // Global Audit Interceptor for logging all CRUD operations
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
    // Global Metrics Interceptor for request counting and response time
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
})
export class AppModule {}
