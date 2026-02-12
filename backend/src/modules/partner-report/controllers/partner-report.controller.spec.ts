import { Test, TestingModule } from '@nestjs/testing';
import { PartnerReportController, PartnerReportTokenController } from './partner-report.controller';
import { PartnerReportService } from '../services/partner-report.service';
import { PartnerReportTokenService } from '../services/partner-report-token.service';
import { ConfigService } from '@nestjs/config';

describe('PartnerReportController', () => {
  let controller: PartnerReportController;

  const mockReport = {
    id: 'report-uuid-1',
    reportType: 'progress',
    content: 'Weekly progress update',
    createdAt: new Date(),
  };

  const mockReportService = {
    findAll: jest.fn(),
    getUnreadCount: jest.fn(),
    findOne: jest.fn(),
    markAsRead: jest.fn(),
    markMultipleAsRead: jest.fn(),
  };

  const mockTokenService = {
    getTokenByPartnerId: jest.fn(),
    getReportUrl: jest.fn(),
    generateToken: jest.fn(),
    regenerateToken: jest.fn(),
    deactivateToken: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('http://localhost:5173'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PartnerReportController],
      providers: [
        { provide: PartnerReportService, useValue: mockReportService },
        { provide: PartnerReportTokenService, useValue: mockTokenService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get<PartnerReportController>(PartnerReportController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return reports list', async () => {
      const expected = { data: [mockReport], total: 1 };
      mockReportService.findAll.mockResolvedValue(expected);

      const result = await controller.findAll({} as any, 'user-1');

      expect(result).toEqual(expected);
      expect(mockReportService.findAll).toHaveBeenCalledWith({}, 'user-1');
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      mockReportService.getUnreadCount.mockResolvedValue(5);

      const result = await controller.getUnreadCount('user-1');

      expect(result).toEqual({ unreadCount: 5 });
    });
  });

  describe('findOne', () => {
    it('should return report details', async () => {
      mockReportService.findOne.mockResolvedValue(mockReport);

      const result = await controller.findOne('report-1', 'user-1');

      expect(result).toEqual(mockReport);
      expect(mockReportService.findOne).toHaveBeenCalledWith('report-1', 'user-1');
    });

    it('should propagate not found errors', async () => {
      mockReportService.findOne.mockRejectedValue(new Error('Not found'));

      await expect(controller.findOne('invalid', 'user-1')).rejects.toThrow('Not found');
    });
  });

  describe('markAsRead', () => {
    it('should mark report as read', async () => {
      mockReportService.markAsRead.mockResolvedValue(mockReport);

      const result = await controller.markAsRead('report-1', 'user-1');

      expect(result).toEqual({ message: '既読にしました', report: mockReport });
    });
  });

  describe('markMultipleAsRead', () => {
    it('should mark multiple reports as read', async () => {
      mockReportService.markMultipleAsRead.mockResolvedValue(undefined);

      const result = await controller.markMultipleAsRead(
        { ids: ['report-1', 'report-2'] },
        'user-1',
      );

      expect(result).toEqual({ message: '2件を既読にしました' });
      expect(mockReportService.markMultipleAsRead).toHaveBeenCalledWith(
        ['report-1', 'report-2'],
        'user-1',
      );
    });
  });
});

describe('PartnerReportTokenController', () => {
  let controller: PartnerReportTokenController;

  const mockTokenService = {
    getTokenByPartnerId: jest.fn(),
    getReportUrl: jest.fn(),
    generateToken: jest.fn(),
    regenerateToken: jest.fn(),
    deactivateToken: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('http://localhost:5173'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PartnerReportTokenController],
      providers: [
        { provide: PartnerReportTokenService, useValue: mockTokenService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get<PartnerReportTokenController>(PartnerReportTokenController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getToken', () => {
    it('should return token info when token exists', async () => {
      const token = {
        id: 'token-1',
        token: 'abc123',
        expiresAt: new Date(),
        isActive: true,
        lastUsedAt: null,
        createdAt: new Date(),
      };
      mockTokenService.getTokenByPartnerId.mockResolvedValue(token);
      mockTokenService.getReportUrl.mockReturnValue('http://localhost:5173/report/abc123');

      const result = await controller.getToken('partner-1');

      expect(result.token).toBeDefined();
      expect(result.reportUrl).toBe('http://localhost:5173/report/abc123');
    });

    it('should return null when no token exists', async () => {
      mockTokenService.getTokenByPartnerId.mockResolvedValue(null);

      const result = await controller.getToken('partner-1');

      expect(result).toEqual({ token: null, reportUrl: null });
    });
  });

  describe('generateToken', () => {
    it('should generate a new token', async () => {
      const token = { id: 'token-1', token: 'new-token', expiresAt: new Date() };
      mockTokenService.generateToken.mockResolvedValue(token);
      mockTokenService.getReportUrl.mockReturnValue('http://localhost:5173/report/new-token');

      const result = await controller.generateToken('partner-1', {});

      expect(result.message).toBe('報告用トークンを生成しました');
      expect(result.token).toBeDefined();
      expect(result.reportUrl).toBeDefined();
    });
  });

  describe('regenerateToken', () => {
    it('should regenerate a token', async () => {
      const token = { id: 'token-1', token: 'regen-token', expiresAt: new Date() };
      mockTokenService.regenerateToken.mockResolvedValue(token);
      mockTokenService.getReportUrl.mockReturnValue('http://localhost:5173/report/regen-token');

      const result = await controller.regenerateToken('partner-1', { expiresInDays: 30 });

      expect(result.message).toBe('報告用トークンを再生成しました');
      expect(mockTokenService.regenerateToken).toHaveBeenCalledWith('partner-1', undefined, 30);
    });
  });

  describe('deactivateToken', () => {
    it('should deactivate a token', async () => {
      mockTokenService.deactivateToken.mockResolvedValue(undefined);

      const result = await controller.deactivateToken('partner-1');

      expect(result).toEqual({ message: '報告用トークンを無効化しました' });
      expect(mockTokenService.deactivateToken).toHaveBeenCalledWith('partner-1');
    });
  });
});
