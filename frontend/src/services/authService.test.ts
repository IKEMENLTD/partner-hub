import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { authService } from './authService';
import { api } from './api';

// Mock api module
vi.mock('./api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  transformPaginatedResponse: vi.fn((response) => {
    const { pagination } = response.data;
    const page = Math.floor(pagination.offset / pagination.limit) + 1;
    const totalPages = Math.ceil(pagination.total / pagination.limit);
    return {
      data: response.data.data,
      total: pagination.total,
      page,
      pageSize: pagination.limit,
      totalPages,
    };
  }),
  extractData: vi.fn((response) => response.data),
}));

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('login', () => {
    it('should login with valid credentials', async () => {
      const mockLoginResponse = {
        success: true,
        data: {
          user: {
            id: 'user-1',
            email: 'test@example.com',
            firstName: '太郎',
            lastName: '山田',
            role: 'admin',
            isActive: true,
            createdAt: '2024-01-01T00:00:00Z',
          },
          tokens: {
            accessToken: 'access-token-123',
            refreshToken: 'refresh-token-456',
          },
        },
      };

      vi.mocked(api.post).mockResolvedValueOnce(mockLoginResponse);

      const result = await authService.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(api.post).toHaveBeenCalledWith(
        '/auth/login',
        { email: 'test@example.com', password: 'password123' },
        true
      );
      expect(result).toEqual(mockLoginResponse);
    });

    it('should handle invalid credentials', async () => {
      vi.mocked(api.post).mockRejectedValueOnce(new Error('Invalid credentials'));

      await expect(
        authService.login({ email: 'wrong@example.com', password: 'wrongpass' })
      ).rejects.toThrow('Invalid credentials');
    });

    it('should handle network error during login', async () => {
      vi.mocked(api.post).mockRejectedValueOnce(new Error('Network error'));

      await expect(
        authService.login({ email: 'test@example.com', password: 'password123' })
      ).rejects.toThrow('Network error');
    });

    it('should handle rate limit error during login', async () => {
      vi.mocked(api.post).mockRejectedValueOnce(new Error('Too many requests'));

      await expect(
        authService.login({ email: 'test@example.com', password: 'password123' })
      ).rejects.toThrow('Too many requests');
    });

    it('should pass skipAuth=true for login', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({
        success: true,
        data: {
          user: { id: 'user-1', email: 'test@example.com' },
          tokens: { accessToken: 'token', refreshToken: 'refresh' },
        },
      });

      await authService.login({ email: 'test@example.com', password: 'pass' });

      expect(api.post).toHaveBeenCalledWith('/auth/login', expect.any(Object), true);
    });
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const registerData = {
        email: 'newuser@example.com',
        password: 'securepassword123',
        firstName: '花子',
        lastName: '田中',
      };

      const mockResponse = {
        success: true,
        data: {
          user: {
            id: 'user-new',
            email: 'newuser@example.com',
            firstName: '花子',
            lastName: '田中',
            role: 'member',
            isActive: true,
            createdAt: '2024-06-15T00:00:00Z',
          },
          tokens: {
            accessToken: 'new-access-token',
            refreshToken: 'new-refresh-token',
          },
        },
      };

      vi.mocked(api.post).mockResolvedValueOnce(mockResponse);

      const result = await authService.register(registerData);

      expect(api.post).toHaveBeenCalledWith('/auth/register', registerData, true);
      expect(result).toEqual(mockResponse);
    });

    it('should handle duplicate email error', async () => {
      vi.mocked(api.post).mockRejectedValueOnce(new Error('Email already exists'));

      await expect(
        authService.register({
          email: 'existing@example.com',
          password: 'password123',
          firstName: 'Test',
          lastName: 'User',
        })
      ).rejects.toThrow('Email already exists');
    });

    it('should handle validation error on register', async () => {
      vi.mocked(api.post).mockRejectedValueOnce(new Error('Validation error'));

      await expect(
        authService.register({
          email: 'invalid-email',
          password: 'short',
          firstName: '',
          lastName: '',
        })
      ).rejects.toThrow('Validation error');
    });

    it('should pass skipAuth=true for register', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({
        success: true,
        data: {
          user: { id: 'user-1' },
          tokens: { accessToken: 'token', refreshToken: 'refresh' },
        },
      });

      await authService.register({
        email: 'test@example.com',
        password: 'pass123',
        firstName: 'Test',
        lastName: 'User',
      });

      expect(api.post).toHaveBeenCalledWith('/auth/register', expect.any(Object), true);
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      vi.mocked(api.post).mockResolvedValueOnce(undefined);

      await authService.logout();

      expect(api.post).toHaveBeenCalledWith('/auth/logout');
    });

    it('should handle logout error gracefully', async () => {
      vi.mocked(api.post).mockRejectedValueOnce(new Error('Server error'));

      await expect(authService.logout()).rejects.toThrow('Server error');
    });

    it('should not pass skipAuth for logout', async () => {
      vi.mocked(api.post).mockResolvedValueOnce(undefined);

      await authService.logout();

      // logout does not pass skipAuth (no third argument)
      expect(api.post).toHaveBeenCalledWith('/auth/logout');
    });
  });

  describe('getCurrentUser', () => {
    it('should fetch current user profile', async () => {
      const mockUser = {
        success: true,
        data: {
          id: 'user-1',
          email: 'test@example.com',
          firstName: '太郎',
          lastName: '山田',
          role: 'admin',
          isActive: true,
          avatarUrl: 'https://example.com/avatar.jpg',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-06-15T00:00:00Z',
        },
      };

      vi.mocked(api.get).mockResolvedValueOnce(mockUser);

      const result = await authService.getCurrentUser();

      expect(api.get).toHaveBeenCalledWith('/auth/me');
      expect(result).toEqual(mockUser);
    });

    it('should handle unauthorized error', async () => {
      vi.mocked(api.get).mockRejectedValueOnce(new Error('Unauthorized'));

      await expect(authService.getCurrentUser()).rejects.toThrow('Unauthorized');
    });

    it('should handle expired session', async () => {
      vi.mocked(api.get).mockRejectedValueOnce(new Error('Session expired'));

      await expect(authService.getCurrentUser()).rejects.toThrow('Session expired');
    });
  });

  describe('updateProfile', () => {
    it('should update profile with all fields', async () => {
      const updateData = {
        firstName: '次郎',
        lastName: '佐藤',
        avatarUrl: 'https://example.com/new-avatar.jpg',
      };

      const mockUpdatedUser = {
        success: true,
        data: {
          id: 'user-1',
          email: 'test@example.com',
          ...updateData,
          role: 'admin',
          isActive: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-06-15T12:00:00Z',
        },
      };

      vi.mocked(api.patch).mockResolvedValueOnce(mockUpdatedUser);

      const result = await authService.updateProfile(updateData);

      expect(api.patch).toHaveBeenCalledWith('/auth/me', updateData);
      expect(result).toEqual(mockUpdatedUser);
    });

    it('should update only first name', async () => {
      const updateData = { firstName: '三郎' };

      vi.mocked(api.patch).mockResolvedValueOnce({
        success: true,
        data: { id: 'user-1', firstName: '三郎' },
      });

      await authService.updateProfile(updateData);

      expect(api.patch).toHaveBeenCalledWith('/auth/me', { firstName: '三郎' });
    });

    it('should update only last name', async () => {
      const updateData = { lastName: '鈴木' };

      vi.mocked(api.patch).mockResolvedValueOnce({
        success: true,
        data: { id: 'user-1', lastName: '鈴木' },
      });

      await authService.updateProfile(updateData);

      expect(api.patch).toHaveBeenCalledWith('/auth/me', { lastName: '鈴木' });
    });

    it('should update only avatar URL', async () => {
      const updateData = { avatarUrl: 'https://example.com/avatar-v2.png' };

      vi.mocked(api.patch).mockResolvedValueOnce({
        success: true,
        data: { id: 'user-1', avatarUrl: 'https://example.com/avatar-v2.png' },
      });

      await authService.updateProfile(updateData);

      expect(api.patch).toHaveBeenCalledWith('/auth/me', updateData);
    });

    it('should handle validation error on profile update', async () => {
      vi.mocked(api.patch).mockRejectedValueOnce(new Error('Invalid avatar URL'));

      await expect(
        authService.updateProfile({ avatarUrl: 'not-a-url' })
      ).rejects.toThrow('Invalid avatar URL');
    });

    it('should handle unauthorized error on profile update', async () => {
      vi.mocked(api.patch).mockRejectedValueOnce(new Error('Unauthorized'));

      await expect(
        authService.updateProfile({ firstName: 'Test' })
      ).rejects.toThrow('Unauthorized');
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
        },
      };

      vi.mocked(api.post).mockResolvedValueOnce(mockResponse);

      const result = await authService.refreshToken('old-refresh-token');

      expect(api.post).toHaveBeenCalledWith(
        '/auth/refresh',
        { refreshToken: 'old-refresh-token' },
        true
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle expired refresh token', async () => {
      vi.mocked(api.post).mockRejectedValueOnce(new Error('Refresh token expired'));

      await expect(
        authService.refreshToken('expired-token')
      ).rejects.toThrow('Refresh token expired');
    });

    it('should handle invalid refresh token', async () => {
      vi.mocked(api.post).mockRejectedValueOnce(new Error('Invalid refresh token'));

      await expect(
        authService.refreshToken('invalid-token')
      ).rejects.toThrow('Invalid refresh token');
    });

    it('should pass skipAuth=true for refresh', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({
        success: true,
        data: { accessToken: 'new', refreshToken: 'new-refresh' },
      });

      await authService.refreshToken('some-token');

      expect(api.post).toHaveBeenCalledWith('/auth/refresh', expect.any(Object), true);
    });
  });

  describe('forgotPassword', () => {
    it('should send forgot password email', async () => {
      const mockResponse = { message: 'パスワードリセットメールを送信しました' };

      vi.mocked(api.post).mockResolvedValueOnce(mockResponse);

      const result = await authService.forgotPassword({ email: 'test@example.com' });

      expect(api.post).toHaveBeenCalledWith(
        '/auth/forgot-password',
        { email: 'test@example.com' },
        true
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle nonexistent email gracefully', async () => {
      // Usually returns success even for nonexistent emails (security best practice)
      const mockResponse = { message: 'パスワードリセットメールを送信しました' };

      vi.mocked(api.post).mockResolvedValueOnce(mockResponse);

      const result = await authService.forgotPassword({ email: 'nonexistent@example.com' });

      expect(result.message).toBeTruthy();
    });

    it('should handle rate limit on forgot password', async () => {
      vi.mocked(api.post).mockRejectedValueOnce(new Error('Too many requests'));

      await expect(
        authService.forgotPassword({ email: 'test@example.com' })
      ).rejects.toThrow('Too many requests');
    });

    it('should pass skipAuth=true for forgot password', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({ message: 'Sent' });

      await authService.forgotPassword({ email: 'test@example.com' });

      expect(api.post).toHaveBeenCalledWith('/auth/forgot-password', expect.any(Object), true);
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      const mockResponse = { message: 'パスワードがリセットされました' };

      vi.mocked(api.post).mockResolvedValueOnce(mockResponse);

      const result = await authService.resetPassword({
        token: 'valid-reset-token-123',
        newPassword: 'newSecurePassword456',
      });

      expect(api.post).toHaveBeenCalledWith(
        '/auth/reset-password',
        { token: 'valid-reset-token-123', newPassword: 'newSecurePassword456' },
        true
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle expired reset token', async () => {
      vi.mocked(api.post).mockRejectedValueOnce(new Error('Reset token expired'));

      await expect(
        authService.resetPassword({
          token: 'expired-token',
          newPassword: 'newPassword123',
        })
      ).rejects.toThrow('Reset token expired');
    });

    it('should handle invalid reset token', async () => {
      vi.mocked(api.post).mockRejectedValueOnce(new Error('Invalid reset token'));

      await expect(
        authService.resetPassword({
          token: 'invalid-token',
          newPassword: 'newPassword123',
        })
      ).rejects.toThrow('Invalid reset token');
    });

    it('should handle weak password validation', async () => {
      vi.mocked(api.post).mockRejectedValueOnce(
        new Error('Password does not meet requirements')
      );

      await expect(
        authService.resetPassword({
          token: 'valid-token',
          newPassword: '123',
        })
      ).rejects.toThrow('Password does not meet requirements');
    });

    it('should pass skipAuth=true for reset password', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({ message: 'Reset success' });

      await authService.resetPassword({ token: 'tok', newPassword: 'newpass' });

      expect(api.post).toHaveBeenCalledWith('/auth/reset-password', expect.any(Object), true);
    });
  });

  describe('validateResetToken', () => {
    it('should validate a valid reset token', async () => {
      const mockResponse = { valid: true };

      vi.mocked(api.post).mockResolvedValueOnce(mockResponse);

      const result = await authService.validateResetToken('valid-token-123');

      expect(api.post).toHaveBeenCalledWith(
        '/auth/validate-reset-token',
        { token: 'valid-token-123' },
        true
      );
      expect(result).toEqual({ valid: true });
    });

    it('should return invalid for expired token', async () => {
      const mockResponse = { valid: false };

      vi.mocked(api.post).mockResolvedValueOnce(mockResponse);

      const result = await authService.validateResetToken('expired-token');

      expect(result.valid).toBe(false);
    });

    it('should handle API error during token validation', async () => {
      vi.mocked(api.post).mockRejectedValueOnce(new Error('Server error'));

      await expect(
        authService.validateResetToken('some-token')
      ).rejects.toThrow('Server error');
    });

    it('should pass skipAuth=true for token validation', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({ valid: true });

      await authService.validateResetToken('token-abc');

      expect(api.post).toHaveBeenCalledWith(
        '/auth/validate-reset-token',
        expect.any(Object),
        true
      );
    });
  });

  describe('Edge cases', () => {
    it('should handle login with email containing special characters', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({
        success: true,
        data: {
          user: { id: 'user-1', email: 'user+tag@example.com' },
          tokens: { accessToken: 'token', refreshToken: 'refresh' },
        },
      });

      await authService.login({
        email: 'user+tag@example.com',
        password: 'password',
      });

      expect(api.post).toHaveBeenCalledWith(
        '/auth/login',
        { email: 'user+tag@example.com', password: 'password' },
        true
      );
    });

    it('should handle unicode characters in profile names', async () => {
      const updateData = {
        firstName: '太郎',
        lastName: '山田',
      };

      vi.mocked(api.patch).mockResolvedValueOnce({
        success: true,
        data: { id: 'user-1', ...updateData },
      });

      await authService.updateProfile(updateData);

      expect(api.patch).toHaveBeenCalledWith('/auth/me', updateData);
    });

    it('should handle concurrent getCurrentUser calls', async () => {
      vi.mocked(api.get)
        .mockResolvedValueOnce({
          success: true,
          data: { id: 'user-1', email: 'test@example.com' },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { id: 'user-1', email: 'test@example.com' },
        });

      const [result1, result2] = await Promise.all([
        authService.getCurrentUser(),
        authService.getCurrentUser(),
      ]);

      expect(api.get).toHaveBeenCalledTimes(2);
      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });

    it('should handle login with very long password', async () => {
      const longPassword = 'a'.repeat(256);

      vi.mocked(api.post).mockResolvedValueOnce({
        success: true,
        data: {
          user: { id: 'user-1' },
          tokens: { accessToken: 'token', refreshToken: 'refresh' },
        },
      });

      await authService.login({ email: 'test@example.com', password: longPassword });

      expect(api.post).toHaveBeenCalledWith(
        '/auth/login',
        { email: 'test@example.com', password: longPassword },
        true
      );
    });

    it('should handle register with unicode email domain', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({
        success: true,
        data: {
          user: { id: 'user-1', email: 'test@日本語.jp' },
          tokens: { accessToken: 'token', refreshToken: 'refresh' },
        },
      });

      await authService.register({
        email: 'test@日本語.jp',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      });

      expect(api.post).toHaveBeenCalledWith(
        '/auth/register',
        {
          email: 'test@日本語.jp',
          password: 'password123',
          firstName: 'Test',
          lastName: 'User',
        },
        true
      );
    });
  });

  describe('Boundary values', () => {
    it('should handle empty string password in login', async () => {
      vi.mocked(api.post).mockRejectedValueOnce(new Error('Password is required'));

      await expect(
        authService.login({ email: 'test@example.com', password: '' })
      ).rejects.toThrow('Password is required');
    });

    it('should handle empty string email in login', async () => {
      vi.mocked(api.post).mockRejectedValueOnce(new Error('Email is required'));

      await expect(
        authService.login({ email: '', password: 'password' })
      ).rejects.toThrow('Email is required');
    });

    it('should handle very long first name in register', async () => {
      const longName = 'A'.repeat(500);

      vi.mocked(api.post).mockResolvedValueOnce({
        success: true,
        data: {
          user: { id: 'user-1', firstName: longName },
          tokens: { accessToken: 'token', refreshToken: 'refresh' },
        },
      });

      await authService.register({
        email: 'test@example.com',
        password: 'password123',
        firstName: longName,
        lastName: 'User',
      });

      expect(api.post).toHaveBeenCalledWith(
        '/auth/register',
        expect.objectContaining({ firstName: longName }),
        true
      );
    });

    it('should handle very long reset token', async () => {
      const longToken = 'x'.repeat(1024);

      vi.mocked(api.post).mockResolvedValueOnce({ valid: true });

      await authService.validateResetToken(longToken);

      expect(api.post).toHaveBeenCalledWith(
        '/auth/validate-reset-token',
        { token: longToken },
        true
      );
    });

    it('should handle profile update with empty object', async () => {
      vi.mocked(api.patch).mockResolvedValueOnce({
        success: true,
        data: { id: 'user-1' },
      });

      await authService.updateProfile({});

      expect(api.patch).toHaveBeenCalledWith('/auth/me', {});
    });

    it('should handle very long avatar URL', async () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(2000) + '.jpg';

      vi.mocked(api.patch).mockResolvedValueOnce({
        success: true,
        data: { id: 'user-1', avatarUrl: longUrl },
      });

      await authService.updateProfile({ avatarUrl: longUrl });

      expect(api.patch).toHaveBeenCalledWith('/auth/me', { avatarUrl: longUrl });
    });
  });
});
