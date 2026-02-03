import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock partnerService
vi.mock('@/services', () => ({
  partnerService: {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getProjects: vi.fn(),
  },
}));

import {
  usePartners,
  usePartner,
  usePartnerProjects,
  useCreatePartner,
  useUpdatePartner,
  useDeletePartner,
} from './usePartners';
import { partnerService } from '@/services';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('usePartners hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('usePartners', () => {
    it('should fetch partners list successfully', async () => {
      const mockPartners = {
        data: [
          { id: '1', name: 'Partner 1', email: 'partner1@example.com', status: 'active' },
          { id: '2', name: 'Partner 2', email: 'partner2@example.com', status: 'pending' },
        ],
        total: 2,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      };

      vi.mocked(partnerService.getAll).mockResolvedValueOnce(mockPartners);

      const { result } = renderHook(() => usePartners(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockPartners);
      expect(partnerService.getAll).toHaveBeenCalledWith(undefined);
    });

    it('should fetch partners with filter params', async () => {
      const mockPartners = {
        data: [{ id: '1', name: 'Active Partner', status: 'active' }],
        total: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      };

      vi.mocked(partnerService.getAll).mockResolvedValueOnce(mockPartners);

      const params = {
        status: 'active' as const,
        page: 1,
        pageSize: 10,
      };

      const { result } = renderHook(() => usePartners(params), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(partnerService.getAll).toHaveBeenCalledWith(params);
    });

    it('should fetch partners with type filter', async () => {
      const mockPartners = {
        data: [{ id: '1', name: 'Company Partner', type: 'company' }],
        total: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      };

      vi.mocked(partnerService.getAll).mockResolvedValueOnce(mockPartners);

      const params = { type: 'company' as const };
      const { result } = renderHook(() => usePartners(params), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(partnerService.getAll).toHaveBeenCalledWith(params);
    });

    it('should fetch partners with skills filter', async () => {
      const mockPartners = {
        data: [{ id: '1', name: 'Tech Partner', skills: ['React', 'TypeScript'] }],
        total: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      };

      vi.mocked(partnerService.getAll).mockResolvedValueOnce(mockPartners);

      const params = { skills: ['React', 'TypeScript'] };
      const { result } = renderHook(() => usePartners(params), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(partnerService.getAll).toHaveBeenCalledWith(params);
    });

    it('should fetch partners with search query', async () => {
      const mockPartners = {
        data: [{ id: '1', name: 'Searched Partner' }],
        total: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      };

      vi.mocked(partnerService.getAll).mockResolvedValueOnce(mockPartners);

      const params = { search: 'Searched' };
      const { result } = renderHook(() => usePartners(params), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(partnerService.getAll).toHaveBeenCalledWith(params);
    });

    it('should fetch partners with pagination', async () => {
      const mockPartners = {
        data: [{ id: '10', name: 'Partner 10' }],
        total: 100,
        page: 2,
        pageSize: 10,
        totalPages: 10,
      };

      vi.mocked(partnerService.getAll).mockResolvedValueOnce(mockPartners);

      const params = { page: 2, pageSize: 10 };
      const { result } = renderHook(() => usePartners(params), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.page).toBe(2);
      expect(result.current.data?.totalPages).toBe(10);
    });

    it('should fetch partners with sorting', async () => {
      const mockPartners = {
        data: [{ id: '1', name: 'A Partner' }],
        total: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      };

      vi.mocked(partnerService.getAll).mockResolvedValueOnce(mockPartners);

      const params = { sortField: 'name', sortOrder: 'asc' as const };
      const { result } = renderHook(() => usePartners(params), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(partnerService.getAll).toHaveBeenCalledWith(params);
    });

    it('should handle error when fetching partners', async () => {
      vi.mocked(partnerService.getAll).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => usePartners(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeDefined();
    });

    it('should handle empty partners list', async () => {
      const mockPartners = {
        data: [],
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 0,
      };

      vi.mocked(partnerService.getAll).mockResolvedValueOnce(mockPartners);

      const { result } = renderHook(() => usePartners(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.data).toHaveLength(0);
      expect(result.current.data?.total).toBe(0);
    });
  });

  describe('usePartner', () => {
    it('should fetch single partner by id', async () => {
      const mockPartner = {
        id: '1',
        name: 'Test Partner',
        email: 'partner@example.com',
        status: 'active',
        type: 'company',
      };

      vi.mocked(partnerService.getById).mockResolvedValueOnce(mockPartner);

      const { result } = renderHook(() => usePartner('1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockPartner);
      expect(partnerService.getById).toHaveBeenCalledWith('1');
    });

    it('should not fetch when id is undefined', async () => {
      const { result } = renderHook(() => usePartner(undefined), { wrapper: createWrapper() });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.fetchStatus).toBe('idle');
      expect(partnerService.getById).not.toHaveBeenCalled();
    });

    it('should handle 404 error', async () => {
      vi.mocked(partnerService.getById).mockRejectedValueOnce(
        new Error('Partner not found')
      );

      const { result } = renderHook(() => usePartner('nonexistent'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeDefined();
    });

    it('should fetch partner with all fields', async () => {
      const fullPartner = {
        id: '1',
        name: 'Full Partner',
        email: 'full@example.com',
        phone: '03-1234-5678',
        companyName: 'Company Inc.',
        type: 'company',
        status: 'active',
        description: 'Description',
        skills: ['React', 'Node.js'],
        rating: 4.5,
        totalProjects: 10,
        completedProjects: 8,
        address: 'Tokyo, Japan',
        country: 'Japan',
        timezone: 'Asia/Tokyo',
      };

      vi.mocked(partnerService.getById).mockResolvedValueOnce(fullPartner);

      const { result } = renderHook(() => usePartner('1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(fullPartner);
    });
  });

  describe('usePartnerProjects', () => {
    it('should fetch partner projects', async () => {
      const mockProjects = [
        { id: '1', name: 'Project 1', status: 'in_progress' },
        { id: '2', name: 'Project 2', status: 'completed' },
      ];

      vi.mocked(partnerService.getProjects).mockResolvedValueOnce(mockProjects);

      const { result } = renderHook(() => usePartnerProjects('partner-1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockProjects);
      expect(partnerService.getProjects).toHaveBeenCalledWith('partner-1');
    });

    it('should not fetch when partnerId is undefined', async () => {
      const { result } = renderHook(() => usePartnerProjects(undefined), { wrapper: createWrapper() });

      expect(result.current.fetchStatus).toBe('idle');
      expect(partnerService.getProjects).not.toHaveBeenCalled();
    });

    it('should handle empty projects list', async () => {
      vi.mocked(partnerService.getProjects).mockResolvedValueOnce([]);

      const { result } = renderHook(() => usePartnerProjects('partner-1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual([]);
    });

    it('should handle error when fetching partner projects', async () => {
      vi.mocked(partnerService.getProjects).mockRejectedValueOnce(
        new Error('Partner not found')
      );

      const { result } = renderHook(() => usePartnerProjects('nonexistent'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('useCreatePartner', () => {
    it('should create partner successfully', async () => {
      const newPartner = {
        id: 'new-1',
        name: 'New Partner',
        email: 'new@example.com',
        status: 'pending',
        type: 'individual',
      };

      vi.mocked(partnerService.create).mockResolvedValueOnce(newPartner);

      const { result } = renderHook(() => useCreatePartner(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({
          name: 'New Partner',
          email: 'new@example.com',
        });
      });

      expect(partnerService.create).toHaveBeenCalledWith({
        name: 'New Partner',
        email: 'new@example.com',
      });
    });

    it('should handle validation error', async () => {
      vi.mocked(partnerService.create).mockRejectedValueOnce(
        new Error('Validation error: email is required')
      );

      const { result } = renderHook(() => useCreatePartner(), { wrapper: createWrapper() });

      await expect(
        act(async () => {
          await result.current.mutateAsync({ name: 'Partner', email: '' });
        })
      ).rejects.toThrow();
    });

    it('should handle duplicate email error', async () => {
      vi.mocked(partnerService.create).mockRejectedValueOnce(
        new Error('Email already exists')
      );

      const { result } = renderHook(() => useCreatePartner(), { wrapper: createWrapper() });

      await expect(
        act(async () => {
          await result.current.mutateAsync({
            name: 'Partner',
            email: 'existing@example.com',
          });
        })
      ).rejects.toThrow();
    });

    it('should create partner with all fields', async () => {
      const fullPartner = {
        id: 'new-1',
        name: 'Full Partner',
        email: 'full@example.com',
        phone: '03-1234-5678',
        companyName: 'Company Inc.',
        type: 'company',
        status: 'pending',
        description: 'Description',
        skills: ['React', 'Node.js'],
        address: 'Tokyo, Japan',
        country: 'Japan',
        timezone: 'Asia/Tokyo',
      };

      vi.mocked(partnerService.create).mockResolvedValueOnce(fullPartner);

      const { result } = renderHook(() => useCreatePartner(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({
          name: 'Full Partner',
          email: 'full@example.com',
          phone: '03-1234-5678',
          companyName: 'Company Inc.',
          type: 'company',
          description: 'Description',
          skills: ['React', 'Node.js'],
          address: 'Tokyo, Japan',
          country: 'Japan',
          timezone: 'Asia/Tokyo',
        });
      });

      expect(partnerService.create).toHaveBeenCalled();
    });
  });

  describe('useUpdatePartner', () => {
    it('should update partner successfully', async () => {
      const updatedPartner = {
        id: '1',
        name: 'Updated Partner',
        status: 'active',
      };

      vi.mocked(partnerService.update).mockResolvedValueOnce(updatedPartner);

      const { result } = renderHook(() => useUpdatePartner(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({
          id: '1',
          data: { name: 'Updated Partner' },
        });
      });

      expect(partnerService.update).toHaveBeenCalledWith('1', { name: 'Updated Partner' });
    });

    it('should handle partial update', async () => {
      vi.mocked(partnerService.update).mockResolvedValueOnce({ id: '1', status: 'suspended' });

      const { result } = renderHook(() => useUpdatePartner(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({
          id: '1',
          data: { status: 'suspended' },
        });
      });

      expect(partnerService.update).toHaveBeenCalledWith('1', { status: 'suspended' });
    });

    it('should update partner status', async () => {
      const statuses = ['active', 'inactive', 'pending', 'suspended'] as const;

      for (const status of statuses) {
        vi.mocked(partnerService.update).mockResolvedValueOnce({ id: '1', status });

        const { result } = renderHook(() => useUpdatePartner(), { wrapper: createWrapper() });

        await act(async () => {
          await result.current.mutateAsync({
            id: '1',
            data: { status },
          });
        });

        expect(partnerService.update).toHaveBeenCalledWith('1', { status });
      }
    });

    it('should handle update error', async () => {
      vi.mocked(partnerService.update).mockRejectedValueOnce(
        new Error('Partner not found')
      );

      const { result } = renderHook(() => useUpdatePartner(), { wrapper: createWrapper() });

      await expect(
        act(async () => {
          await result.current.mutateAsync({
            id: 'nonexistent',
            data: { name: 'Update' },
          });
        })
      ).rejects.toThrow();
    });
  });

  describe('useDeletePartner', () => {
    it('should delete partner successfully', async () => {
      vi.mocked(partnerService.delete).mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useDeletePartner(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync('1');
      });

      expect(partnerService.delete).toHaveBeenCalledWith('1');
    });

    it('should handle delete error', async () => {
      vi.mocked(partnerService.delete).mockRejectedValueOnce(
        new Error('Cannot delete partner with active projects')
      );

      const { result } = renderHook(() => useDeletePartner(), { wrapper: createWrapper() });

      await expect(
        act(async () => {
          await result.current.mutateAsync('1');
        })
      ).rejects.toThrow();
    });

    it('should handle 404 on delete', async () => {
      vi.mocked(partnerService.delete).mockRejectedValueOnce(
        new Error('Partner not found')
      );

      const { result } = renderHook(() => useDeletePartner(), { wrapper: createWrapper() });

      await expect(
        act(async () => {
          await result.current.mutateAsync('nonexistent');
        })
      ).rejects.toThrow();
    });
  });

  describe('Edge cases', () => {
    it('should handle special characters in partner name', async () => {
      const partnerWithSpecialChars = {
        id: '1',
        name: 'Partner <script>alert("xss")</script>',
        email: 'test@example.com',
      };

      vi.mocked(partnerService.create).mockResolvedValueOnce(partnerWithSpecialChars);

      const { result } = renderHook(() => useCreatePartner(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({
          name: 'Partner <script>alert("xss")</script>',
          email: 'test@example.com',
        });
      });

      expect(partnerService.create).toHaveBeenCalled();
    });

    it('should handle unicode in partner name', async () => {
      const partnerWithUnicode = {
        id: '1',
        name: '株式会社テスト',
        email: 'test@example.com',
        companyName: '株式会社テスト',
      };

      vi.mocked(partnerService.create).mockResolvedValueOnce(partnerWithUnicode);

      const { result } = renderHook(() => useCreatePartner(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({
          name: '株式会社テスト',
          email: 'test@example.com',
          companyName: '株式会社テスト',
        });
      });

      expect(partnerService.create).toHaveBeenCalledWith({
        name: '株式会社テスト',
        email: 'test@example.com',
        companyName: '株式会社テスト',
      });
    });

    it('should handle very long partner name', async () => {
      const longName = 'A'.repeat(500);
      const partnerWithLongName = {
        id: '1',
        name: longName,
        email: 'test@example.com',
      };

      vi.mocked(partnerService.create).mockResolvedValueOnce(partnerWithLongName);

      const { result } = renderHook(() => useCreatePartner(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({ name: longName, email: 'test@example.com' });
      });

      expect(partnerService.create).toHaveBeenCalledWith({ name: longName, email: 'test@example.com' });
    });

    it('should handle empty skills array', async () => {
      const partnerWithEmptySkills = {
        id: '1',
        name: 'Partner',
        email: 'test@example.com',
        skills: [],
      };

      vi.mocked(partnerService.create).mockResolvedValueOnce(partnerWithEmptySkills);

      const { result } = renderHook(() => useCreatePartner(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({
          name: 'Partner',
          email: 'test@example.com',
          skills: [],
        });
      });

      expect(partnerService.create).toHaveBeenCalledWith({
        name: 'Partner',
        email: 'test@example.com',
        skills: [],
      });
    });
  });

  describe('Boundary values', () => {
    it('should handle partner with rating 0', async () => {
      const partnerWithZeroRating = {
        id: '1',
        name: 'New Partner',
        email: 'test@example.com',
        rating: 0,
      };

      vi.mocked(partnerService.getById).mockResolvedValueOnce(partnerWithZeroRating);

      const { result } = renderHook(() => usePartner('1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.rating).toBe(0);
    });

    it('should handle partner with maximum rating', async () => {
      const partnerWithMaxRating = {
        id: '1',
        name: 'Excellent Partner',
        email: 'test@example.com',
        rating: 5,
      };

      vi.mocked(partnerService.getById).mockResolvedValueOnce(partnerWithMaxRating);

      const { result } = renderHook(() => usePartner('1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.rating).toBe(5);
    });

    it('should handle partner with zero projects', async () => {
      const partnerWithNoProjects = {
        id: '1',
        name: 'New Partner',
        email: 'test@example.com',
        totalProjects: 0,
        completedProjects: 0,
      };

      vi.mocked(partnerService.getById).mockResolvedValueOnce(partnerWithNoProjects);

      const { result } = renderHook(() => usePartner('1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.totalProjects).toBe(0);
    });

    it('should handle page 0', async () => {
      const mockPartners = {
        data: [],
        total: 0,
        page: 0,
        pageSize: 10,
        totalPages: 0,
      };

      vi.mocked(partnerService.getAll).mockResolvedValueOnce(mockPartners);

      const { result } = renderHook(() => usePartners({ page: 0 }), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(partnerService.getAll).toHaveBeenCalledWith({ page: 0 });
    });

    it('should handle very large page number', async () => {
      const mockPartners = {
        data: [],
        total: 100,
        page: 1000,
        pageSize: 10,
        totalPages: 10,
      };

      vi.mocked(partnerService.getAll).mockResolvedValueOnce(mockPartners);

      const { result } = renderHook(() => usePartners({ page: 1000 }), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(partnerService.getAll).toHaveBeenCalledWith({ page: 1000 });
    });

    it('should handle international phone number', async () => {
      const partnerWithIntlPhone = {
        id: '1',
        name: 'International Partner',
        email: 'intl@example.com',
        phone: '+81-3-1234-5678',
      };

      vi.mocked(partnerService.create).mockResolvedValueOnce(partnerWithIntlPhone);

      const { result } = renderHook(() => useCreatePartner(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({
          name: 'International Partner',
          email: 'intl@example.com',
          phone: '+81-3-1234-5678',
        });
      });

      expect(partnerService.create).toHaveBeenCalledWith({
        name: 'International Partner',
        email: 'intl@example.com',
        phone: '+81-3-1234-5678',
      });
    });
  });
});
