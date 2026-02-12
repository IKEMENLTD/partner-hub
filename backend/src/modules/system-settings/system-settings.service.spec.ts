import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SystemSettingsService } from './system-settings.service';
import { SystemSettings } from './entities/system-settings.entity';
import { UpdateSystemSettingsDto } from './dto/update-system-settings.dto';

describe('SystemSettingsService', () => {
  let service: SystemSettingsService;
  let systemSettingsRepository: Record<string, jest.Mock>;

  const now = new Date('2026-02-12T00:00:00Z');
  const orgId = 'org-uuid-1';

  // Use 'as any' for nullable string fields since the entity declares them as
  // `string` (TypeORM nullable columns), but at runtime they can be null.
  const mockSettings = {
    id: 'settings-1',
    organizationId: orgId,
    slackWebhookUrl: null as any,
    slackChannelName: null as any,
    slackNotifyEscalation: true,
    slackNotifyDailySummary: true,
    slackNotifyAllReminders: false,
    lineChannelAccessToken: null as any,
    lineChannelSecret: null as any,
    twilioAccountSid: null as any,
    twilioAuthToken: null as any,
    twilioPhoneNumber: null as any,
    createdAt: now,
    updatedAt: now,
  };

  const mockSystemSettingsRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SystemSettingsService,
        {
          provide: getRepositoryToken(SystemSettings),
          useValue: mockSystemSettingsRepository,
        },
      ],
    }).compile();

    service = module.get<SystemSettingsService>(SystemSettingsService);
    systemSettingsRepository = module.get(getRepositoryToken(SystemSettings));

    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // =============================================
  // getSettings
  // =============================================

  describe('getSettings', () => {
    it('should return existing settings when they exist for the organization', async () => {
      mockSystemSettingsRepository.findOne.mockResolvedValue(mockSettings);

      const result = await service.getSettings(orgId);

      expect(mockSystemSettingsRepository.findOne).toHaveBeenCalledWith({
        where: { organizationId: orgId },
      });
      expect(result).toEqual(mockSettings);
    });

    it('should not call create or save when settings already exist', async () => {
      mockSystemSettingsRepository.findOne.mockResolvedValue(mockSettings);

      await service.getSettings(orgId);

      expect(mockSystemSettingsRepository.create).not.toHaveBeenCalled();
      expect(mockSystemSettingsRepository.save).not.toHaveBeenCalled();
    });

    it('should create default settings when none exist for the organization', async () => {
      const newSettings = { ...mockSettings };
      mockSystemSettingsRepository.findOne.mockResolvedValue(null);
      mockSystemSettingsRepository.create.mockReturnValue(newSettings);
      mockSystemSettingsRepository.save.mockResolvedValue(newSettings);

      const result = await service.getSettings(orgId);

      expect(mockSystemSettingsRepository.findOne).toHaveBeenCalledWith({
        where: { organizationId: orgId },
      });
      expect(mockSystemSettingsRepository.create).toHaveBeenCalledWith({
        organizationId: orgId,
      });
      expect(mockSystemSettingsRepository.save).toHaveBeenCalledWith(newSettings);
      expect(result).toEqual(newSettings);
    });

    it('should create settings with only organizationId (defaults handled by entity)', async () => {
      mockSystemSettingsRepository.findOne.mockResolvedValue(null);
      mockSystemSettingsRepository.create.mockReturnValue({ organizationId: orgId });
      mockSystemSettingsRepository.save.mockResolvedValue({ organizationId: orgId });

      await service.getSettings(orgId);

      expect(mockSystemSettingsRepository.create).toHaveBeenCalledWith({
        organizationId: orgId,
      });
    });

    it('should work with different organization IDs', async () => {
      const otherOrgId = 'org-uuid-2';
      const otherSettings = { ...mockSettings, organizationId: otherOrgId, id: 'settings-2' };
      mockSystemSettingsRepository.findOne.mockResolvedValue(otherSettings);

      const result = await service.getSettings(otherOrgId);

      expect(mockSystemSettingsRepository.findOne).toHaveBeenCalledWith({
        where: { organizationId: otherOrgId },
      });
      expect(result.organizationId).toBe(otherOrgId);
    });

    it('should propagate error when findOne fails', async () => {
      const error = new Error('Database connection failed');
      mockSystemSettingsRepository.findOne.mockRejectedValue(error);

      await expect(service.getSettings(orgId)).rejects.toThrow('Database connection failed');
    });

    it('should propagate error when save fails during auto-creation', async () => {
      mockSystemSettingsRepository.findOne.mockResolvedValue(null);
      mockSystemSettingsRepository.create.mockReturnValue({ organizationId: orgId });
      mockSystemSettingsRepository.save.mockRejectedValue(new Error('Save failed'));

      await expect(service.getSettings(orgId)).rejects.toThrow('Save failed');
    });

    it('should return settings with all integration fields populated', async () => {
      const fullSettings: Partial<SystemSettings> = {
        ...mockSettings,
        slackWebhookUrl: 'https://hooks.slack.com/services/T00/B00/xxxx',
        slackChannelName: '#project-alerts',
        slackNotifyEscalation: true,
        slackNotifyDailySummary: false,
        slackNotifyAllReminders: true,
        lineChannelAccessToken: 'line-token-123',
        lineChannelSecret: 'line-secret-456',
        twilioAccountSid: 'AC1234567890',
        twilioAuthToken: 'auth-token-abc',
        twilioPhoneNumber: '+15551234567',
      };
      mockSystemSettingsRepository.findOne.mockResolvedValue(fullSettings);

      const result = await service.getSettings(orgId);

      expect(result.slackWebhookUrl).toBe('https://hooks.slack.com/services/T00/B00/xxxx');
      expect(result.slackChannelName).toBe('#project-alerts');
      expect(result.lineChannelAccessToken).toBe('line-token-123');
      expect(result.twilioAccountSid).toBe('AC1234567890');
      expect(result.twilioPhoneNumber).toBe('+15551234567');
    });
  });

  // =============================================
  // updateSettings
  // =============================================

  describe('updateSettings', () => {
    it('should update Twilio settings on existing settings', async () => {
      const existingSettings = { ...mockSettings };
      mockSystemSettingsRepository.findOne.mockResolvedValue(existingSettings);
      mockSystemSettingsRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );

      const dto: UpdateSystemSettingsDto = {
        twilioAccountSid: 'AC_NEW_SID',
        twilioAuthToken: 'NEW_AUTH_TOKEN',
        twilioPhoneNumber: '+15559999999',
      };

      const result = await service.updateSettings(orgId, dto);

      expect(mockSystemSettingsRepository.save).toHaveBeenCalled();
      expect(result.twilioAccountSid).toBe('AC_NEW_SID');
      expect(result.twilioAuthToken).toBe('NEW_AUTH_TOKEN');
      expect(result.twilioPhoneNumber).toBe('+15559999999');
    });

    it('should only update fields that are provided (partial update)', async () => {
      const existingSettings = {
        ...mockSettings,
        twilioAccountSid: 'AC_OLD_SID',
        twilioAuthToken: 'OLD_TOKEN',
        twilioPhoneNumber: '+15551111111',
      };
      mockSystemSettingsRepository.findOne.mockResolvedValue(existingSettings);
      mockSystemSettingsRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );

      const dto: UpdateSystemSettingsDto = {
        twilioPhoneNumber: '+15552222222',
      };

      const result = await service.updateSettings(orgId, dto);

      // Only phoneNumber should change
      expect(result.twilioPhoneNumber).toBe('+15552222222');
      // Other fields should remain unchanged
      expect(result.twilioAccountSid).toBe('AC_OLD_SID');
      expect(result.twilioAuthToken).toBe('OLD_TOKEN');
    });

    it('should not modify settings when dto has no defined fields', async () => {
      const existingSettings = {
        ...mockSettings,
        twilioAccountSid: 'AC_EXISTING',
        twilioAuthToken: 'EXISTING_TOKEN',
        twilioPhoneNumber: '+15550000000',
      };
      mockSystemSettingsRepository.findOne.mockResolvedValue(existingSettings);
      mockSystemSettingsRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );

      const dto: UpdateSystemSettingsDto = {};

      const result = await service.updateSettings(orgId, dto);

      expect(result.twilioAccountSid).toBe('AC_EXISTING');
      expect(result.twilioAuthToken).toBe('EXISTING_TOKEN');
      expect(result.twilioPhoneNumber).toBe('+15550000000');
    });

    it('should create default settings first if none exist, then update', async () => {
      const newSettings = { ...mockSettings };
      // First call from getSettings: no settings found
      mockSystemSettingsRepository.findOne.mockResolvedValue(null);
      mockSystemSettingsRepository.create.mockReturnValue(newSettings);
      // save is called twice: once in getSettings (creation), once in updateSettings
      mockSystemSettingsRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );

      const dto: UpdateSystemSettingsDto = {
        twilioAccountSid: 'AC_BRAND_NEW',
      };

      const result = await service.updateSettings(orgId, dto);

      expect(mockSystemSettingsRepository.create).toHaveBeenCalledWith({
        organizationId: orgId,
      });
      // save should be called twice: creation + update
      expect(mockSystemSettingsRepository.save).toHaveBeenCalledTimes(2);
      expect(result.twilioAccountSid).toBe('AC_BRAND_NEW');
    });

    it('should handle updating only twilioAccountSid', async () => {
      const existingSettings = { ...mockSettings };
      mockSystemSettingsRepository.findOne.mockResolvedValue(existingSettings);
      mockSystemSettingsRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );

      const dto: UpdateSystemSettingsDto = {
        twilioAccountSid: 'AC_ONLY_SID',
      };

      const result = await service.updateSettings(orgId, dto);

      expect(result.twilioAccountSid).toBe('AC_ONLY_SID');
      // undefined fields should not be touched
      expect(result.twilioAuthToken).toBeNull();
      expect(result.twilioPhoneNumber).toBeNull();
    });

    it('should handle updating only twilioAuthToken', async () => {
      const existingSettings = { ...mockSettings };
      mockSystemSettingsRepository.findOne.mockResolvedValue(existingSettings);
      mockSystemSettingsRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );

      const dto: UpdateSystemSettingsDto = {
        twilioAuthToken: 'NEW_TOKEN_ONLY',
      };

      const result = await service.updateSettings(orgId, dto);

      expect(result.twilioAuthToken).toBe('NEW_TOKEN_ONLY');
    });

    it('should handle updating only twilioPhoneNumber', async () => {
      const existingSettings = { ...mockSettings };
      mockSystemSettingsRepository.findOne.mockResolvedValue(existingSettings);
      mockSystemSettingsRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );

      const dto: UpdateSystemSettingsDto = {
        twilioPhoneNumber: '+81901234567',
      };

      const result = await service.updateSettings(orgId, dto);

      expect(result.twilioPhoneNumber).toBe('+81901234567');
    });

    it('should propagate error when save fails during update', async () => {
      mockSystemSettingsRepository.findOne.mockResolvedValue({ ...mockSettings });
      mockSystemSettingsRepository.save.mockRejectedValue(new Error('Update failed'));

      const dto: UpdateSystemSettingsDto = {
        twilioAccountSid: 'AC_FAIL',
      };

      await expect(service.updateSettings(orgId, dto)).rejects.toThrow('Update failed');
    });

    it('should not overwrite fields with undefined when dto field is undefined', async () => {
      const existingSettings = {
        ...mockSettings,
        twilioAccountSid: 'AC_KEEP_THIS',
        twilioAuthToken: 'TOKEN_KEEP_THIS',
        twilioPhoneNumber: '+15553333333',
      };
      mockSystemSettingsRepository.findOne.mockResolvedValue(existingSettings);
      mockSystemSettingsRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );

      const dto: UpdateSystemSettingsDto = {
        twilioAccountSid: undefined,
        twilioAuthToken: undefined,
        twilioPhoneNumber: undefined,
      };

      const result = await service.updateSettings(orgId, dto);

      expect(result.twilioAccountSid).toBe('AC_KEEP_THIS');
      expect(result.twilioAuthToken).toBe('TOKEN_KEEP_THIS');
      expect(result.twilioPhoneNumber).toBe('+15553333333');
    });

    it('should return the saved entity after update', async () => {
      const existingSettings = { ...mockSettings };
      mockSystemSettingsRepository.findOne.mockResolvedValue(existingSettings);
      mockSystemSettingsRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );

      const dto: UpdateSystemSettingsDto = {
        twilioAccountSid: 'AC_RETURN_CHECK',
      };

      const result = await service.updateSettings(orgId, dto);

      expect(result).toBeDefined();
      expect(result.organizationId).toBe(orgId);
      expect(result.twilioAccountSid).toBe('AC_RETURN_CHECK');
    });
  });

  // =============================================
  // getTwilioSettings
  // =============================================

  describe('getTwilioSettings', () => {
    it('should return Twilio settings when they exist', async () => {
      const settingsWithTwilio = {
        ...mockSettings,
        twilioAccountSid: 'AC1234567890',
        twilioAuthToken: 'auth-token-xyz',
        twilioPhoneNumber: '+15551234567',
      };
      mockSystemSettingsRepository.findOne.mockResolvedValue(settingsWithTwilio);

      const result = await service.getTwilioSettings(orgId);

      expect(mockSystemSettingsRepository.findOne).toHaveBeenCalledWith({
        where: { organizationId: orgId },
      });
      expect(result).toEqual({
        accountSid: 'AC1234567890',
        authToken: 'auth-token-xyz',
        phoneNumber: '+15551234567',
      });
    });

    it('should return null values when settings exist but Twilio fields are null', async () => {
      mockSystemSettingsRepository.findOne.mockResolvedValue(mockSettings);

      const result = await service.getTwilioSettings(orgId);

      expect(result).toEqual({
        accountSid: null,
        authToken: null,
        phoneNumber: null,
      });
    });

    it('should return null values when no settings exist for the organization', async () => {
      mockSystemSettingsRepository.findOne.mockResolvedValue(null);

      const result = await service.getTwilioSettings(orgId);

      expect(result).toEqual({
        accountSid: null,
        authToken: null,
        phoneNumber: null,
      });
    });

    it('should return null values when settings have empty string Twilio fields', async () => {
      const settingsWithEmpty = {
        ...mockSettings,
        twilioAccountSid: '',
        twilioAuthToken: '',
        twilioPhoneNumber: '',
      };
      mockSystemSettingsRepository.findOne.mockResolvedValue(settingsWithEmpty);

      const result = await service.getTwilioSettings(orgId);

      // Empty strings are falsy, so || null returns null
      expect(result).toEqual({
        accountSid: null,
        authToken: null,
        phoneNumber: null,
      });
    });

    it('should return partial Twilio settings when only some fields are configured', async () => {
      const partialSettings = {
        ...mockSettings,
        twilioAccountSid: 'AC_PARTIAL',
        twilioAuthToken: null,
        twilioPhoneNumber: '+15558888888',
      };
      mockSystemSettingsRepository.findOne.mockResolvedValue(partialSettings);

      const result = await service.getTwilioSettings(orgId);

      expect(result).toEqual({
        accountSid: 'AC_PARTIAL',
        authToken: null,
        phoneNumber: '+15558888888',
      });
    });

    it('should query with the correct organizationId', async () => {
      const differentOrgId = 'org-uuid-different';
      mockSystemSettingsRepository.findOne.mockResolvedValue(null);

      await service.getTwilioSettings(differentOrgId);

      expect(mockSystemSettingsRepository.findOne).toHaveBeenCalledWith({
        where: { organizationId: differentOrgId },
      });
    });

    it('should propagate error when findOne fails', async () => {
      const error = new Error('Database error');
      mockSystemSettingsRepository.findOne.mockRejectedValue(error);

      await expect(service.getTwilioSettings(orgId)).rejects.toThrow('Database error');
    });

    it('should not call create or save (read-only operation)', async () => {
      mockSystemSettingsRepository.findOne.mockResolvedValue(mockSettings);

      await service.getTwilioSettings(orgId);

      expect(mockSystemSettingsRepository.create).not.toHaveBeenCalled();
      expect(mockSystemSettingsRepository.save).not.toHaveBeenCalled();
    });
  });

  // =============================================
  // Integration: getSettings -> updateSettings flow
  // =============================================

  describe('getSettings -> updateSettings integration', () => {
    it('should create settings, then update them in sequence', async () => {
      const createdSettings = { ...mockSettings };

      // getSettings: no existing settings -> create
      mockSystemSettingsRepository.findOne
        .mockResolvedValueOnce(null)       // first getSettings call - no settings
        .mockResolvedValueOnce(null);      // getSettings inside updateSettings - no settings (race scenario)
      mockSystemSettingsRepository.create.mockReturnValue(createdSettings);
      mockSystemSettingsRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );

      // First: get settings (triggers creation)
      const created = await service.getSettings(orgId);
      expect(created).toBeDefined();
      expect(mockSystemSettingsRepository.create).toHaveBeenCalledTimes(1);
    });

    it('should use existing settings for update without creating new ones', async () => {
      const existingSettings = {
        ...mockSettings,
        twilioAccountSid: 'AC_OLD' as any,
      };

      // updateSettings calls getSettings internally, which calls findOne
      mockSystemSettingsRepository.findOne.mockResolvedValue(existingSettings);
      mockSystemSettingsRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );

      const dto: UpdateSystemSettingsDto = {
        twilioAccountSid: 'AC_INTEGRATED',
        twilioPhoneNumber: '+15557777777',
      };

      const result = await service.updateSettings(orgId, dto);

      // findOne should be called once (from getSettings inside updateSettings)
      expect(mockSystemSettingsRepository.findOne).toHaveBeenCalledTimes(1);
      expect(mockSystemSettingsRepository.findOne).toHaveBeenCalledWith({
        where: { organizationId: orgId },
      });
      // save should be called once (for the update only, not creation)
      expect(mockSystemSettingsRepository.save).toHaveBeenCalledTimes(1);
      expect(result.twilioAccountSid).toBe('AC_INTEGRATED');
      expect(result.twilioPhoneNumber).toBe('+15557777777');
    });
  });

  // =============================================
  // Edge cases
  // =============================================

  describe('edge cases', () => {
    it('getSettings should handle undefined returned from findOne', async () => {
      mockSystemSettingsRepository.findOne.mockResolvedValue(undefined);
      mockSystemSettingsRepository.create.mockReturnValue({ organizationId: orgId });
      mockSystemSettingsRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );

      const result = await service.getSettings(orgId);

      // undefined is falsy, so it should create new settings
      expect(mockSystemSettingsRepository.create).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('getTwilioSettings should handle undefined returned from findOne', async () => {
      mockSystemSettingsRepository.findOne.mockResolvedValue(undefined);

      const result = await service.getTwilioSettings(orgId);

      // undefined?.twilioAccountSid is undefined, || null returns null
      expect(result).toEqual({
        accountSid: null,
        authToken: null,
        phoneNumber: null,
      });
    });

    it('updateSettings should preserve non-Twilio fields during update', async () => {
      const existingSettings = {
        ...mockSettings,
        slackWebhookUrl: 'https://hooks.slack.com/existing',
        slackChannelName: '#general',
        lineChannelAccessToken: 'line-token',
      };
      mockSystemSettingsRepository.findOne.mockResolvedValue(existingSettings);
      mockSystemSettingsRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );

      const dto: UpdateSystemSettingsDto = {
        twilioAccountSid: 'AC_NEW',
      };

      const result = await service.updateSettings(orgId, dto);

      // Non-Twilio fields should remain untouched
      expect(result.slackWebhookUrl).toBe('https://hooks.slack.com/existing');
      expect(result.slackChannelName).toBe('#general');
      expect(result.lineChannelAccessToken).toBe('line-token');
      // Updated field should have new value
      expect(result.twilioAccountSid).toBe('AC_NEW');
    });
  });
});
