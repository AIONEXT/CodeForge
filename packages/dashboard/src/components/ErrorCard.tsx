import React, { useState } from 'react';
import type { ErrorRecord } from '../types';

function relativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diff = now - then;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

interface ErrorCardProps {
  record: ErrorRecord;
  compact?: boolean;
}

export const ErrorCard: React.FC<ErrorCardProps> = ({ record, compact = false }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`card card--error ${compact ? 'card--compact' : ''} ${record.resolved ? 'card--resolved' : ''}`}>
      <div className="card__header">
        <div className="card__icon card__icon--error" title="Error">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M2.343 13.657A8 8 0 1113.658 2.343 8 8 0 012.343 13.657zM6.03 4.97a.751.751 0 00-1.042.018.751.751 0 00-.018 1.042L6.94 8 4.97 9.97a.749.749 0 101.06 1.06L8 9.06l1.97 1.97a.749.749 0 101.06-1.06L9.06 8l1.97-1.97a.749.749 0 10-1.06-1.06L8 6.94 6.03 4.97z"/>
          </svg>
        </div>
        <span className="card__type-badge card__type-badge--error">error</span>
        {record.resolved !== undefined && (
          <span className={`card__resolved-badge ${record.resolved ? 'card__resolved-badge--yes' : 'card__resolved-badge--no'}`}>
            {record.resolved ? 'resolved' : 'unresolved'}
          </span>
        )}
        <span className="card__time">{relativeTime(record.timestamp)}</span>
      </div>

      <div className="card__body">
        <p className="card__error-message">{record.message}</p>

        {record.source && (
          <span className="card__meta card__meta--source">from: {record.source}</span>
        )}

        {record.command && (
          <code className="card__command card__command--inline">triggered by: {record.command}</code>
        )}

        {(record.diagnosis || record.fixSuggestion) && (
          <button
            className="card__expand-btn"
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
          >
            {expanded ? 'Hide details' : 'Show diagnosis & fix'}
            <svg className={`card__expand-icon ${expanded ? 'card__expand-icon--open' : ''}`} width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <path d="M4.427 7.427l3.396 3.396a.25.25 0 00.354 0l3.396-3.396A.25.25 0 0011.396 7H4.604a.25.25 0 00-.177.427z"/>
            </svg>
          </button>
        )}

        {expanded && (
          <div className="card__details">
            {record.diagnosis && (
              <div className="card__detail-section">
                <span className="card__detail-label">Diagnosis</span>
                <p className="card__detail-text">{record.diagnosis}</p>
              </div>
            )}
            {record.fixSuggestion && (
              <div className="card__detail-section">
                <span className="card__detail-label">Suggested Fix</span>
                <p className="card__detail-text card__detail-text--fix">{record.fixSuggestion}</p>
              </div>
            )}
            {record.stack && (
              <div className="card__detail-section">
                <span className="card__detail-label">Stack Trace</span>
                <pre className="card__stack-trace">{record.stack}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
