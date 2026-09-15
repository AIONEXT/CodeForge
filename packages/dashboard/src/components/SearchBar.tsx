import React, { useRef, useEffect } from 'react';
import type { RecordType } from '../types';

interface SearchBarProps {
  query: string;
  onQueryChange: (q: string) => void;
  filterType: RecordType | 'all';
  onFilterChange: (t: RecordType | 'all') => void;
  resultCount: number;
  isSearching: boolean;
  onClear: () => void;
}

const RECORD_TYPES: { value: RecordType | 'all'; label: string }[] = [
  { value: 'all', label: 'All Types' },
  { value: 'terminal_command', label: 'Commands' },
  { value: 'error', label: 'Errors' },
  { value: 'file_save', label: 'File Saves' },
  { value: 'file_rename', label: 'File Renames' },
  { value: 'ai_prompt', label: 'AI Prompts' },
  { value: 'milestone', label: 'Milestones' },
  { value: 'git_action', label: 'Git Actions' },
];

export const SearchBar: React.FC<SearchBarProps> = ({
  query,
  onQueryChange,
  filterType,
  onFilterChange,
  resultCount,
  isSearching,
  onClear,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        onClear();
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClear]);

  return (
    <div className="search-bar">
      <div className="search-bar__input-wrapper">
        <svg className="search-bar__icon" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M11.5 7a4.499 4.499 0 11-8.998 0A4.499 4.499 0 0111.5 7zm-.82 4.74a6 6 0 111.06-1.06l3.04 3.04a.75.75 0 11-1.06 1.06l-3.04-3.04z"/>
        </svg>
        <input
          ref={inputRef}
          type="text"
          className="search-bar__input"
          placeholder="Search records... (Ctrl+F)"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          aria-label="Search records"
        />
        {query && (
          <button className="search-bar__clear" onClick={onClear} aria-label="Clear search">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <path d="M3.72 3.72a.75.75 0 011.06 0L7 5.94l2.22-2.22a.75.75 0 111.06 1.06L8.06 7l2.22 2.22a.75.75 0 11-1.06 1.06L7 8.06l-2.22 2.22a.75.75 0 01-1.06-1.06L5.94 7 3.72 4.78a.75.75 0 010-1.06z"/>
            </svg>
          </button>
        )}
      </div>

      <select
        className="search-bar__filter"
        value={filterType}
        onChange={(e) => onFilterChange(e.target.value as RecordType | 'all')}
        aria-label="Filter by record type"
      >
        {RECORD_TYPES.map(rt => (
          <option key={rt.value} value={rt.value}>{rt.label}</option>
        ))}
      </select>

      {(query || filterType !== 'all') && (
        <span className="search-bar__count">
          {isSearching ? (
            <span className="search-bar__spinner" />
          ) : (
            `${resultCount} result${resultCount !== 1 ? 's' : ''}`
          )}
        </span>
      )}
    </div>
  );
};
