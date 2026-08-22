import React from 'react';
import { formatBaseUnits } from '../../utils/currency';

interface ExpenseSummaryProps {
  budget: number;
  spent: number;
}

export const ExpenseSummary: React.FC<ExpenseSummaryProps> = ({ budget, spent }) => {
  const remaining = Math.max(0, budget - spent);
  const percentSpent = Math.min(100, budget > 0 ? (spent / budget) * 100 : 0);

  let barColor = 'bg-[var(--color-text-primary)]';
  let remainingColor = 'text-[var(--color-success)]';
  if (percentSpent > 90) {
    barColor = 'bg-[var(--color-danger)]';
    remainingColor = 'text-[var(--color-danger)]';
  } else if (percentSpent > 75) {
    barColor = 'bg-[var(--color-warning)]';
    remainingColor = 'text-[var(--color-warning)]';
  }

  return (
    <section aria-label="Budget summary" className="py-8 border-t border-[var(--color-border-subtle)]">
      <h3 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-widest mb-6">Budget</h3>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between text-xs font-mono text-[var(--color-text-muted)] uppercase tracking-widest mb-2">
          <span>Utilization</span>
          <span className={percentSpent > 75 ? (percentSpent > 90 ? 'text-[var(--color-danger)] font-semibold' : 'text-[var(--color-warning)] font-semibold') : ''}>
            {percentSpent.toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-[var(--color-bg-surface-hover)] h-1" role="presentation">
          <div
            className={`h-1 transition-all duration-500 ${barColor}`}
            style={{ width: `${percentSpent}%` }}
            role="progressbar"
            aria-valuenow={spent}
            aria-valuemax={budget}
            aria-label="Budget used"
          />
        </div>
      </div>

      {/* Figures */}
      <dl className="grid grid-cols-3 gap-6 font-mono text-xs">
        <div>
          <dt className="text-[var(--color-text-muted)] uppercase tracking-widest mb-1.5">Limit</dt>
          <dd className="text-sm font-medium text-[var(--color-text-primary)]">{formatBaseUnits(budget, 'USDC')}</dd>
        </div>
        <div>
          <dt className="text-[var(--color-text-muted)] uppercase tracking-widest mb-1.5">Spent</dt>
          <dd className="text-sm font-medium text-[var(--color-text-secondary)]">{formatBaseUnits(spent, 'USDC')}</dd>
        </div>
        <div>
          <dt className="text-[var(--color-text-muted)] uppercase tracking-widest mb-1.5">Left</dt>
          <dd className={`text-sm font-medium ${remainingColor}`}>{formatBaseUnits(remaining, 'USDC')}</dd>
        </div>
      </dl>
    </section>
  );
};
