import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { Record, RecordType } from '../types';

export interface UseSearchResult {
  query: string;
  setQuery: (q: string) => void;
  debouncedQuery: string;
  filterType: RecordType | 'all';
  setFilterType: (t: RecordType | 'all') => void;
  results: Record[];
  resultCount: number;
  isSearching: boolean;
  clearSearch: () => void;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

function matchRecord(record: Record, query: string): boolean {
  if (!query) return true;
  const lower = query.toLowerCase();

  switch (record.type) {
    case 'terminal_command':
      return (
        record.command.toLowerCase().includes(lower) ||
        (record.explanation?.toLowerCase().includes(lower) ?? false) ||
        (record.category?.toLowerCase().includes(lower) ?? false) ||
        (record.tags?.some(t => t.toLowerCase().includes(lower)) ?? false)
      );
    case 'error':
      return (
        record.message.toLowerCase().includes(lower) ||
        (record.diagnosis?.toLowerCase().includes(lower) ?? false) ||
        (record.fixSuggestion?.toLowerCase().includes(lower) ?? false) ||
        (record.source?.toLowerCase().includes(lower) ?? false)
      );
    case 'file_save':
      return (
        record.filePath.toLowerCase().includes(lower) ||
        (record.explanation?.toLowerCase().includes(lower) ?? false) ||
        (record.language?.toLowerCase().includes(lower) ?? false)
      );
    case 'file_rename':
      return (
        record.oldPath.toLowerCase().includes(lower) ||
        record.newPath.toLowerCase().includes(lower) ||
        (record.explanation?.toLowerCase().includes(lower) ?? false)
      );
    case 'ai_prompt':
      return (
        record.prompt.toLowerCase().includes(lower) ||
        (record.response?.toLowerCase().includes(lower) ?? false) ||
        (record.explanation?.toLowerCase().includes(lower) ?? false) ||
        (record.model?.toLowerCase().includes(lower) ?? false)
      );
    case 'milestone':
      return (
        record.title.toLowerCase().includes(lower) ||
        (record.description?.toLowerCase().includes(lower) ?? false)
      );
    case 'git_action':
      return (
        record.action.toLowerCase().includes(lower) ||
        (record.message?.toLowerCase().includes(lower) ?? false) ||
        (record.branch?.toLowerCase().includes(lower) ?? false) ||
        (record.explanation?.toLowerCase().includes(lower) ?? false)
      );
    default:
      return false;
  }
}

export function useSearch(records: Record[], debounceMs: number = 200): UseSearchResult {
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState<RecordType | 'all'>('all');
  const [isSearching, setIsSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedQuery = useDebounce(query, debounceMs);

  useEffect(() => {
    setIsSearching(true);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setIsSearching(false), debounceMs + 50);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [debouncedQuery, filterType, debounceMs]);

  const results = useMemo(() => {
    let filtered = records;

    if (filterType !== 'all') {
      filtered = filtered.filter(r => r.type === filterType);
    }

    if (debouncedQuery.trim()) {
      filtered = filtered.filter(r => matchRecord(r, debouncedQuery.trim()));
    }

    return filtered;
  }, [records, debouncedQuery, filterType]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setFilterType('all');
  }, []);

  return {
    query,
    setQuery,
    debouncedQuery,
    filterType,
    setFilterType,
    results,
    resultCount: results.length,
    isSearching,
    clearSearch,
  };
}
