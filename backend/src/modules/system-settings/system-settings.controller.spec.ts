import { Test, TestingModule } from '@nestjs/testing';
import { SystemSettingsController } from './system-settings.controller';
import { SystemSettingsService } from './system-settings.service';
import { SmsService } from '../notification/services/sms.service';
import { BusinessException } from '../../common/exceptions/business.exception';

describe('SystemSettingsController', () => {
  let controller: SystemSettingsController;

  const mockSettings = {
    id: 'settings-1',
    organizationId: 'org-1',
    slackWebhookUrl: null,
    lineNotifyToken: null,
  };

  const mockSystemSettingsService = {
    getSettings: jest.fn(),
    updateSettings: jest.fn(),
    getTwilioSettings: jest.fn(),
  };

  const mockSmsService = {
    isValidPhoneNumber: jest.fn(),
    sendSms: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SystemSettingsController],
      providers: [
        { provide: SystemSettingsService, useValue: mockSystemSettingsService },
        { provide: SmsService, useValue: mockSmsService },
      ],
    }).compile();

    controller = module.get<SystemSettingsController>(SystemSettingsController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getSettings', () => {
    it('should return system settings for user organization', async () => {
      const user = { organizationId: 'org-1' } as any;
      mockSystemSettingsService.getSettings.mockResolvedValue(mockSettings);

      const result = await controller.getSettings(user);

      expect(result).toEqual(mockSettings);
      expect(mockSystemSettingsService.getSettings).toHaveBeenCalledWith('org-1');
    });

    it('should throw when user has no organization', async () => {
      const user = { organizationId: null } as any;

      await expect(controller.getSettings(user)).rejects.toThrow(BusinessException);
    });
  });

  describe('updateSettings', () => {
    it('should update system settings', async () => {
      const user = { organizationId: 'org-1' } as any;
      const updateDto = { slackWebhookUrl: 'https://hooks.slack.com/test' };
      mockSystemSettingsService.updateSettings.mockResolvedValue({
        ...mockSettings,
        ...updateDto,
      });

      const result = await controller.updateSettings(user, updateDto as any);

      expect(result.slackWebhookUrl).toBe('https://hooks.slack.com/test');
      expect(mockSystemSettingsService.updateSettings).toHaveBeenCalledWith('org-1', updateDto);
    });

    it('should throw when user has no organization', async () => {
      const user = { organizationId: null } as any;

      await expect(controller.updateSettings(user, {} as any)).rejects.toThrow(BusinessException);
    });
  });

  describe('testSms', () => {
    it('should send a test SMS successfully', async () => {
      const user = { organizationId: 'org-1' } as any;
      mockSmsService.isValidPhoneNumber.mockReturnValue(true);
      mockSystemSettingsService.getTwilioSettings.mockResolvedValue({
        accountSid: 'sid',
        authToken: 'token',
        phoneNumber: '+81901234567',
      });
      mockSmsService.sendSms.mockResolvedValue({ success: true });

      const result = await controller.testSms(user, '09012345678');

      expect(result).toEqual({
        success: true,
        message: 'テストSMSを送信しました',
      });
    });

    it('should throw when user has no organization', async () => {
      const user = { organizationId: null } as any;

      await expect(controller.testSms(user, '09012345678')).rejects.toThrow(BusinessException);
    });

    it('should throw when phone number is empty', async () => {
      const user = { organizationId: 'org-1' } as any;

      await expect(controller.testSms(user, '')).rejects.toThrow(BusinessException);
    });

    it('should throw when phone number is invalid', async () => {
      const user = { organizationId: 'org-1' } as any;
      mockSmsService.isValidPhoneNumber.mockReturnValue(false);

      await expect(controller.testSms(user, 'invalid')).rejects.toThrow(BusinessException);
    });

    it('should return failure when Twilio is not configured', async () => {
      const user = { organizationId: 'org-1' } as any;
      mockSmsService.isValidPhoneNumber.mockReturnValue(true);
      mockSystemSettingsService.getTwilioSettings.mockResolvedValue({
        accountSid: null,
        authToken: null,
        phoneNumber: null,
      });

      const result = await controller.testSms(user, '09012345678');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Twilio設定が保存されていません');
    });

    it('should return failure when SMS send fails', async () => {
      const user = { organizationId: 'org-1' } as any;
      mockSmsService.isValidPhoneNumber.mockReturnValue(true);
      mockSystemSettingsService.getTwilioSettings.mockResolvedValue({
        accountSid: 'sid',
        authToken: 'token',
        phoneNumber: '+81901234567',
      });
      mockSmsService.sendSms.mockResolvedValue({ success: false, error: 'Network error' });

      const result = await controller.testSms(user, '09012345678');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Network error');
    });
  });
});
