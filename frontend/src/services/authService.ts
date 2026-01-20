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

export const authService = {
  login: (credentials: LoginInput) =>
    api.post<ApiResponse<LoginResponse>>('/auth/login', credentials, true),

  register: (data: RegisterInput) =>
    api.post<ApiResponse<LoginResponse>>('/auth/register', data, true),

  logout: () => api.post<void>('/auth/logout'),

  getCurrentUser: () => api.get<ApiResponse<User>>('/auth/me'),

  refreshToken: (refreshToken: string) =>
    api.post<ApiResponse<AuthTokens>>('/auth/refresh', { refreshToken }, true),
};
