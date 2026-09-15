import React from 'react';
import type { Session, Record, TerminalCommandRecord, ErrorRecord, FileSaveRecord, FileRenameRecord, AiPromptRecord, MilestoneRecord, GitActionRecord } from '../types';
import { CommandCard } from './CommandCard';
import { ErrorCard } from './ErrorCard';

function relativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diff = now - then;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function formatDate(timestamp: string): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(start: string, end?: string): string {
  const ms = (end ? new Date(end) : new Date()).getTime() - new Date(start).getTime();
  if (ms < 60000) return '< 1m';
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m`;
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
}

function RecordIcon({ type }: { type: Record['type'] }) {
  const colorMap: Record<Record['type'], string> = {
    terminal_command: '#58a6ff',
    error: '#f85149',
    file_save: '#3fb950',
    file_rename: '#3fb950',
    ai_prompt: '#a371f7',
    milestone: '#f78166',
    git_action: '#d2a8ff',
  };
  const color = colorMap[type];

  return (
    <div className="timeline__dot" style={{ backgroundColor: color }} title={type.replace(/_/g, ' ')}>
      {type === 'terminal_command' && (
        <svg width="10" height="10" viewBox="0 0 16 16" fill="white"><path d="M0 2.75C0 1.784.784 1 1.75 1h12.5c.966 0 1.75.784 1.75 1.75v10.5A1.75 1.75 0 0114.25 15H1.75A1.75 1.75 0 010 13.25V2.75zM4.75 4a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 014.75 4zm4 0a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 018.75 4zm-4 4a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 014.75 8z"/></svg>
      )}
      {type === 'error' && (
        <svg width="10" height="10" viewBox="0 0 16 16" fill="white"><path d="M2.343 13.657A8 8 0 1113.658 2.343 8 8 0 012.343 13.657zM6.03 4.97a.751.751 0 00-1.042.018.751.751 0 00-.018 1.042L6.94 8 4.97 9.97a.749.749 0 101.06 1.06L8 9.06l1.97 1.97a.749.749 0 101.06-1.06L9.06 8l1.97-1.97a.749.749 0 10-1.06-1.06L8 6.94 6.03 4.97z"/></svg>
      )}
      {type === 'file_save' && (
        <svg width="10" height="10" viewBox="0 0 16 16" fill="white"><path d="M3.5 1.75a.25.25 0 01.25-.25h3.168a.75.75 0 01.53.22l2.872 2.872a.75.75 0 01.22.53v8.128a.25.25 0 01-.25.25h-6.5a.25.25 0 01-.25-.25V1.75z"/></svg>
      )}
      {type === 'file_rename' && (
        <svg width="10" height="10" viewBox="0 0 16 16" fill="white"><path d="M11.013 1.427a1.75 1.75 0 012.474 0l1.086 1.086a1.75 1.75 0 010 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 01-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61z"/></svg>
      )}
      {type === 'ai_prompt' && (
        <svg width="10" height="10" viewBox="0 0 16 16" fill="white"><path d="M8 0a8 8 0 100 16A8 8 0 008 0zm0 1.5a6.5 6.5 0 110 13 6.5 6.5 0 010-13zM5.25 5.5a.75.75 0 00-1.5 0v5a.75.75 0 001.5 0v-5zm5.5 0a.75.75 0 00-1.5 0v5a.75.75 0 001.5 0v-5z"/></svg>
      )}
      {type === 'milestone' && (
        <svg width="10" height="10" viewBox="0 0 16 16" fill="white"><path d="M8 0a8 8 0 100 16A8 8 0 008 0zm3.28 5.22a.75.75 0 010 1.06l-2.72 2.72 2.72 2.72a.75.75 0 11-1.06 1.06L7.5 9.06l-2.72 2.72a.75.75 0 11-1.06-1.06L6.44 8 3.66 5.22a.75.75 0 011.06-1.06L7.5 6.94l2.72-2.72a.75.75 0 011.06 0z"/></svg>
      )}
      {type === 'git_action' && (
        <svg width="10" height="10" viewBox="0 0 16 16" fill="white"><path d="M11.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122V6A2.5 2.5 0 0110 8.5H6a1 1 0 00-1 1v1.128a2.251 2.251 0 11-1.5 0V5.372a2.25 2.25 0 111.5 0v1.836A2.492 2.492 0 016 7h4a1 1 0 001-1v-.628A2.25 2.25 0 019.5 3.25zM4.25 12a.75.75 0 100 1.5.75.75 0 000-1.5zM3.5 3.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0z"/></svg>
      )}
    </div>
  );
}

function GenericRecordCard({ record }: { record: Record }) {
  switch (record.type) {
    case 'terminal_command':
      return <CommandCard record={record as TerminalCommandRecord} />;
    case 'error':
      return <ErrorCard record={record as ErrorRecord} />;
    case 'file_save': {
      const r = record as FileSaveRecord;
      return (
        <div className="card card--file">
          <div className="card__header">
            <div className="card__icon card__icon--file" style={{ color: '#3fb950' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M3.5 1.75a.25.25 0 01.25-.25h3.168a.75.75 0 01.53.22l2.872 2.872a.75.75 0 01.22.53v8.128a.25.25 0 01-.25.25h-6.5a.25.25 0 01-.25-.25V1.75z"/></svg>
            </div>
            <span className="card__type-badge card__type-badge--file">file save</span>
            <span className="card__time">{relativeTime(r.timestamp)}</span>
          </div>
          <div className="card__body">
            <code className="card__command">{r.filePath}</code>
            {r.explanation && <p className="card__explanation">{r.explanation}</p>}
          </div>
          <div className="card__footer">
            {r.language && <span className="card__meta">{r.language}</span>}
            {r.linesAdded !== undefined && <span className="card__status card__status--ok">+{r.linesAdded}</span>}
            {r.linesRemoved !== undefined && <span className="card__status card__status--error">-{r.linesRemoved}</span>}
          </div>
        </div>
      );
    }
    case 'file_rename': {
      const r = record as FileRenameRecord;
      return (
        <div className="card card--file">
          <div className="card__header">
            <div className="card__icon card__icon--file" style={{ color: '#3fb950' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M11.013 1.427a1.75 1.75 0 012.474 0l1.086 1.086a1.75 1.75 0 010 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 01-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61z"/></svg>
            </div>
            <span className="card__type-badge card__type-badge--file">file rename</span>
            <span className="card__time">{relativeTime(r.timestamp)}</span>
          </div>
          <div className="card__body">
            <code className="card__command">{r.oldPath} &rarr; {r.newPath}</code>
            {r.explanation && <p className="card__explanation">{r.explanation}</p>}
          </div>
        </div>
      );
    }
    case 'ai_prompt': {
      const r = record as AiPromptRecord;
      return (
        <div className="card card--ai">
          <div className="card__header">
            <div className="card__icon card__icon--ai" style={{ color: '#a371f7' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0a8 8 0 100 16A8 8 0 008 0zm0 1.5a6.5 6.5 0 110 13 6.5 6.5 0 010-13zM5.25 5.5a.75.75 0 00-1.5 0v5a.75.75 0 001.5 0v-5zm5.5 0a.75.75 0 00-1.5 0v5a.75.75 0 001.5 0v-5z"/></svg>
            </div>
            <span className="card__type-badge card__type-badge--ai">ai prompt</span>
            <span className="card__time">{relativeTime(r.timestamp)}</span>
          </div>
          <div className="card__body">
            <p className="card__explanation" style={{ fontStyle: 'italic' }}>"{r.prompt}"</p>
            {r.response && <p className="card__explanation">{r.response.slice(0, 200)}{r.response.length > 200 ? '...' : ''}</p>}
          </div>
          <div className="card__footer">
            {r.provider && <span className="card__meta">{r.provider}</span>}
            {r.model && <span className="card__meta">{r.model}</span>}
            {r.tokensUsed && <span className="card__meta">{r.tokensUsed} tokens</span>}
          </div>
        </div>
      );
    }
    case 'milestone': {
      const r = record as MilestoneRecord;
      return (
        <div className="card card--milestone">
          <div className="card__header">
            <div className="card__icon card__icon--milestone" style={{ color: '#f78166' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0a8 8 0 100 16A8 8 0 008 0zm3.28 5.22a.75.75 0 010 1.06l-2.72 2.72 2.72 2.72a.75.75 0 11-1.06 1.06L7.5 9.06l-2.72 2.72a.75.75 0 11-1.06-1.06L6.44 8 3.66 5.22a.75.75 0 011.06-1.06L7.5 6.94l2.72-2.72a.75.75 0 011.06 0z"/></svg>
            </div>
            <span className="card__type-badge card__type-badge--milestone">milestone</span>
            <span className="card__time">{relativeTime(r.timestamp)}</span>
          </div>
          <div className="card__body">
            <h4 className="card__title">{r.title}</h4>
            {r.description && <p className="card__explanation">{r.description}</p>}
          </div>
        </div>
      );
    }
    case 'git_action': {
      const r = record as GitActionRecord;
      return (
        <div className="card card--git">
          <div className="card__header">
            <div className="card__icon card__icon--git" style={{ color: '#d2a8ff' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M11.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122V6A2.5 2.5 0 0110 8.5H6a1 1 0 00-1 1v1.128a2.251 2.251 0 11-1.5 0V5.372a2.25 2.25 0 111.5 0v1.836A2.492 2.492 0 016 7h4a1 1 0 001-1v-.628A2.25 2.25 0 019.5 3.25zM4.25 12a.75.75 0 100 1.5.75.75 0 000-1.5zM3.5 3.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0z"/></svg>
            </div>
            <span className="card__type-badge card__type-badge--git">git {r.action}</span>
            <span className="card__time">{relativeTime(r.timestamp)}</span>
          </div>
          <div className="card__body">
            {r.message && <p className="card__explanation">{r.message}</p>}
            {r.explanation && <p className="card__explanation">{r.explanation}</p>}
          </div>
          <div className="card__footer">
            {r.branch && <span className="card__meta">{r.branch}</span>}
            {r.commitHash && <span className="card__meta card__meta--path">{r.commitHash.slice(0, 7)}</span>}
            {r.filesChanged && <span className="card__meta">{r.filesChanged.length} files</span>}
          </div>
        </div>
      );
    }
    default:
      return null;
  }
}

interface SessionTimelineProps {
  sessions: Session[];
  selectedSessionId?: string | null;
  onSelectSession?: (id: string) => void;
}

export const SessionTimeline: React.FC<SessionTimelineProps> = ({
  sessions,
  selectedSessionId,
  onSelectSession,
}) => {
  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  );

  const displaySessions = selectedSessionId
    ? sortedSessions.filter(s => s.id === selectedSessionId)
    : sortedSessions;

  return (
    <div className="timeline">
      {displaySessions.length === 0 && (
        <div className="timeline__empty">
          <p>No sessions recorded yet.</p>
        </div>
      )}

      {displaySessions.map(session => {
        const records = [...session.records].sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        return (
          <div key={session.id} className="timeline__session">
            <div
              className="timeline__session-header"
              onClick={() => onSelectSession?.(selectedSessionId === session.id ? '' : session.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  onSelectSession?.(selectedSessionId === session.id ? '' : session.id);
                }
              }}
            >
              <div className="timeline__session-info">
                <span className="timeline__session-date">{formatDate(session.startedAt)}</span>
                <span className="timeline__session-duration">
                  {formatDuration(session.startedAt, session.endedAt)}
                </span>
              </div>
              <span className="timeline__session-count">
                {records.length} record{records.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="timeline__records">
              {records.map(record => (
                <div key={record.id} className="timeline__record">
                  <div className="timeline__line">
                    <RecordIcon type={record.type} />
                  </div>
                  <div className="timeline__card-wrapper">
                    <GenericRecordCard record={record} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
