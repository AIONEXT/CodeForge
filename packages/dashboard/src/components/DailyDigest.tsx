import React, { useMemo } from 'react';
import type { Session, Record as CodeforgeRecord } from '../types';

interface DailyDigestProps {
  sessions: Session[];
}

function getRecordsByDay(sessions: Session[]): Map<string, CodeforgeRecord[]> {
  const byDay = new Map<string, Record[]>();
  for (const session of sessions) {
    for (const record of session.records) {
      const day = new Date(record.timestamp).toISOString().split('T')[0];
      const existing = byDay.get(day) || [];
      existing.push(record);
      byDay.set(day, existing);
    }
  }
  return byDay;
}

function computeStats(records: CodeforgeRecord[]) {
  const byType: Record<string, number> = {
    terminal_command: 0,
    error: 0,
    file_save: 0,
    file_rename: 0,
    ai_prompt: 0,
    milestone: 0,
    git_action: 0,
  };

  let errorsResolved = 0;
  let errorsTotal = 0;

  for (const r of records) {
    byType[r.type] = (byType[r.type] || 0) + 1;
    if (r.type === 'error') {
      errorsTotal++;
      if ((r as { resolved?: boolean }).resolved) errorsResolved++;
    }
  }

  return { byType, errorsResolved, errorsTotal };
}

function formatDayLabel(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((today.getTime() - target.getTime()) / 86400000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

const TYPE_COLORS: Record<string, string> = {
  terminal_command: '#58a6ff',
  error: '#f85149',
  file_save: '#3fb950',
  file_rename: '#3fb950',
  ai_prompt: '#a371f7',
  milestone: '#f78166',
  git_action: '#d2a8ff',
};

const TYPE_LABELS: Record<string, string> = {
  terminal_command: 'Commands',
  error: 'Errors',
  file_save: 'File Saves',
  file_rename: 'Renames',
  ai_prompt: 'AI Prompts',
  milestone: 'Milestones',
  git_action: 'Git Actions',
};

export const DailyDigest: React.FC<DailyDigestProps> = ({ sessions }) => {
  const dayEntries = useMemo(() => {
    const byDay = getRecordsByDay(sessions);
    return Array.from(byDay.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 14);
  }, [sessions]);

  const overallStats = useMemo(() => {
    const allRecords = sessions.flatMap(s => s.records);
    return computeStats(allRecords);
  }, [sessions]);

  const totalRecords = sessions.reduce((sum, s) => sum + s.records.length, 0);

  return (
    <div className="digest">
      <div className="digest__header">
        <h2 className="digest__title">Daily Digest</h2>
        <span className="digest__subtitle">{sessions.length} session{sessions.length !== 1 ? 's' : ''} &middot; {totalRecords} record{totalRecords !== 1 ? 's' : ''}</span>
      </div>

      <div className="digest__overview">
        {Object.entries(overallStats.byType).map(([type, count]) => {
          if (count === 0) return null;
          return (
            <div key={type} className="digest__stat">
              <div
                className="digest__stat-bar"
                style={{
                  backgroundColor: TYPE_COLORS[type],
                  width: `${Math.max(8, (count / Math.max(totalRecords, 1)) * 100)}%`,
                }}
              />
              <span className="digest__stat-label">{TYPE_LABELS[type]}</span>
              <span className="digest__stat-value" style={{ color: TYPE_COLORS[type] }}>{count}</span>
            </div>
          );
        })}
        {overallStats.errorsTotal > 0 && (
          <div className="digest__stat">
            <div
              className="digest__stat-bar"
              style={{
                backgroundColor: overallStats.errorsResolved === overallStats.errorsTotal ? '#3fb950' : '#d29922',
                width: `${Math.max(8, (overallStats.errorsResolved / overallStats.errorsTotal) * 100)}%`,
              }}
            />
            <span className="digest__stat-label">Errors Resolved</span>
            <span className="digest__stat-value">
              {overallStats.errorsResolved}/{overallStats.errorsTotal}
            </span>
          </div>
        )}
      </div>

      <div className="digest__days">
        {dayEntries.map(([day, records]) => {
          const stats = computeStats(records);
          const sessionCount = sessions.filter(s =>
            s.records.some(r => r.timestamp.startsWith(day))
          ).length;

          return (
            <div key={day} className="digest__day">
              <div className="digest__day-header">
                <h4 className="digest__day-label">{formatDayLabel(day)}</h4>
                <span className="digest__day-meta">
                  {sessionCount} session{sessionCount !== 1 ? 's' : ''} &middot; {records.length} record{records.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="digest__day-bars">
                {Object.entries(stats.byType).map(([type, count]) => {
                  if (count === 0) return null;
                  return (
                    <div
                      key={type}
                      className="digest__day-bar"
                      style={{ backgroundColor: TYPE_COLORS[type], width: `${count}px` }}
                      title={`${TYPE_LABELS[type]}: ${count}`}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
