import React from 'react';
import type { TerminalCommandRecord } from '../types';

function relativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diff = now - then;

  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function formatDuration(ms?: number): string | null {
  if (ms === undefined || ms === null) return null;
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

interface CommandCardProps {
  record: TerminalCommandRecord;
  compact?: boolean;
}

export const CommandCard: React.FC<CommandCardProps> = ({ record, compact = false }) => {
  const duration = formatDuration(record.duration);
  const exitCodeOk = record.exitCode === 0 || record.exitCode === undefined;

  return (
    <div className={`card card--command ${compact ? 'card--compact' : ''}`}>
      <div className="card__header">
        <div className="card__icon card__icon--command" title="Terminal Command">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M0 2.75C0 1.784.784 1 1.75 1h12.5c.966 0 1.75.784 1.75 1.75v10.5A1.75 1.75 0 0114.25 15H1.75A1.75 1.75 0 010 13.25V2.75zm1.75-.25a.25.25 0 00-.25.25v10.5c0 .138.112.25.25.25h12.5a.25.25 0 00.25-.25V2.75a.25.25 0 00-.25-.25H1.75zM4.75 4a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 014.75 4zm4 0a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 018.75 4zm-4 4a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 014.75 8z"/>
          </svg>
        </div>
        <span className="card__type-badge card__type-badge--command">command</span>
        <span className="card__time">{relativeTime(record.timestamp)}</span>
      </div>

      <div className="card__body">
        <code className="card__command">{record.command}</code>

        {record.explanation && (
          <p className="card__explanation">{record.explanation}</p>
        )}
      </div>

      <div className="card__footer">
        <span className={`card__status ${exitCodeOk ? 'card__status--ok' : 'card__status--error'}`}>
          exit {record.exitCode ?? '—'}
        </span>
        {duration && <span className="card__meta">{duration}</span>}
        {record.category && <span className="card__meta">{record.category}</span>}
        {record.cwd && <span className="card__meta card__meta--path">{record.cwd}</span>}
      </div>
    </div>
  );
};
