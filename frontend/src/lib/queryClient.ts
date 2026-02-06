import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 2 * 60 * 1000, // 2分間はstale扱いしない
      gcTime: 5 * 60 * 1000,    // 5分間キャッシュ保持
    },
    mutations: {
      retry: 0,
    },
  },
});
