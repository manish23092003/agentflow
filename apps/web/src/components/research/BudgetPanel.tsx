import React from 'react';

interface BudgetPanelProps {
  spent: number;
  total: number;
}

export const BudgetPanel: React.FC<BudgetPanelProps> = ({ spent, total }) => {
  const formatUSDC = (baseUnits: number) => {
    return (baseUnits / 1000000).toFixed(2) + ' USDC';
  };

  const remaining = Math.max(0, total - spent);
  const percentSpent = Math.min(100, total > 0 ? (spent / total) * 100 : 0);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">Budget</h3>
      
      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-500">Spent</span>
            <span className="font-mono text-gray-900">{formatUSDC(spent)}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${percentSpent > 90 ? 'bg-red-500' : 'bg-blue-600'}`}
              style={{ width: `${percentSpent}%` }}
            />
          </div>
        </div>

        <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
          <span className="text-sm text-gray-500">Remaining</span>
          <span className="font-mono font-medium text-gray-900">{formatUSDC(remaining)}</span>
        </div>
      </div>
    </div>
  );
};
