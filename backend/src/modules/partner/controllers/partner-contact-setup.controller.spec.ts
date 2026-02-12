import { Test, TestingModule } from '@nestjs/testing';
import { PartnerContactSetupController } from './partner-contact-setup.controller';
import { PartnerContactSetupService } from '../services/partner-contact-setup.service';

describe('PartnerContactSetupController', () => {
  let controller: PartnerContactSetupController;

  const mockService = {
    verifySetupToken: jest.fn(),
    completeContactSetup: jest.fn(),
    sendContactSetupEmail: jest.fn(),
    resendSetupEmail: jest.fn(),
    getContactSetupStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PartnerContactSetupController],
      providers: [
        { provide: PartnerContactSetupService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<PartnerContactSetupController>(PartnerContactSetupController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('verifyToken', () => {
    it('should verify a setup token', async () => {
      const tokenInfo = { valid: true, partnerName: 'Test Partner', expiresAt: new Date() };
      mockService.verifySetupToken.mockResolvedValue(tokenInfo);

      const result = await controller.verifyToken('test-token');

      expect(result).toEqual(tokenInfo);
      expect(mockService.verifySetupToken).toHaveBeenCalledWith('test-token');
    });

    it('should propagate errors for invalid token', async () => {
      mockService.verifySetupToken.mockRejectedValue(new Error('Invalid token'));

      await expect(controller.verifyToken('bad-token')).rejects.toThrow('Invalid token');
    });
  });

  describe('completeSetup', () => {
    it('should complete contact setup', async () => {
      const dto = { email: 'partner@test.com', phone: '09012345678' };
      const response = { success: true, message: '設定完了' };
      mockService.completeContactSetup.mockResolvedValue(response);

      const result = await controller.completeSetup('test-token', dto as any);

      expect(result).toEqual(response);
      expect(mockService.completeContactSetup).toHaveBeenCalledWith('test-token', dto);
    });

    it('should propagate errors', async () => {
      mockService.completeContactSetup.mockRejectedValue(new Error('Expired token'));

      await expect(controller.completeSetup('bad-token', {} as any)).rejects.toThrow('Expired token');
    });
  });

  describe('sendSetupEmail', () => {
    it('should send setup email and return message', async () => {
      mockService.sendContactSetupEmail.mockResolvedValue(undefined);

      const result = await controller.sendSetupEmail('partner-1');

      expect(result).toEqual({ message: 'セットアップメールを送信しました' });
      expect(mockService.sendContactSetupEmail).toHaveBeenCalledWith('partner-1');
    });

    it('should propagate errors', async () => {
      mockService.sendContactSetupEmail.mockRejectedValue(new Error('Send failed'));

      await expect(controller.sendSetupEmail('partner-1')).rejects.toThrow('Send failed');
    });
  });

  describe('resendSetupEmail', () => {
    it('should resend setup email and return message', async () => {
      mockService.resendSetupEmail.mockResolvedValue(undefined);

      const result = await controller.resendSetupEmail('partner-1');

      expect(result).toEqual({ message: 'セットアップメールを再送信しました' });
      expect(mockService.resendSetupEmail).toHaveBeenCalledWith('partner-1');
    });
  });

  describe('getSetupStatus', () => {
    it('should return setup status for a partner', async () => {
      const status = { setupCompleted: true, emailSent: true };
      mockService.getContactSetupStatus.mockResolvedValue(status);

      const result = await controller.getSetupStatus('partner-1');

      expect(result).toEqual(status);
      expect(mockService.getContactSetupStatus).toHaveBeenCalledWith('partner-1');
    });
  });
});
