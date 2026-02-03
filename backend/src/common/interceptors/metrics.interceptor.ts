import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

// Simple in-memory metrics store
export class MetricsStore {
  private static instance: MetricsStore;
  private requestCounts: Map<string, number> = new Map();
  private responseTimes: Map<string, number[]> = new Map();
  private totalRequests: number = 0;
  private errorCount: number = 0;
  private startTime: Date = new Date();

  static getInstance(): MetricsStore {
    if (!MetricsStore.instance) {
      MetricsStore.instance = new MetricsStore();
    }
    return MetricsStore.instance;
  }

  incrementRequestCount(endpoint: string): void {
    const current = this.requestCounts.get(endpoint) || 0;
    this.requestCounts.set(endpoint, current + 1);
    this.totalRequests++;
  }

  incrementErrorCount(): void {
    this.errorCount++;
  }

  recordResponseTime(endpoint: string, duration: number): void {
    const times = this.responseTimes.get(endpoint) || [];
    // Keep only last 1000 measurements per endpoint
    if (times.length >= 1000) {
      times.shift();
    }
    times.push(duration);
    this.responseTimes.set(endpoint, times);
  }

  getMetrics(): MetricsSummary {
    const endpointMetrics: EndpointMetrics[] = [];

    this.requestCounts.forEach((count, endpoint) => {
      const times = this.responseTimes.get(endpoint) || [];
      const avgResponseTime = times.length > 0
        ? times.reduce((a, b) => a + b, 0) / times.length
        : 0;
      const maxResponseTime = times.length > 0 ? Math.max(...times) : 0;
      const minResponseTime = times.length > 0 ? Math.min(...times) : 0;

      endpointMetrics.push({
        endpoint,
        requestCount: count,
        avgResponseTimeMs: Math.round(avgResponseTime * 100) / 100,
        maxResponseTimeMs: maxResponseTime,
        minResponseTimeMs: minResponseTime,
      });
    });

    // Sort by request count descending
    endpointMetrics.sort((a, b) => b.requestCount - a.requestCount);

    const uptimeSeconds = Math.floor(
      (new Date().getTime() - this.startTime.getTime()) / 1000,
    );

    return {
      totalRequests: this.totalRequests,
      errorCount: this.errorCount,
      errorRate: this.totalRequests > 0
        ? Math.round((this.errorCount / this.totalRequests) * 10000) / 100
        : 0,
      uptimeSeconds,
      startTime: this.startTime.toISOString(),
      endpointMetrics: endpointMetrics.slice(0, 20), // Top 20 endpoints
    };
  }

  resetMetrics(): void {
    this.requestCounts.clear();
    this.responseTimes.clear();
    this.totalRequests = 0;
    this.errorCount = 0;
    this.startTime = new Date();
  }
}

export interface EndpointMetrics {
  endpoint: string;
  requestCount: number;
  avgResponseTimeMs: number;
  maxResponseTimeMs: number;
  minResponseTimeMs: number;
}

export interface MetricsSummary {
  totalRequests: number;
  errorCount: number;
  errorRate: number;
  uptimeSeconds: number;
  startTime: string;
  endpointMetrics: EndpointMetrics[];
}

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  private metricsStore = MetricsStore.getInstance();

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const endpoint = `${method} ${url.split('?')[0]}`; // Remove query params
    const startTime = Date.now();

    // Increment request count
    this.metricsStore.incrementRequestCount(endpoint);

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          this.metricsStore.recordResponseTime(endpoint, duration);

          // Log metrics for each request
          this.logger.debug('Request completed', {
            context: 'MetricsInterceptor',
            method,
            url,
            duration,
            timestamp: new Date().toISOString(),
          });
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          this.metricsStore.recordResponseTime(endpoint, duration);
          this.metricsStore.incrementErrorCount();

          this.logger.error('Request failed', {
            context: 'MetricsInterceptor',
            method,
            url,
            duration,
            error: error.message,
            statusCode: error.status || 500,
            timestamp: new Date().toISOString(),
          });
        },
      }),
    );
  }
}
