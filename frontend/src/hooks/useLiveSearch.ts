import { useState, useEffect, useCallback, useRef } from 'react';
import { liveSearchService } from '../services/live-search.service';
import type { LiveSearchResults } from '../types/search';

export const useLiveSearch = (debounceMs: number = 300) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LiveSearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Debounced search function
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 2) {
      setResults(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      const response = await liveSearchService.search(searchQuery);
      setResults(response.data);
      setIsOpen(true);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Search failed');
        console.error('Live search error:', err);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle query change with debounce
  useEffect(() => {
    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer
    if (query.length >= 2) {
      debounceTimerRef.current = setTimeout(() => {
        performSearch(query);
      }, debounceMs);
    } else {
      setResults(null);
      setLoading(false);
    }

    // Cleanup
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, debounceMs, performSearch]);

  // Clear search
  const clearSearch = useCallback(() => {
    setQuery('');
    setResults(null);
    setIsOpen(false);
    setError(null);
  }, []);

  // Close dropdown
  const closeDropdown = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Open dropdown
  const openDropdown = useCallback(() => {
    if (results && results.total > 0) {
      setIsOpen(true);
    }
  }, [results]);

  return {
    query,
    setQuery,
    results,
    loading,
    error,
    isOpen,
    clearSearch,
    closeDropdown,
    openDropdown,
    hasResults: results && results.total > 0,
  };
};
