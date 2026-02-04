import { Controller, Get, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Public } from '../../common/decorators/public.decorator';
import { MetricsStore, MetricsSummary } from '../../common/interceptors/metrics.interceptor';

export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: DatabaseHealthCheck;
    memory: MemoryHealthCheck;
  };
}

export interface DatabaseHealthCheck {
  status: 'up' | 'down';
  responseTimeMs?: number;
  error?: string;
}

export interface MemoryHealthCheck {
  status: 'healthy' | 'warning' | 'critical';
  usedMB: number;
  totalMB: number;
  usagePercent: number;
}

@ApiTags('Health')
@SkipThrottle()
@Controller('health')
export class HealthController {
  private startTime = Date.now();

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Application is healthy',
  })
  @ApiResponse({
    status: 503,
    description: 'Application is unhealthy',
  })
  async check(): Promise<HealthCheckResponse> {
    const timestamp = new Date().toISOString();
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);

    // Check database
    const dbCheck = await this.checkDatabase();

    // Check memory
    const memoryCheck = this.checkMemory();

    // Determine overall status
    let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    if (dbCheck.status === 'down') {
      status = 'unhealthy';
    } else if (memoryCheck.status === 'critical') {
      status = 'unhealthy';
    } else if (memoryCheck.status === 'warning') {
      status = 'degraded';
    }

    const response: HealthCheckResponse = {
      status,
      timestamp,
      version: process.env.npm_package_version || '1.0.0',
      uptime,
      checks: {
        database: dbCheck,
        memory: memoryCheck,
      },
    };

    if (status !== 'healthy') {
      this.logger.warn('Health check returned non-healthy status', {
        context: 'HealthController',
        status,
        checks: response.checks,
      });
    }

    return response;
  }

  @Get('live')
  @Public()
  @ApiOperation({ summary: 'Liveness probe - checks if app is running' })
  @ApiResponse({ status: 200, description: 'Application is alive' })
  async liveness(): Promise<{ status: string; timestamp: string }> {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  @Public()
  @ApiOperation({ summary: 'Readiness probe - checks if app can handle requests' })
  @ApiResponse({ status: 200, description: 'Application is ready' })
  @ApiResponse({ status: 503, description: 'Application is not ready' })
  async readiness(): Promise<{ status: string; timestamp: string; ready: boolean }> {
    const dbCheck = await this.checkDatabase();
    const ready = dbCheck.status === 'up';

    if (!ready) {
      this.logger.warn('Readiness check failed', {
        context: 'HealthController',
        database: dbCheck,
      });
    }

    return {
      status: ready ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      ready,
    };
  }

  @Get('metrics')
  @Public()
  @ApiOperation({ summary: 'Get application metrics' })
  @ApiResponse({ status: 200, description: 'Metrics retrieved successfully' })
  getMetrics(): MetricsSummary {
    const metricsStore = MetricsStore.getInstance();
    return metricsStore.getMetrics();
  }

  private async checkDatabase(): Promise<DatabaseHealthCheck> {
    const startTime = Date.now();
    try {
      // Simple query to check database connection
      await this.dataSource.query('SELECT 1');
      const responseTimeMs = Date.now() - startTime;

      return {
        status: 'up',
        responseTimeMs,
      };
    } catch (error) {
      const responseTimeMs = Date.now() - startTime;
      this.logger.error('Database health check failed', {
        context: 'HealthController',
        error: error.message,
        responseTimeMs,
      });

      return {
        status: 'down',
        responseTimeMs,
        error: error.message,
      };
    }
  }

  private checkMemory(): MemoryHealthCheck {
    const memoryUsage = process.memoryUsage();
    const usedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const totalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
    const usagePercent = Math.round((usedMB / totalMB) * 100);

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (usagePercent >= 90) {
      status = 'critical';
    } else if (usagePercent >= 75) {
      status = 'warning';
    }

    return {
      status,
      usedMB,
      totalMB,
      usagePercent,
    };
  }
}
