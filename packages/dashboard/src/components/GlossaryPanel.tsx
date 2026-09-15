import React, { useState, useMemo } from 'react';
import type { GlossaryEntry } from '../types';

interface GlossaryPanelProps {
  entries: GlossaryEntry[];
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

export const GlossaryPanel: React.FC<GlossaryPanelProps> = ({ entries }) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const debouncedSearch = useDebounce(search, 200);

  const categories = useMemo(() => {
    const cats = new Set(entries.map(e => e.category));
    return ['all', ...Array.from(cats).sort()];
  }, [entries]);

  const filteredEntries = useMemo(() => {
    let result = entries;

    if (selectedCategory !== 'all') {
      result = result.filter(e => e.category === selectedCategory);
    }

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.trim().toLowerCase();
      result = result.filter(
        e =>
          e.term.toLowerCase().includes(q) ||
          e.definition.toLowerCase().includes(q) ||
          (e.context?.toLowerCase().includes(q) ?? false) ||
          (e.relatedTerms?.some(rt => rt.toLowerCase().includes(q)) ?? false)
      );
    }

    return result.sort((a, b) => a.term.localeCompare(b.term));
  }, [entries, debouncedSearch, selectedCategory]);

  if (entries.length === 0) {
    return (
      <div className="glossary glossary--empty">
        <div className="glossary__icon">
          <svg width="48" height="48" viewBox="0 0 16 16" fill="#30363d">
            <path d="M0 2.75C0 1.784.784 1 1.75 1h12.5c.966 0 1.75.784 1.75 1.75v10.5A1.75 1.75 0 0114.25 15H1.75A1.75 1.75 0 010 13.25V2.75zm1.75-.25a.25.25 0 00-.25.25v10.5c0 .138.112.25.25.25h12.5a.25.25 0 00.25-.25V2.75a.25.25 0 00-.25-.25H1.75zM4 4h8v1.5H4V4zm0 3h8v1.5H4V7zm0 3h5v1.5H4V10z"/>
          </svg>
        </div>
        <h3>No glossary entries</h3>
        <p>Terms will appear here as CodeForge learns your project vocabulary.</p>
      </div>
    );
  }

  return (
    <div className="glossary">
      <div className="glossary__header">
        <h2 className="glossary__title">Glossary</h2>
        <span className="glossary__count">{filteredEntries.length} term{filteredEntries.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="glossary__controls">
        <div className="glossary__search-wrapper">
          <svg className="glossary__search-icon" width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M11.5 7a4.499 4.499 0 11-8.998 0A4.499 4.499 0 0111.5 7zm-.82 4.74a6 6 0 111.06-1.06l3.04 3.04a.75.75 0 11-1.06 1.06l-3.04-3.04z"/>
          </svg>
          <input
            type="text"
            className="glossary__search"
            placeholder="Search terms..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search glossary"
          />
        </div>

        <div className="glossary__categories">
          {categories.map(cat => (
            <button
              key={cat}
              className={`glossary__category-btn ${selectedCategory === cat ? 'glossary__category-btn--active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat === 'all' ? 'All' : cat}
            </button>
          ))}
        </div>
      </div>

      <div className="glossary__list">
        {filteredEntries.map(entry => (
          <div key={entry.term} className="glossary__entry">
            <div className="glossary__entry-header">
              <h4 className="glossary__term">{entry.term}</h4>
              <span className="glossary__entry-category">{entry.category}</span>
            </div>
            <p className="glossary__definition">{entry.definition}</p>
            {entry.context && (
              <span className="glossary__context">Context: {entry.context}</span>
            )}
            {entry.relatedTerms && entry.relatedTerms.length > 0 && (
              <div className="glossary__related">
                <span className="glossary__related-label">Related:</span>
                {entry.relatedTerms.map(rt => (
                  <span key={rt} className="glossary__related-term">{rt}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
