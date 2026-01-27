import { api, extractData } from './api';

export type SearchType = 'all' | 'projects' | 'partners' | 'tasks';

export interface SearchResultItem {
  id: string;
  type: 'project' | 'partner' | 'task';
  name: string;
  description?: string;
  status?: string;
  relevance: number;
  metadata?: Record<string, unknown>;
}

export interface SearchResults {
  projects: SearchResultItem[];
  partners: SearchResultItem[];
  tasks: SearchResultItem[];
  total: number;
}

export interface SearchParams {
  q: string;
  type?: SearchType;
  limit?: number;
}

export const searchService = {
  search: async (params: SearchParams): Promise<SearchResults> => {
    const searchParams = new URLSearchParams();
    searchParams.append('q', params.q);
    if (params.type) {
      searchParams.append('type', params.type);
    }
    if (params.limit) {
      searchParams.append('limit', String(params.limit));
    }
    const query = searchParams.toString();
    const response = await api.get<{ success: boolean; data: SearchResults }>(
      `/search?${query}`
    );
    return extractData(response);
  },
};
