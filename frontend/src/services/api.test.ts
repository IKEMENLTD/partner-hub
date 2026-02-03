import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api, ApiError, NetworkError, RateLimitError, transformPaginatedResponse, extractData } from './api';

// Mock modules
vi.mock('@/store', () => ({
  useAuthStore: {
    getState: vi.fn(() => ({
      session: { access_token: 'test-token' },
      logout: vi.fn(),
    })),
  },
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      refreshSession: vi.fn(),
    },
  },
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('api.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('ApiError class', () => {
    it('should create ApiError with correct properties', () => {
      const error = new ApiError(400, 'Bad Request', 'VALIDATION_ERROR', { field: 'email' });

      expect(error.name).toBe('ApiError');
      expect(error.status).toBe(400);
      expect(error.message).toBe('Bad Request');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.details).toEqual({ field: 'email' });
    });

    it('should create ApiError without optional properties', () => {
      const error = new ApiError(500, 'Server Error');

      expect(error.status).toBe(500);
      expect(error.message).toBe('Server Error');
      expect(error.code).toBeUndefined();
      expect(error.details).toBeUndefined();
    });

    it('should be instanceof Error', () => {
      const error = new ApiError(400, 'Test');
      expect(error instanceof Error).toBe(true);
    });
  });

  describe('NetworkError class', () => {
    it('should create NetworkError with default message', () => {
      const error = new NetworkError();

      expect(error.name).toBe('NetworkError');
      expect(error.message).toBe('ネットワークエラーが発生しました');
    });

    it('should create NetworkError with custom message', () => {
      const error = new NetworkError('Custom network error');

      expect(error.message).toBe('Custom network error');
    });

    it('should be instanceof Error', () => {
      const error = new NetworkError();
      expect(error instanceof Error).toBe(true);
    });
  });

  describe('RateLimitError class', () => {
    it('should create RateLimitError with default values', () => {
      const error = new RateLimitError();

      expect(error.name).toBe('RateLimitError');
      expect(error.status).toBe(429);
      expect(error.retryAfter).toBe(60);
      expect(error.message).toBe('リクエスト制限に達しました。しばらくしてから再試行してください。');
    });

    it('should create RateLimitError with custom values', () => {
      const error = new RateLimitError(120, 'Custom rate limit message');

      expect(error.retryAfter).toBe(120);
      expect(error.message).toBe('Custom rate limit message');
    });

    it('should be instanceof ApiError', () => {
      const error = new RateLimitError();
      expect(error instanceof ApiError).toBe(true);
    });
  });

  describe('api.get', () => {
    it('should make GET request with authorization header', async () => {
      const mockResponse = { success: true, data: { id: '1', name: 'Test' } };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await api.get('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
          }),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should make GET request without authorization when skipAuth is true', async () => {
      const mockResponse = { success: true };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      await api.get('/public', true);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/public'),
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should handle 204 No Content response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      const result = await api.get('/test');

      expect(result).toBeUndefined();
    });

    it('should throw ApiError on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: 'Bad Request', code: 'INVALID_INPUT' }),
      });

      await expect(api.get('/test')).rejects.toThrow(ApiError);
    });

    it('should throw RateLimitError on 429 response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: {
          get: (name: string) => (name === 'Retry-After' ? '30' : null),
        },
      });

      await expect(api.get('/test')).rejects.toThrow(RateLimitError);
    });

    it('should parse Retry-After header correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: {
          get: (name: string) => (name === 'Retry-After' ? '120' : null),
        },
      });

      try {
        await api.get('/test');
      } catch (e) {
        expect(e).toBeInstanceOf(RateLimitError);
        expect((e as RateLimitError).retryAfter).toBe(120);
      }
    });
  });

  describe('api.post', () => {
    it('should make POST request with body', async () => {
      const mockResponse = { success: true, data: { id: '1' } };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      const postData = { name: 'Test', email: 'test@example.com' };
      const result = await api.post('/test', postData);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(postData),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should make POST request without body', async () => {
      const mockResponse = { success: true };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      await api.post('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        expect.objectContaining({
          method: 'POST',
          body: undefined,
        })
      );
    });

    it('should handle complex nested objects', async () => {
      const mockResponse = { success: true };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      const complexData = {
        user: { name: 'Test', email: 'test@example.com' },
        items: [{ id: 1 }, { id: 2 }],
        metadata: { nested: { deep: true } },
      };

      await api.post('/test', complexData);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify(complexData),
        })
      );
    });
  });

  describe('api.put', () => {
    it('should make PUT request with body', async () => {
      const mockResponse = { success: true, data: { id: '1', updated: true } };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      const putData = { name: 'Updated' };
      const result = await api.put('/test/1', putData);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/test/1'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(putData),
        })
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('api.patch', () => {
    it('should make PATCH request with body', async () => {
      const mockResponse = { success: true, data: { id: '1', patched: true } };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      const patchData = { name: 'Patched' };
      const result = await api.patch('/test/1', patchData);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/test/1'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(patchData),
        })
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('api.delete', () => {
    it('should make DELETE request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      const result = await api.delete('/test/1');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/test/1'),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
      expect(result).toBeUndefined();
    });

    it('should handle DELETE with 200 response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, message: 'Deleted' }),
      });

      const result = await api.delete('/test/1');

      expect(result).toEqual({ success: true, message: 'Deleted' });
    });
  });

  describe('transformPaginatedResponse', () => {
    it('should transform backend paginated response to frontend format', () => {
      const backendResponse = {
        success: true,
        data: {
          data: [{ id: '1' }, { id: '2' }],
          meta: {
            total: 100,
            page: 1,
            limit: 10,
            totalPages: 10,
          },
        },
      };

      const result = transformPaginatedResponse(backendResponse);

      expect(result).toEqual({
        data: [{ id: '1' }, { id: '2' }],
        total: 100,
        page: 1,
        pageSize: 10,
        totalPages: 10,
      });
    });

    it('should handle empty data array', () => {
      const backendResponse = {
        success: true,
        data: {
          data: [],
          meta: {
            total: 0,
            page: 1,
            limit: 10,
            totalPages: 0,
          },
        },
      };

      const result = transformPaginatedResponse(backendResponse);

      expect(result).toEqual({
        data: [],
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 0,
      });
    });

    it('should handle large page numbers', () => {
      const backendResponse = {
        success: true,
        data: {
          data: [{ id: '999' }],
          meta: {
            total: 10000,
            page: 100,
            limit: 100,
            totalPages: 100,
          },
        },
      };

      const result = transformPaginatedResponse(backendResponse);

      expect(result.page).toBe(100);
      expect(result.totalPages).toBe(100);
    });
  });

  describe('extractData', () => {
    it('should extract data from backend response', () => {
      const backendResponse = {
        success: true,
        data: { id: '1', name: 'Test' },
      };

      const result = extractData(backendResponse);

      expect(result).toEqual({ id: '1', name: 'Test' });
    });

    it('should handle null data', () => {
      const backendResponse = {
        success: true,
        data: null,
      };

      const result = extractData(backendResponse);

      expect(result).toBeNull();
    });

    it('should handle array data', () => {
      const backendResponse = {
        success: true,
        data: [{ id: '1' }, { id: '2' }],
      };

      const result = extractData(backendResponse);

      expect(result).toEqual([{ id: '1' }, { id: '2' }]);
    });
  });

  describe('Error handling - Default messages', () => {
    it('should handle 400 Bad Request with default message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({}),
      });

      try {
        await api.get('/test');
      } catch (e) {
        expect(e).toBeInstanceOf(ApiError);
        expect((e as ApiError).message).toBe('入力内容に誤りがあります');
      }
    });

    it('should handle 403 Forbidden with default message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: () => Promise.resolve({}),
      });

      try {
        await api.get('/test');
      } catch (e) {
        expect(e).toBeInstanceOf(ApiError);
        expect((e as ApiError).message).toBe('アクセス権限がありません');
      }
    });

    it('should handle 404 Not Found with default message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({}),
      });

      try {
        await api.get('/test');
      } catch (e) {
        expect(e).toBeInstanceOf(ApiError);
        expect((e as ApiError).message).toBe('リソースが見つかりません');
      }
    });

    it('should handle 409 Conflict with default message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: () => Promise.resolve({}),
      });

      try {
        await api.get('/test');
      } catch (e) {
        expect(e).toBeInstanceOf(ApiError);
        expect((e as ApiError).message).toBe('既に存在するデータです');
      }
    });

    it('should handle 422 Unprocessable Entity with default message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: () => Promise.resolve({}),
      });

      try {
        await api.get('/test');
      } catch (e) {
        expect(e).toBeInstanceOf(ApiError);
        expect((e as ApiError).message).toBe('バリデーションエラーです');
      }
    });

    it('should handle 500 Server Error with default message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
      });

      try {
        await api.get('/test');
      } catch (e) {
        expect(e).toBeInstanceOf(ApiError);
        expect((e as ApiError).message).toBe('サーバーエラーが発生しました');
      }
    });

    it('should handle 502/503/504 with default message', async () => {
      for (const status of [502, 503, 504]) {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status,
          json: () => Promise.resolve({}),
        });

        try {
          await api.get('/test');
        } catch (e) {
          expect(e).toBeInstanceOf(ApiError);
          expect((e as ApiError).message).toBe('サーバーが一時的に利用できません');
        }
      }
    });

    it('should handle unknown status with default message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 418,
        json: () => Promise.resolve({}),
      });

      try {
        await api.get('/test');
      } catch (e) {
        expect(e).toBeInstanceOf(ApiError);
        expect((e as ApiError).message).toBe('エラーが発生しました (418)');
      }
    });

    it('should handle JSON parse error in error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      try {
        await api.get('/test');
      } catch (e) {
        expect(e).toBeInstanceOf(ApiError);
        expect((e as ApiError).message).toBe('サーバーエラーが発生しました');
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle empty response body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(null),
      });

      const result = await api.get('/test');

      expect(result).toBeNull();
    });

    it('should handle array response', async () => {
      const mockArray = [{ id: '1' }, { id: '2' }];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockArray),
      });

      const result = await api.get('/test');

      expect(result).toEqual(mockArray);
    });

    it('should handle unicode in request body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
      });

      const unicodeData = { name: '日本語テスト', description: '漢字とひらがな' };
      await api.post('/test', unicodeData);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify(unicodeData),
        })
      );
    });
  });

  describe('Boundary values', () => {
    it('should handle zero as a valid value in request body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
      });

      const dataWithZero = { count: 0, amount: 0.0 };
      await api.post('/test', dataWithZero);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify(dataWithZero),
        })
      );
    });

    it('should handle boolean values in request body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
      });

      const dataWithBooleans = { active: true, deleted: false };
      await api.post('/test', dataWithBooleans);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify(dataWithBooleans),
        })
      );
    });

    it('should handle empty object in request body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
      });

      await api.post('/test', {});

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: '{}',
        })
      );
    });

    it('should handle empty array in request body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
      });

      await api.post('/test', []);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: '[]',
        })
      );
    });
  });
});
