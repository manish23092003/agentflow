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
  info: 'blue',
  success: 'green',
  warning: 'amber',
  danger: 'red',
  neutral: 'gray'
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

  const color = TONE_COLORS[presentation.tone] || 'gray';

  const spentUsdc = (spent / 1_000_000).toFixed(2);
  const budgetUsdc = (totalBudget / 1_000_000).toFixed(2);
  const percentSpent = totalBudget > 0 ? Math.min(100, (spent / totalBudget) * 100) : 0;

  const getConnectionLabel = (status: ConnectionStatus) => {
    switch (status) {
      case 'CONNECTED': return 'Live';
      case 'RECONNECTING': return 'Reconnecting…';
      case 'DISCONNECTED': return 'Disconnected';
      default: return status;
    }
  };

  const getConnectionColor = (status: ConnectionStatus) => {
    switch (status) {
      case 'CONNECTED': return 'bg-green-500';
      case 'RECONNECTING': return 'bg-amber-500';
      case 'DISCONNECTED': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <header className="border-b border-gray-200 bg-white px-6 py-4">
      {/* Top row: goal + connection */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <h1 className="text-xl font-semibold text-gray-900 leading-snug flex-1">{goal}</h1>
        <div className="flex items-center gap-2 shrink-0 text-xs text-gray-500 pt-1">
          <span
            className={`w-2 h-2 rounded-full ${getConnectionColor(connectionStatus)}`}
            aria-hidden="true"
          />
          <span>{getConnectionLabel(connectionStatus)}</span>
          <span className="text-gray-300">·</span>
          <span>Started {new Date(createdAt).toLocaleString()}</span>
        </div>
      </div>

      {/* Status + budget row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Status badge + description */}
        <div
          className="flex-1"
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-${color}-100 text-${color}-800 border border-${color}-200`}
            >
              {presentation.label}
            </span>
            <span className="text-sm text-gray-600">{presentation.description}</span>
          </div>
        </div>

        {/* Budget */}
        <div className="shrink-0 text-right min-w-[160px]">
          <p className="text-xs text-gray-500 mb-1 font-medium">Budget</p>
          <p className="text-sm font-semibold text-gray-900">
            <span className="text-gray-400">${spentUsdc}</span>
            <span className="text-gray-400 mx-1">of</span>
            <span>${budgetUsdc} USDC</span>
          </p>
          {/* Progress bar */}
          <div className="w-full bg-gray-100 rounded-full h-1 mt-1.5">
            <div
              className={`h-1 rounded-full transition-all duration-500 ${
                percentSpent > 90 ? 'bg-red-500' : percentSpent > 75 ? 'bg-amber-500' : 'bg-blue-500'
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
    </header>
  );
};
