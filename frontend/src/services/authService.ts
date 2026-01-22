import { api, ApiResponse } from './api';
import type { User, LoginInput } from '@/types';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

interface ForgotPasswordInput {
  email: string;
}

interface ResetPasswordInput {
  token: string;
  newPassword: string;
}

interface MessageResponse {
  message: string;
}

interface TokenValidationResponse {
  valid: boolean;
}

interface UpdateProfileInput {
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
}

export const authService = {
  login: (credentials: LoginInput) =>
    api.post<ApiResponse<LoginResponse>>('/auth/login', credentials, true),

  register: (data: RegisterInput) =>
    api.post<ApiResponse<LoginResponse>>('/auth/register', data, true),

  logout: () => api.post<void>('/auth/logout'),

  getCurrentUser: () => api.get<ApiResponse<User>>('/auth/me'),

  updateProfile: (data: UpdateProfileInput) =>
    api.patch<ApiResponse<User>>('/auth/me', data),

  refreshToken: (refreshToken: string) =>
    api.post<ApiResponse<AuthTokens>>('/auth/refresh', { refreshToken }, true),

  forgotPassword: (data: ForgotPasswordInput) =>
    api.post<MessageResponse>('/auth/forgot-password', data, true),

  resetPassword: (data: ResetPasswordInput) =>
    api.post<MessageResponse>('/auth/reset-password', data, true),

  validateResetToken: (token: string) =>
    api.post<TokenValidationResponse>('/auth/validate-reset-token', { token }, true),
};
