import { useQuery } from '@tanstack/react-query';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { searchService, SearchResults, SearchType } from '@/services/searchService';

// Debounce function
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

interface UseSearchOptions {
  type?: SearchType;
  limit?: number;
  debounceMs?: number;
  minQueryLength?: number;
}

export function useSearch(options: UseSearchOptions = {}) {
  const {
    type = 'all',
    limit = 10,
    debounceMs = 300,
    minQueryLength = 2,
  } = options;

  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, debounceMs);

  const isQueryValid = useMemo(
    () => debouncedQuery.trim().length >= minQueryLength,
    [debouncedQuery, minQueryLength]
  );

  const {
    data: results,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery<SearchResults>({
    queryKey: ['search', debouncedQuery, type, limit],
    queryFn: () =>
      searchService.search({
        q: debouncedQuery.trim(),
        type,
        limit,
      }),
    enabled: isQueryValid,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  const clearSearch = useCallback(() => {
    setQuery('');
  }, []);

  // Flatten all results into a single array sorted by relevance
  const allResults = useMemo(() => {
    if (!results) return [];
    const combined = [
      ...results.projects,
      ...results.partners,
      ...results.tasks,
    ];
    return combined.sort((a, b) => b.relevance - a.relevance);
  }, [results]);

  return {
    query,
    setQuery,
    debouncedQuery,
    results,
    allResults,
    isLoading: isLoading && isQueryValid,
    isFetching: isFetching && isQueryValid,
    error,
    refetch,
    clearSearch,
    isQueryValid,
    hasResults: (results?.total ?? 0) > 0,
  };
}

export function useGlobalSearch(debounceMs = 300) {
  return useSearch({
    type: 'all',
    limit: 10,
    debounceMs,
    minQueryLength: 2,
  });
}
