import React from 'react';
import { BaseEvent } from '../../types/index.js';

interface ProcurementContextProps {
  event: BaseEvent | null;
}

export const ProcurementContext: React.FC<ProcurementContextProps> = ({ event }) => {
  if (!event || event.type !== 'service_evaluated') return null;

  const data = event.data;

  const formatUSDC = (baseUnits: number | undefined) => {
    if (baseUnits === undefined) return 'Unknown';
    return (baseUnits / 1000000).toFixed(2) + ' USDC';
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm mt-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">Procurement Context</h3>
      <div className="space-y-3">
        <div>
          <span className="text-xs text-gray-500 uppercase">Service</span>
          <p className="text-sm font-medium text-gray-900">{data.serviceName || 'Unknown Service'}</p>
        </div>
        <div>
          <span className="text-xs text-gray-500 uppercase">Price</span>
          <p className="text-sm font-mono font-medium text-gray-900">{formatUSDC(data.price)}</p>
        </div>
        <div>
          <span className="text-xs text-gray-500 uppercase">Expected Value</span>
          <p className="text-sm text-gray-900">{data.expectedValue || 'Not specified'}</p>
        </div>
        <div>
          <span className="text-xs text-gray-500 uppercase">Reason for Paid</span>
          <p className="text-sm text-gray-900 italic">{data.reason || 'Not specified'}</p>
        </div>
      </div>
    </div>
  );
};
