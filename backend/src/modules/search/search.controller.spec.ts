import { Test, TestingModule } from '@nestjs/testing';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

describe('SearchController', () => {
  let controller: SearchController;

  const mockSearchService = {
    search: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SearchController],
      providers: [
        { provide: SearchService, useValue: mockSearchService },
      ],
    }).compile();

    controller = module.get<SearchController>(SearchController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('search', () => {
    it('should return search results', async () => {
      const searchResults = {
        projects: [{ id: 'proj-1', type: 'project', name: 'Test Project', relevance: 1 }],
        partners: [],
        tasks: [],
        total: 1,
      };
      mockSearchService.search.mockResolvedValue(searchResults);

      const query = { q: 'test', type: undefined, limit: undefined };
      const result = await controller.search(query as any, 'user-1', 'ADMIN', 'org-1');

      expect(result).toEqual(searchResults);
      expect(mockSearchService.search).toHaveBeenCalledWith(query, 'user-1', 'ADMIN', 'org-1');
    });

    it('should pass search type filter', async () => {
      const searchResults = { projects: [], partners: [], tasks: [], total: 0 };
      mockSearchService.search.mockResolvedValue(searchResults);

      const query = { q: 'test', type: 'project', limit: 5 };
      await controller.search(query as any, 'user-1', 'MEMBER', 'org-1');

      expect(mockSearchService.search).toHaveBeenCalledWith(query, 'user-1', 'MEMBER', 'org-1');
    });

    it('should propagate errors from service', async () => {
      mockSearchService.search.mockRejectedValue(new Error('Search failed'));

      await expect(
        controller.search({ q: 'test' } as any, 'user-1', 'ADMIN', 'org-1'),
      ).rejects.toThrow('Search failed');
    });
  });
});
