import { supabase } from '@/lib/supabase';
import type { ProjectFile, SignedUrlResponse, FileCategory } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/v1`
  : '/api/v1';

// バックエンドAPIのラップされたレスポンス形式
interface BackendApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

async function getAccessToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getAccessToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const fileService = {
  /**
   * Upload a file
   */
  uploadFile: async (
    file: File,
    projectId: string,
    taskId?: string,
    category?: FileCategory
  ): Promise<ProjectFile> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('projectId', projectId);
    if (taskId) {
      formData.append('taskId', taskId);
    }
    if (category) {
      formData.append('category', category);
    }

    const headers = await getAuthHeaders();

    const response = await fetch(`${API_BASE_URL}/files/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'ファイルのアップロードに失敗しました');
    }

    const result: BackendApiResponse<ProjectFile> = await response.json();
    return result.data;
  },

  /**
   * Get files for a project
   */
  getFilesByProject: async (projectId: string): Promise<ProjectFile[]> => {
    const headers = await getAuthHeaders();
    headers['Content-Type'] = 'application/json';

    const response = await fetch(`${API_BASE_URL}/projects/${projectId}/files`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'ファイルの取得に失敗しました');
    }

    const result: BackendApiResponse<ProjectFile[]> = await response.json();
    return result.data;
  },

  /**
   * Get files for a task
   */
  getFilesByTask: async (taskId: string): Promise<ProjectFile[]> => {
    const headers = await getAuthHeaders();
    headers['Content-Type'] = 'application/json';

    const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/files`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'ファイルの取得に失敗しました');
    }

    const result: BackendApiResponse<ProjectFile[]> = await response.json();
    return result.data;
  },

  /**
   * Get file by ID
   */
  getFile: async (fileId: string): Promise<ProjectFile> => {
    const headers = await getAuthHeaders();
    headers['Content-Type'] = 'application/json';

    const response = await fetch(`${API_BASE_URL}/files/${fileId}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'ファイルの取得に失敗しました');
    }

    const result: BackendApiResponse<ProjectFile> = await response.json();
    return result.data;
  },

  /**
   * Delete a file
   */
  deleteFile: async (fileId: string): Promise<void> => {
    const headers = await getAuthHeaders();
    headers['Content-Type'] = 'application/json';

    const response = await fetch(`${API_BASE_URL}/files/${fileId}`, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok && response.status !== 204) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'ファイルの削除に失敗しました');
    }
  },

  /**
   * Get signed download URL
   */
  getDownloadUrl: async (
    fileId: string,
    expiresIn?: number
  ): Promise<SignedUrlResponse> => {
    const headers = await getAuthHeaders();
    headers['Content-Type'] = 'application/json';

    const queryParams = expiresIn ? `?expiresIn=${expiresIn}` : '';
    const response = await fetch(
      `${API_BASE_URL}/files/${fileId}/download${queryParams}`,
      {
        method: 'GET',
        headers,
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'ダウンロードURLの取得に失敗しました');
    }

    const result: BackendApiResponse<SignedUrlResponse> = await response.json();
    return result.data;
  },
};
