import React from 'react';
import { STATE_PRESENTATION, StatePresentation } from '../../utils/statePresentation.js';
import { ResearchState } from '../../types/index.js';
import { ConnectionStatus } from '../../hooks/useResearchStream.js';

interface WorkspaceHeaderProps {
  goal: string;
  state: ResearchState;
  createdAt: string;
  spent: number;
  totalBudget: number;
  connectionStatus: ConnectionStatus;
}

const TONE_COLORS: Record<StatePresentation['tone'], string> = {
  info: 'text-[var(--color-accent-primary)]',
  success: 'text-[var(--color-success)]',
  warning: 'text-[var(--color-warning)]',
  danger: 'text-[var(--color-danger)]',
  neutral: 'text-[var(--color-text-secondary)]'
};

export const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({
  goal,
  state,
  createdAt,
  spent,
  totalBudget,
  connectionStatus
}) => {
  const presentation = (STATE_PRESENTATION as Record<string, StatePresentation>)[state] || {
    label: state,
    description: 'Processing…',
    detail: '',
    tone: 'neutral' as const,
    icon: null
  };

  const color = TONE_COLORS[presentation.tone] || 'text-[var(--color-text-secondary)]';

  const spentUsdc = (spent / 1_000_000).toFixed(2);
  const budgetUsdc = (totalBudget / 1_000_000).toFixed(2);
  const percentSpent = totalBudget > 0 ? Math.min(100, (spent / totalBudget) * 100) : 0;

  const getConnectionLabel = (status: ConnectionStatus) => {
    switch (status) {
      case 'CONNECTED': return 'Live';
      case 'RECONNECTING': return 'Reconnecting…';
      case 'DISCONNECTED': return 'Offline';
      default: return status;
    }
  };

  const getConnectionColor = (status: ConnectionStatus) => {
    switch (status) {
      case 'CONNECTED': return 'bg-[var(--color-success)]';
      case 'RECONNECTING': return 'bg-[var(--color-warning)]';
      case 'DISCONNECTED': return 'bg-[var(--color-danger)]';
      default: return 'bg-[var(--color-text-muted)]';
    }
  };

  return (
    <header className="border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] px-6 md:px-10 py-6">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-6">
          <div className="flex-1">
            <h1 className="text-xl md:text-2xl font-display font-semibold text-[var(--color-text-primary)] leading-tight mb-2 pr-4">{goal}</h1>
            <div className="flex items-center gap-4 text-xs font-mono uppercase tracking-widest text-[var(--color-text-muted)]">
              <span>{new Date(createdAt).toLocaleDateString()} {new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              <span className="text-[var(--color-border-strong)]">|</span>
              <div className="flex items-center gap-2">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${getConnectionColor(connectionStatus)}`}
                  aria-hidden="true"
                />
                <span>{getConnectionLabel(connectionStatus)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pt-6 border-t border-[var(--color-border-subtle)]">
          <div
            className="flex-1"
            aria-live="polite"
            aria-atomic="true"
          >
            <div className="flex items-center gap-4 flex-wrap">
              <span className={`text-sm font-semibold uppercase tracking-widest ${color}`}>
                {presentation.label}
              </span>
              <span className="text-[var(--color-border-strong)]">|</span>
              <span className="text-sm text-[var(--color-text-secondary)]">{presentation.description}</span>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-4 font-mono">
            <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-widest">Spent</p>
            <p className="text-sm font-medium text-[var(--color-text-primary)]">
              {spentUsdc} / {budgetUsdc} USDC
            </p>
            <div className="w-32 bg-[var(--color-bg-surface-hover)] h-1 rounded-none overflow-hidden ml-2">
              <div
                className={`h-full transition-all duration-500 ${
                  percentSpent > 90 ? 'bg-[var(--color-danger)]' : percentSpent > 75 ? 'bg-[var(--color-warning)]' : 'bg-[var(--color-text-primary)]'
                }`}
                style={{ width: `${percentSpent}%` }}
                role="progressbar"
                aria-valuenow={parseFloat(spentUsdc)}
                aria-valuemax={parseFloat(budgetUsdc)}
                aria-label="Budget utilisation"
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
