import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { DataSource } from 'typeorm';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

describe('HealthController', () => {
  let controller: HealthController;

  const mockDataSource = {
    query: jest.fn(),
  };

  const mockLogger = {
    warn: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: DataSource, useValue: mockDataSource },
        { provide: WINSTON_MODULE_PROVIDER, useValue: mockLogger },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('check', () => {
    it('should return healthy status when all checks pass', async () => {
      mockDataSource.query.mockResolvedValue([{ '?column?': 1 }]);
      // Mock memory to ensure healthy status
      const mockMemoryUsage = jest.spyOn(process, 'memoryUsage').mockReturnValue({
        rss: 100 * 1024 * 1024, // 100MB
        heapTotal: 50 * 1024 * 1024,
        heapUsed: 30 * 1024 * 1024,
        external: 0,
        arrayBuffers: 0,
      });

      const result = await controller.check();

      expect(result.status).toBe('healthy');
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeGreaterThanOrEqual(0);
      expect(result.checks.database.status).toBe('up');
      expect(result.checks.memory).toBeDefined();
      mockMemoryUsage.mockRestore();
    });

    it('should return unhealthy status when database is down', async () => {
      mockDataSource.query.mockRejectedValue(new Error('Connection refused'));

      const result = await controller.check();

      expect(result.status).toBe('unhealthy');
      expect(result.checks.database.status).toBe('down');
      expect(result.checks.database.error).toBe('Connection refused');
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('liveness', () => {
    it('should return alive status', async () => {
      const result = await controller.liveness();

      expect(result.status).toBe('alive');
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('readiness', () => {
    it('should return ready when database is up', async () => {
      mockDataSource.query.mockResolvedValue([{ '?column?': 1 }]);

      const result = await controller.readiness();

      expect(result.status).toBe('ready');
      expect(result.ready).toBe(true);
    });

    it('should return not ready when database is down', async () => {
      mockDataSource.query.mockRejectedValue(new Error('Connection refused'));

      const result = await controller.readiness();

      expect(result.status).toBe('not_ready');
      expect(result.ready).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('getMetrics', () => {
    it('should return metrics summary', () => {
      const result = controller.getMetrics();

      // MetricsStore.getInstance().getMetrics() returns an object
      expect(result).toBeDefined();
    });
  });
});
