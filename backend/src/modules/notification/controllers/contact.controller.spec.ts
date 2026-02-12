import { Test, TestingModule } from '@nestjs/testing';
import { ContactController } from './contact.controller';
import { EmailService } from '../services/email.service';

describe('ContactController', () => {
  let controller: ContactController;

  const mockEmailService = {
    sendEmailDirect: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContactController],
      providers: [
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    controller = module.get<ContactController>(ContactController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('sendInquiry', () => {
    it('should send an inquiry email and return success', async () => {
      const dto = {
        name: 'Test User',
        email: 'user@test.com',
        subject: 'Test Subject',
        message: 'Test message body',
      };
      const user = { id: 'user-uuid-1' } as any;
      mockEmailService.sendEmailDirect.mockResolvedValue(true);

      const result = await controller.sendInquiry(dto as any, user);

      expect(result).toEqual({ success: true });
      expect(mockEmailService.sendEmailDirect).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'kumamoto@ikemen.ltd',
          subject: expect.stringContaining('Test Subject'),
          html: expect.stringContaining('Test User'),
        }),
      );
    });

    it('should propagate email service errors', async () => {
      const dto = {
        name: 'Test',
        email: 'test@test.com',
        subject: 'Sub',
        message: 'Msg',
      };
      const user = { id: 'user-1' } as any;
      mockEmailService.sendEmailDirect.mockRejectedValue(new Error('Email failed'));

      await expect(controller.sendInquiry(dto as any, user)).rejects.toThrow('Email failed');
    });

    it('should escape HTML in the inquiry fields', async () => {
      const dto = {
        name: '<script>alert("xss")</script>',
        email: 'user@test.com',
        subject: 'Subject',
        message: 'Message',
      };
      const user = { id: 'user-1' } as any;
      mockEmailService.sendEmailDirect.mockResolvedValue(true);

      await controller.sendInquiry(dto as any, user);

      const callArgs = mockEmailService.sendEmailDirect.mock.calls[0][0];
      expect(callArgs.html).not.toContain('<script>');
      expect(callArgs.html).toContain('&lt;script&gt;');
    });
  });
});
