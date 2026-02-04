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

// Simple in-memory metrics store with memory leak prevention
export class MetricsStore {
  private static instance: MetricsStore;
  private requestCounts: Map<string, number> = new Map();
  private responseTimes: Map<string, number[]> = new Map();
  private totalRequests: number = 0;
  private errorCount: number = 0;
  private startTime: Date = new Date();
  private lastCleanup: Date = new Date();

  // Memory limits
  private static readonly MAX_ENDPOINTS = 100;
  private static readonly MAX_RESPONSE_TIMES_PER_ENDPOINT = 100;
  private static readonly CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

  static getInstance(): MetricsStore {
    if (!MetricsStore.instance) {
      MetricsStore.instance = new MetricsStore();
    }
    return MetricsStore.instance;
  }

  // Normalize endpoint to prevent unique IDs from creating too many entries
  private normalizeEndpoint(endpoint: string): string {
    // Replace UUIDs with :id
    return endpoint
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
      // Replace numeric IDs with :id
      .replace(/\/\d+/g, '/:id');
  }

  // Cleanup old/least used endpoints to prevent memory growth
  private cleanupIfNeeded(): void {
    const now = new Date();
    if (now.getTime() - this.lastCleanup.getTime() < MetricsStore.CLEANUP_INTERVAL_MS) {
      return;
    }

    this.lastCleanup = now;

    // If we have too many endpoints, remove the least used ones
    if (this.requestCounts.size > MetricsStore.MAX_ENDPOINTS) {
      const sortedEndpoints = Array.from(this.requestCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, MetricsStore.MAX_ENDPOINTS);

      this.requestCounts.clear();
      this.responseTimes.clear();

      for (const [endpoint, count] of sortedEndpoints) {
        this.requestCounts.set(endpoint, count);
      }
    }
  }

  incrementRequestCount(endpoint: string): void {
    this.cleanupIfNeeded();

    const normalizedEndpoint = this.normalizeEndpoint(endpoint);
    const current = this.requestCounts.get(normalizedEndpoint) || 0;
    this.requestCounts.set(normalizedEndpoint, current + 1);
    this.totalRequests++;
  }

  incrementErrorCount(): void {
    this.errorCount++;
  }

  recordResponseTime(endpoint: string, duration: number): void {
    const normalizedEndpoint = this.normalizeEndpoint(endpoint);
    const times = this.responseTimes.get(normalizedEndpoint) || [];
    // Keep only last N measurements per endpoint
    if (times.length >= MetricsStore.MAX_RESPONSE_TIMES_PER_ENDPOINT) {
      times.shift();
    }
    times.push(duration);
    this.responseTimes.set(normalizedEndpoint, times);
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
