import { Test, TestingModule } from '@nestjs/testing';
import { NotificationSettingsController } from './notification-settings.controller';
import { NotificationSettingsService } from './services/notification-settings.service';
import { EmailService } from './services/email.service';

describe('NotificationSettingsController', () => {
  let controller: NotificationSettingsController;

  const mockSettings = {
    id: 'settings-1',
    userId: 'user-1',
    emailEnabled: true,
    slackEnabled: false,
  };

  const mockSettingsService = {
    getSettingsByUserId: jest.fn(),
    updateSettings: jest.fn(),
    mapToResponse: jest.fn(),
  };

  const mockEmailService = {
    sendEmailDirect: jest.fn(),
    verifyConnection: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationSettingsController],
      providers: [
        { provide: NotificationSettingsService, useValue: mockSettingsService },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    controller = module.get<NotificationSettingsController>(NotificationSettingsController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getSettings', () => {
    it('should return notification settings for user', async () => {
      const mappedSettings = { emailEnabled: true };
      mockSettingsService.getSettingsByUserId.mockResolvedValue(mockSettings);
      mockSettingsService.mapToResponse.mockReturnValue(mappedSettings);

      const result = await controller.getSettings('user-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mappedSettings);
      expect(result.message).toBe('通知設定を取得しました');
      expect(mockSettingsService.getSettingsByUserId).toHaveBeenCalledWith('user-1');
    });
  });

  describe('updateSettings', () => {
    it('should update notification settings', async () => {
      const updateDto = { emailEnabled: false };
      const updatedSettings = { ...mockSettings, emailEnabled: false };
      const mappedSettings = { emailEnabled: false };
      mockSettingsService.updateSettings.mockResolvedValue(updatedSettings);
      mockSettingsService.mapToResponse.mockReturnValue(mappedSettings);

      const result = await controller.updateSettings('user-1', updateDto as any);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mappedSettings);
      expect(result.message).toBe('通知設定を更新しました');
      expect(mockSettingsService.updateSettings).toHaveBeenCalledWith('user-1', updateDto);
    });
  });

  describe('sendTestEmail', () => {
    it('should send test email successfully', async () => {
      mockEmailService.sendEmailDirect.mockResolvedValue(true);

      const result = await controller.sendTestEmail('test@example.com');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ sent: true });
      expect(result.message).toBe('テストメールを送信しました');
    });

    it('should handle email send failure', async () => {
      mockEmailService.sendEmailDirect.mockRejectedValue(new Error('SMTP error'));

      const result = await controller.sendTestEmail('test@example.com');

      expect(result.success).toBe(false);
      expect(result.message).toBe('メール送信失敗: SMTP error');
      expect(result.error!.code).toBe('EMAIL_SEND_FAILED');
    });
  });

  describe('getEmailConfig', () => {
    it('should return email config status when connected', async () => {
      mockEmailService.verifyConnection.mockResolvedValue(true);

      const result = await controller.getEmailConfig();

      expect(result.success).toBe(true);
      expect(result.data!.connectionVerified).toBe(true);
      expect(result.data!.timestamp).toBeDefined();
    });

    it('should return email config status when not connected', async () => {
      mockEmailService.verifyConnection.mockResolvedValue(false);

      const result = await controller.getEmailConfig();

      expect(result.data!.connectionVerified).toBe(false);
    });
  });
});
