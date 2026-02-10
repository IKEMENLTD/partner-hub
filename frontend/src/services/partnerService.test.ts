import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { partnerService } from './partnerService';
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

describe('partnerService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getAll', () => {
    it('should fetch all partners without params', async () => {
      const mockResponse = {
        success: true,
        data: {
          data: [
            { id: '1', name: 'Partner 1', email: 'p1@example.com', status: 'active' },
            { id: '2', name: 'Partner 2', email: 'p2@example.com', status: 'pending' },
          ],
          pagination: { total: 2, limit: 10, offset: 0, hasMore: false },
        },
      };

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      const result = await partnerService.getAll();

      expect(api.get).toHaveBeenCalledWith('/partners');
      expect(result.data).toHaveLength(2);
    });

    it('should fetch partners with page and pageSize params', async () => {
      const mockResponse = {
        success: true,
        data: {
          data: [{ id: '1', name: 'Partner 1' }],
          pagination: { total: 50, limit: 10, offset: 10, hasMore: true },
        },
      };

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      const result = await partnerService.getAll({ page: 2, pageSize: 10 });

      expect(api.get).toHaveBeenCalledWith('/partners?page=2&limit=10');
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(10);
    });

    it('should convert sortField to sortBy', async () => {
      const mockResponse = {
        success: true,
        data: {
          data: [],
          pagination: { total: 0, limit: 10, offset: 0, hasMore: false },
        },
      };

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      await partnerService.getAll({ sortField: 'name' });

      expect(api.get).toHaveBeenCalledWith('/partners?sortBy=name');
    });

    it('should convert sortOrder to uppercase', async () => {
      const mockResponse = {
        success: true,
        data: {
          data: [],
          pagination: { total: 0, limit: 10, offset: 0, hasMore: false },
        },
      };

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      await partnerService.getAll({ sortOrder: 'desc' });

      expect(api.get).toHaveBeenCalledWith('/partners?sortOrder=DESC');
    });

    it('should handle status filter', async () => {
      const mockResponse = {
        success: true,
        data: {
          data: [],
          pagination: { total: 0, limit: 10, offset: 0, hasMore: false },
        },
      };

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      await partnerService.getAll({ status: 'active' });

      expect(api.get).toHaveBeenCalledWith('/partners?status=active');
    });

    it('should handle type filter', async () => {
      const mockResponse = {
        success: true,
        data: {
          data: [],
          pagination: { total: 0, limit: 10, offset: 0, hasMore: false },
        },
      };

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      await partnerService.getAll({ type: 'company' });

      expect(api.get).toHaveBeenCalledWith('/partners?type=company');
    });

    it('should handle skills array filter', async () => {
      const mockResponse = {
        success: true,
        data: {
          data: [],
          pagination: { total: 0, limit: 10, offset: 0, hasMore: false },
        },
      };

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      await partnerService.getAll({ skills: ['React', 'Node.js'] });

      expect(api.get).toHaveBeenCalledWith('/partners?skills=React&skills=Node.js');
    });

    it('should handle search query', async () => {
      const mockResponse = {
        success: true,
        data: {
          data: [],
          pagination: { total: 0, limit: 10, offset: 0, hasMore: false },
        },
      };

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      await partnerService.getAll({ search: 'test partner' });

      expect(api.get).toHaveBeenCalledWith('/partners?search=test+partner');
    });

    it('should handle country filter', async () => {
      const mockResponse = {
        success: true,
        data: {
          data: [],
          pagination: { total: 0, limit: 10, offset: 0, hasMore: false },
        },
      };

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      await partnerService.getAll({ country: 'Japan' });

      expect(api.get).toHaveBeenCalledWith('/partners?country=Japan');
    });

    it('should skip undefined and null values', async () => {
      const mockResponse = {
        success: true,
        data: {
          data: [],
          pagination: { total: 0, limit: 10, offset: 0, hasMore: false },
        },
      };

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      await partnerService.getAll({
        page: 1,
        search: undefined,
        status: undefined,
      });

      expect(api.get).toHaveBeenCalledWith('/partners?page=1');
    });

    it('should handle empty params', async () => {
      const mockResponse = {
        success: true,
        data: {
          data: [],
          pagination: { total: 0, limit: 10, offset: 0, hasMore: false },
        },
      };

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      await partnerService.getAll({});

      expect(api.get).toHaveBeenCalledWith('/partners');
    });

    it('should handle API error', async () => {
      vi.mocked(api.get).mockRejectedValueOnce(new Error('Network error'));

      await expect(partnerService.getAll()).rejects.toThrow('Network error');
    });
  });

  describe('getById', () => {
    it('should fetch partner by id', async () => {
      const mockPartner = {
        id: '1',
        name: 'Test Partner',
        email: 'partner@example.com',
        status: 'active',
        type: 'company',
      };

      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: mockPartner,
      });

      const result = await partnerService.getById('1');

      expect(api.get).toHaveBeenCalledWith('/partners/1');
      expect(result).toEqual(mockPartner);
    });

    it('should handle 404 error', async () => {
      vi.mocked(api.get).mockRejectedValueOnce(new Error('Partner not found'));

      await expect(partnerService.getById('nonexistent')).rejects.toThrow('Partner not found');
    });

    it('should handle various id formats', async () => {
      const mockPartner = { id: 'uuid-123-456', name: 'Partner' };

      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: mockPartner,
      });

      await partnerService.getById('uuid-123-456');

      expect(api.get).toHaveBeenCalledWith('/partners/uuid-123-456');
    });
  });

  describe('create', () => {
    it('should create partner with minimal data', async () => {
      const newPartner = { id: 'new-1', name: 'New Partner', email: 'new@example.com', status: 'pending' };
      const createData = { name: 'New Partner', email: 'new@example.com' };

      vi.mocked(api.post).mockResolvedValueOnce({
        success: true,
        data: newPartner,
      });

      const result = await partnerService.create(createData);

      expect(api.post).toHaveBeenCalledWith('/partners', createData);
      expect(result).toEqual(newPartner);
    });

    it('should create partner with all fields', async () => {
      const fullData = {
        name: 'Full Partner',
        email: 'full@example.com',
        phone: '03-1234-5678',
        companyName: 'Company Inc.',
        type: 'company' as const,
        status: 'pending' as const,
        description: 'Description',
        skills: ['React', 'Node.js'],
        address: 'Tokyo, Japan',
        country: 'Japan',
        timezone: 'Asia/Tokyo',
        metadata: { custom: 'value' },
      };

      const createdPartner = { id: 'new-1', ...fullData };

      vi.mocked(api.post).mockResolvedValueOnce({
        success: true,
        data: createdPartner,
      });

      const result = await partnerService.create(fullData);

      expect(api.post).toHaveBeenCalledWith('/partners', fullData);
      expect(result).toEqual(createdPartner);
    });

    it('should handle validation error', async () => {
      vi.mocked(api.post).mockRejectedValueOnce(new Error('Validation error'));

      await expect(
        partnerService.create({ name: '', email: '' })
      ).rejects.toThrow('Validation error');
    });

    it('should handle duplicate email error', async () => {
      vi.mocked(api.post).mockRejectedValueOnce(new Error('Email already exists'));

      await expect(
        partnerService.create({ name: 'Partner', email: 'existing@example.com' })
      ).rejects.toThrow('Email already exists');
    });
  });

  describe('update', () => {
    it('should update partner with partial data', async () => {
      const updateData = { name: 'Updated Name' };
      const updatedPartner = { id: '1', name: 'Updated Name', status: 'active' };

      vi.mocked(api.patch).mockResolvedValueOnce({
        success: true,
        data: updatedPartner,
      });

      const result = await partnerService.update('1', updateData);

      expect(api.patch).toHaveBeenCalledWith('/partners/1', updateData);
      expect(result).toEqual(updatedPartner);
    });

    it('should update partner status', async () => {
      vi.mocked(api.patch).mockResolvedValueOnce({
        success: true,
        data: { id: '1', status: 'suspended' },
      });

      await partnerService.update('1', { status: 'suspended' });

      expect(api.patch).toHaveBeenCalledWith('/partners/1', { status: 'suspended' });
    });

    it('should update partner skills', async () => {
      vi.mocked(api.patch).mockResolvedValueOnce({
        success: true,
        data: { id: '1', skills: ['TypeScript', 'Python'] },
      });

      await partnerService.update('1', { skills: ['TypeScript', 'Python'] });

      expect(api.patch).toHaveBeenCalledWith('/partners/1', { skills: ['TypeScript', 'Python'] });
    });

    it('should handle update error', async () => {
      vi.mocked(api.patch).mockRejectedValueOnce(new Error('Partner not found'));

      await expect(
        partnerService.update('nonexistent', { name: 'Update' })
      ).rejects.toThrow('Partner not found');
    });
  });

  describe('delete', () => {
    it('should delete partner', async () => {
      vi.mocked(api.delete).mockResolvedValueOnce(undefined);

      await partnerService.delete('1');

      expect(api.delete).toHaveBeenCalledWith('/partners/1');
    });

    it('should handle delete error', async () => {
      vi.mocked(api.delete).mockRejectedValueOnce(
        new Error('Cannot delete partner with active projects')
      );

      await expect(partnerService.delete('1')).rejects.toThrow(
        'Cannot delete partner with active projects'
      );
    });
  });

  describe('getProjects', () => {
    it('should fetch partner projects', async () => {
      const mockProjects = [
        { id: '1', name: 'Project 1', status: 'in_progress' },
        { id: '2', name: 'Project 2', status: 'completed' },
      ];

      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: { projects: mockProjects },
      });

      const result = await partnerService.getProjects('partner-1');

      expect(api.get).toHaveBeenCalledWith('/partners/partner-1/projects');
      expect(result).toEqual(mockProjects);
    });

    it('should handle empty projects list', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: { projects: [] },
      });

      const result = await partnerService.getProjects('partner-1');

      expect(result).toEqual([]);
    });

    it('should handle error when fetching projects', async () => {
      vi.mocked(api.get).mockRejectedValueOnce(new Error('Partner not found'));

      await expect(partnerService.getProjects('nonexistent')).rejects.toThrow('Partner not found');
    });
  });

  describe('Edge cases', () => {
    it('should handle special characters in search query', async () => {
      const mockResponse = {
        success: true,
        data: {
          data: [],
          pagination: { total: 0, limit: 10, offset: 0, hasMore: false },
        },
      };

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      await partnerService.getAll({ search: 'test & query' });

      expect(api.get).toHaveBeenCalledWith('/partners?search=test+%26+query');
    });

    it('should handle unicode in partner name', async () => {
      const createData = { name: '株式会社テスト', email: 'test@example.com' };

      vi.mocked(api.post).mockResolvedValueOnce({
        success: true,
        data: { id: '1', ...createData },
      });

      await partnerService.create(createData);

      expect(api.post).toHaveBeenCalledWith('/partners', createData);
    });

    it('should handle empty string values', async () => {
      const mockResponse = {
        success: true,
        data: {
          data: [],
          pagination: { total: 0, limit: 10, offset: 0, hasMore: false },
        },
      };

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      await partnerService.getAll({ search: '' });

      expect(api.get).toHaveBeenCalledWith('/partners?search=');
    });

  });

  describe('Boundary values', () => {
    it('should handle partner with zero rating', async () => {
      const mockPartner = { id: '1', name: 'New Partner', rating: 0 };

      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: mockPartner,
      });

      const result = await partnerService.getById('1');

      expect(result.rating).toBe(0);
    });

    it('should handle partner with maximum rating', async () => {
      const mockPartner = { id: '1', name: 'Excellent Partner', rating: 5 };

      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: mockPartner,
      });

      const result = await partnerService.getById('1');

      expect(result.rating).toBe(5);
    });

    it('should handle page 0', async () => {
      const mockResponse = {
        success: true,
        data: {
          data: [],
          pagination: { total: 0, limit: 10, offset: 0, hasMore: false },
        },
      };

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      await partnerService.getAll({ page: 0 });

      expect(api.get).toHaveBeenCalledWith('/partners?page=0');
    });

    it('should handle very long partner name', async () => {
      const longName = 'A'.repeat(1000);
      const createData = { name: longName, email: 'test@example.com' };

      vi.mocked(api.post).mockResolvedValueOnce({
        success: true,
        data: { id: '1', ...createData },
      });

      await partnerService.create(createData);

      expect(api.post).toHaveBeenCalledWith('/partners', createData);
    });

    it('should handle empty skills array', async () => {
      const createData = { name: 'Partner', email: 'test@example.com', skills: [] };

      vi.mocked(api.post).mockResolvedValueOnce({
        success: true,
        data: { id: '1', ...createData },
      });

      await partnerService.create(createData);

      expect(api.post).toHaveBeenCalledWith('/partners', createData);
    });

    it('should handle very long skills array', async () => {
      const manySkills = Array(100).fill(null).map((_, i) => `Skill${i}`);
      const createData = { name: 'Partner', email: 'test@example.com', skills: manySkills };

      vi.mocked(api.post).mockResolvedValueOnce({
        success: true,
        data: { id: '1', ...createData },
      });

      await partnerService.create(createData);

      expect(api.post).toHaveBeenCalledWith('/partners', createData);
    });

    it('should handle international phone number format', async () => {
      const createData = { name: 'Partner', email: 'test@example.com', phone: '+81-3-1234-5678' };

      vi.mocked(api.post).mockResolvedValueOnce({
        success: true,
        data: { id: '1', ...createData },
      });

      await partnerService.create(createData);

      expect(api.post).toHaveBeenCalledWith('/partners', createData);
    });

    it('should handle various timezone formats', async () => {
      const timezones = ['Asia/Tokyo', 'America/New_York', 'Europe/London', 'UTC'];

      for (const timezone of timezones) {
        const createData = { name: 'Partner', email: 'test@example.com', timezone };

        vi.mocked(api.post).mockResolvedValueOnce({
          success: true,
          data: { id: '1', ...createData },
        });

        await partnerService.create(createData);

        expect(api.post).toHaveBeenLastCalledWith('/partners', createData);
      }
    });
  });
});
