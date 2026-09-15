import React from 'react';
import type { TabId } from './types';
import { useRecordBook } from './hooks/useRecordBook';
import { useSearch } from './hooks/useSearch';
import { SearchBar } from './components/SearchBar';
import { SessionTimeline } from './components/SessionTimeline';
import { RecipeView } from './components/RecipeView';
import { ProjectHealth } from './components/ProjectHealth';
import { GlossaryPanel } from './components/GlossaryPanel';
import { DailyDigest } from './components/DailyDigest';
import { ExportButton } from './components/ExportButton';
import './styles/dashboard.css';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  {
    id: 'timeline',
    label: 'Timeline',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0zM0 8a8 8 0 1116 0A8 8 0 010 8zm11.78-1.72a.75.75 0 00-1.06-1.06L7.25 9.19 5.78 7.72a.75.75 0 00-1.06 1.06l2 2a.75.75 0 001.06 0l4-4z"/>
      </svg>
    ),
  },
  {
    id: 'recipes',
    label: 'Recipes',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm3.28 5.22a.75.75 0 010 1.06l-2.72 2.72 2.72 2.72a.75.75 0 11-1.06 1.06L7.5 9.06l-2.72 2.72a.75.75 0 11-1.06-1.06L6.44 8 3.66 5.22a.75.75 0 011.06-1.06L7.5 6.94l2.72-2.72a.75.75 0 011.06 0z"/>
      </svg>
    ),
  },
  {
    id: 'health',
    label: 'Health',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M6.122.392a1.75 1.75 0 011.756 0l5.25 3.045c.54.313.872.89.872 1.514V7.25a.75.75 0 01-1.5 0V5.677L7.75 8.432v6.384a1 1 0 01-1.502.865L.872 12.563A1.75 1.75 0 010 11.049V4.951c0-.624.332-1.2.872-1.514L6.122.392zM7.875 1.69a.25.25 0 00-.25 0l-4.63 2.685L7 6.986l4.005-2.61L7.875 1.69z"/>
      </svg>
    ),
  },
  {
    id: 'glossary',
    label: 'Glossary',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M0 2.75C0 1.784.784 1 1.75 1h12.5c.966 0 1.75.784 1.75 1.75v10.5A1.75 1.75 0 0114.25 15H1.75A1.75 1.75 0 010 13.25V2.75zm1.75-.25a.25.25 0 00-.25.25v10.5c0 .138.112.25.25.25h12.5a.25.25 0 00.25-.25V2.75a.25.25 0 00-.25-.25H1.75zM4 4h8v1.5H4V4zm0 3h8v1.5H4V7zm0 3h5v1.5H4V10z"/>
      </svg>
    ),
  },
];

function LoadingSpinner() {
  return (
    <div className="dashboard__loading">
      <div className="dashboard__spinner" />
      <p>Loading RecordBook...</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="dashboard__empty">
      <svg width="64" height="64" viewBox="0 0 16 16" fill="#30363d">
        <path d="M8 0a8 8 0 100 16A8 8 0 008 0zM1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0z"/>
        <path d="M6.5 5a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM8 7.25a.75.75 0 00-.75.75v3.5a.75.75 0 001.5 0v-3.5A.75.75 0 008 7.25z"/>
      </svg>
      <h2>No RecordBook loaded</h2>
      <p>Waiting for data from CodeForge extension...</p>
    </div>
  );
}

export const App: React.FC = () => {
  const {
    recordBook,
    isLoading,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    filterType,
    setFilterType,
    selectedSessionId,
    setSelectedSessionId,
  } = useRecordBook();

  const allRecords = recordBook
    ? recordBook.sessions.flatMap(s => s.records)
    : [];

  const {
    query,
    setQuery,
    filterType: searchFilter,
    setFilterType: setSearchFilter,
    results,
    resultCount,
    isSearching,
    clearSearch,
  } = useSearch(allRecords);

  const showSearch = activeTab === 'timeline';

  const handleSearchQueryChange = (q: string) => {
    setQuery(q);
    setSearchQuery(q);
  };

  const handleFilterChange = (t: typeof filterType) => {
    setSearchFilter(t);
    setFilterType(t);
  };

  if (isLoading) return <LoadingSpinner />;
  if (!recordBook) return <EmptyState />;

  return (
    <div className="dashboard">
      <header className="dashboard__header">
        <div className="dashboard__header-left">
          <h1 className="dashboard__title">
            <svg className="dashboard__logo" width="24" height="24" viewBox="0 0 16 16" fill="#f78166">
              <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm3.28 5.22a.75.75 0 010 1.06l-2.72 2.72 2.72 2.72a.75.75 0 11-1.06 1.06L7.5 9.06l-2.72 2.72a.75.75 0 11-1.06-1.06L6.44 8 3.66 5.22a.75.75 0 011.06-1.06L7.5 6.94l2.72-2.72a.75.75 0 011.06 0z"/>
            </svg>
            {recordBook.project.name}
          </h1>
          <span className="dashboard__badge">{recordBook.project.detectedType}</span>
        </div>
        <div className="dashboard__header-right">
          <DailyDigest sessions={recordBook.sessions} />
          <ExportButton recordBook={recordBook} />
        </div>
      </header>

      <nav className="dashboard__tabs" role="tablist">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`dashboard__tab ${activeTab === tab.id ? 'dashboard__tab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            role="tab"
            aria-selected={activeTab === tab.id}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </nav>

      {showSearch && (
        <SearchBar
          query={query}
          onQueryChange={handleSearchQueryChange}
          filterType={searchFilter}
          onFilterChange={handleFilterChange}
          resultCount={resultCount}
          isSearching={isSearching}
          onClear={clearSearch}
        />
      )}

      <main className="dashboard__content">
        {activeTab === 'timeline' && (
          <SessionTimeline
            sessions={recordBook.sessions}
            selectedSessionId={selectedSessionId}
            onSelectSession={setSelectedSessionId}
          />
        )}
        {activeTab === 'recipes' && (
          <RecipeView recipes={recordBook.recipes} />
        )}
        {activeTab === 'health' && (
          <ProjectHealth
            environment={recordBook.environment}
            project={recordBook.project}
          />
        )}
        {activeTab === 'glossary' && (
          <GlossaryPanel entries={recordBook.glossary} />
        )}
      </main>
    </div>
  );
};
