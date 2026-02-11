import { DynamicModule, Module, Logger } from '@nestjs/common';
import { BullModule, getQueueToken } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EmailProcessor } from './processors/email.processor';

@Module({})
export class QueueModule {
  private static readonly logger = new Logger('QueueModule');

  static register(): DynamicModule {
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
      this.logger.warn(
        'REDIS_URL is not configured. Running without Redis queue — emails will be sent directly.',
      );
      return {
        module: QueueModule,
        providers: [
          { provide: getQueueToken('email'), useValue: null },
        ],
        exports: [
          getQueueToken('email'),
        ],
      };
    }

    return {
      module: QueueModule,
      imports: [
        BullModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: (configService: ConfigService) => {
            const redisConfig = configService.get('redis');
            return {
              connection: {
                host: redisConfig?.host || 'localhost',
                port: redisConfig?.port || 6379,
                password: redisConfig?.password,
                tls: redisConfig?.tls,
                maxRetriesPerRequest: null,
              },
            };
          },
          inject: [ConfigService],
        }),
        BullModule.registerQueue(
          {
            name: 'email',
            defaultJobOptions: {
              attempts: 3,
              backoff: {
                type: 'exponential',
                delay: 5000,
              },
              removeOnComplete: 100,
              removeOnFail: 500,
            },
          },
        ),
      ],
      providers: [EmailProcessor],
      exports: [BullModule],
    };
  }
}
