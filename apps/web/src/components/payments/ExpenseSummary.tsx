import React from 'react';
import { formatBaseUnits } from '../../utils/currency';

interface ExpenseSummaryProps {
  budget: number;
  spent: number;
}

export const ExpenseSummary: React.FC<ExpenseSummaryProps> = ({ budget, spent }) => {
  const remaining = Math.max(0, budget - spent);
  const percentSpent = Math.min(100, budget > 0 ? (spent / budget) * 100 : 0);

  let barColor = 'bg-green-500';
  let remainingColor = 'text-green-600';
  if (percentSpent > 90) {
    barColor = 'bg-red-500';
    remainingColor = 'text-red-600';
  } else if (percentSpent > 75) {
    barColor = 'bg-amber-500';
    remainingColor = 'text-amber-600';
  }

  return (
    <section aria-label="Budget summary" className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Budget</h3>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-500 mb-1.5">
          <span>Used</span>
          <span className={percentSpent > 75 ? (percentSpent > 90 ? 'text-red-600 font-medium' : 'text-amber-600 font-medium') : ''}>
            {percentSpent.toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2" role="presentation">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${percentSpent}%` }}
            role="progressbar"
            aria-valuenow={spent}
            aria-valuemax={budget}
            aria-label="Budget used"
          />
        </div>
      </div>

      {/* Figures */}
      <dl className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-gray-50 rounded-md p-2 border border-gray-100">
          <dt className="text-xs text-gray-400 mb-1">Budget</dt>
          <dd className="text-sm font-bold text-gray-900">{formatBaseUnits(budget, 'USDC')}</dd>
        </div>
        <div className="bg-gray-50 rounded-md p-2 border border-gray-100">
          <dt className="text-xs text-gray-400 mb-1">Spent</dt>
          <dd className="text-sm font-bold text-gray-700">{formatBaseUnits(spent, 'USDC')}</dd>
        </div>
        <div className="bg-gray-50 rounded-md p-2 border border-gray-100">
          <dt className="text-xs text-gray-400 mb-1">Left</dt>
          <dd className={`text-sm font-bold ${remainingColor}`}>{formatBaseUnits(remaining, 'USDC')}</dd>
        </div>
      </dl>
    </section>
  );
};
