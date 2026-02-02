import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

// Config
import { databaseConfig, appConfig, supabaseConfig, emailConfig, slackConfig } from './config';

// Entities
import { UserProfile } from './modules/auth/entities/user-profile.entity';

// Common
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { SupabaseAuthGuard } from './common/guards/supabase-auth.guard';

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

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
      load: [databaseConfig, appConfig, supabaseConfig, emailConfig, slackConfig],
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('database.url');
        const nodeEnv = configService.get<string>('app.nodeEnv') || 'production';
        const isProduction = nodeEnv === 'production';
        // IMPORTANT: synchronize should NEVER be true in production to prevent data loss
        const shouldSynchronize = configService.get<boolean>('database.synchronize') ?? false;

        if (databaseUrl) {
          return {
            type: 'postgres' as const,
            url: databaseUrl,
            entities: [__dirname + '/**/*.entity{.ts,.js}'],
            synchronize: isProduction ? false : shouldSynchronize,
            logging: !isProduction,
            autoLoadEntities: true,
            ssl: isProduction ? { rejectUnauthorized: false } : false,
          };
        }

        return {
          type: 'postgres' as const,
          host: configService.get<string>('database.host'),
          port: configService.get<number>('database.port'),
          username: configService.get<string>('database.username'),
          password: configService.get<string>('database.password'),
          database: configService.get<string>('database.database'),
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: isProduction ? false : shouldSynchronize,
          logging: !isProduction,
          autoLoadEntities: true,
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
  ],
})
export class AppModule {}
