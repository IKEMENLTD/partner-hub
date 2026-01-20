import { useAuthStore } from '@/store';
import type { ApiResponse, PaginatedResponse } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/v1`
  : '/api/v1';

// Error types for better error handling
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NetworkError extends Error {
  constructor(message: string = 'ネットワークエラーが発生しました') {
    super(message);
    this.name = 'NetworkError';
  }
}

export class RateLimitError extends ApiError {
  constructor(
    public retryAfter: number = 60,
    message: string = 'リクエスト制限に達しました。しばらくしてから再試行してください。'
  ) {
    super(429, message, 'RATE_LIMIT_EXCEEDED');
    this.name = 'RateLimitError';
  }
}

// Token refresh state to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(callback: (token: string) => void): void {
  refreshSubscribers.push(callback);
}

function onTokenRefreshed(newToken: string): void {
  refreshSubscribers.forEach((callback) => callback(newToken));
  refreshSubscribers = [];
}

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken, updateTokens, logout } = useAuthStore.getState();

  if (!refreshToken) {
    logout();
    return null;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      logout();
      return null;
    }

    const data = await response.json();
    const newToken = data.data?.accessToken || data.data?.token;
    const newRefreshToken = data.data?.refreshToken;

    if (newToken) {
      updateTokens(newToken, newRefreshToken);
      return newToken;
    }

    logout();
    return null;
  } catch {
    logout();
    return null;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  skipAuth = false
): Promise<T> {
  const { token, logout } = useAuthStore.getState();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token && !skipAuth) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    // Handle 429 Rate Limit
    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
      throw new RateLimitError(retryAfter);
    }

    // Handle 401 Unauthorized with token refresh
    if (response.status === 401 && token && !skipAuth) {
      if (!isRefreshing) {
        isRefreshing = true;

        const newToken = await refreshAccessToken();

        isRefreshing = false;

        if (newToken) {
          onTokenRefreshed(newToken);

          // Retry original request with new token
          (headers as Record<string, string>)['Authorization'] = `Bearer ${newToken}`;
          const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers,
          });

          if (retryResponse.status === 204) {
            return undefined as T;
          }

          if (!retryResponse.ok) {
            const errorData = await retryResponse.json().catch(() => ({}));
            throw new ApiError(
              retryResponse.status,
              errorData.message || `HTTP error! status: ${retryResponse.status}`,
              errorData.code,
              errorData.details
            );
          }

          return retryResponse.json();
        } else {
          throw new ApiError(401, '認証の有効期限が切れました。再度ログインしてください。', 'SESSION_EXPIRED');
        }
      } else {
        // Wait for the refresh to complete
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh(async (newToken: string) => {
            try {
              (headers as Record<string, string>)['Authorization'] = `Bearer ${newToken}`;
              const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, {
                ...options,
                headers,
              });

              if (retryResponse.status === 204) {
                resolve(undefined as T);
                return;
              }

              if (!retryResponse.ok) {
                const errorData = await retryResponse.json().catch(() => ({}));
                reject(new ApiError(
                  retryResponse.status,
                  errorData.message || `HTTP error! status: ${retryResponse.status}`,
                  errorData.code,
                  errorData.details
                ));
                return;
              }

              resolve(retryResponse.json());
            } catch (error) {
              reject(error);
            }
          });
        });
      }
    }

    // Handle other errors
    if (!response.ok) {
      if (response.status === 401) {
        logout();
      }

      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        response.status,
        errorData.message || getDefaultErrorMessage(response.status),
        errorData.code,
        errorData.details
      );
    }

    return response.json();
  } catch (error) {
    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new NetworkError();
    }

    // Re-throw ApiError and RateLimitError
    if (error instanceof ApiError) {
      throw error;
    }

    // Unknown error
    throw new NetworkError('予期しないエラーが発生しました');
  }
}

function getDefaultErrorMessage(status: number): string {
  switch (status) {
    case 400:
      return '入力内容に誤りがあります';
    case 401:
      return '認証が必要です';
    case 403:
      return 'アクセス権限がありません';
    case 404:
      return 'リソースが見つかりません';
    case 409:
      return '既に存在するデータです';
    case 422:
      return 'バリデーションエラーです';
    case 500:
      return 'サーバーエラーが発生しました';
    case 502:
    case 503:
    case 504:
      return 'サーバーが一時的に利用できません';
    default:
      return `エラーが発生しました (${status})`;
  }
}

// バックエンドAPIのラップされたレスポンス形式
interface BackendApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// バックエンドのページネーション付きレスポンス形式
interface BackendPaginatedData<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// バックエンドのページネーションレスポンスをフロントエンドの形式に変換
export function transformPaginatedResponse<T>(
  response: BackendApiResponse<BackendPaginatedData<T>>
): PaginatedResponse<T> {
  return {
    data: response.data.data,
    total: response.data.meta.total,
    page: response.data.meta.page,
    pageSize: response.data.meta.limit,
    totalPages: response.data.meta.totalPages,
  };
}

// 単一データレスポンスからdataを抽出
export function extractData<T>(response: BackendApiResponse<T>): T {
  return response.data;
}

export const api = {
  get: <T>(endpoint: string, skipAuth = false) =>
    request<T>(endpoint, { method: 'GET' }, skipAuth),

  post: <T>(endpoint: string, data?: unknown, skipAuth = false) =>
    request<T>(
      endpoint,
      {
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined,
      },
      skipAuth
    ),

  put: <T>(endpoint: string, data?: unknown, skipAuth = false) =>
    request<T>(
      endpoint,
      {
        method: 'PUT',
        body: data ? JSON.stringify(data) : undefined,
      },
      skipAuth
    ),

  patch: <T>(endpoint: string, data?: unknown, skipAuth = false) =>
    request<T>(
      endpoint,
      {
        method: 'PATCH',
        body: data ? JSON.stringify(data) : undefined,
      },
      skipAuth
    ),

  delete: <T>(endpoint: string, skipAuth = false) =>
    request<T>(endpoint, { method: 'DELETE' }, skipAuth),
};

export type { ApiResponse, PaginatedResponse };
