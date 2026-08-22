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
    <div className="py-8 border-t border-[var(--color-border-subtle)]">
      <h3 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-widest mb-6">Procurement Context</h3>
      <div className="space-y-6">
        <div>
          <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-widest mb-1.5 block">Service</span>
          <p className="text-base text-[var(--color-text-primary)]">{data.serviceName || 'Unknown Service'}</p>
        </div>
        <div>
          <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-widest mb-1.5 block">Price</span>
          <p className="text-base font-mono text-[var(--color-text-primary)]">{formatUSDC(data.price)}</p>
        </div>
        <div>
          <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-widest mb-1.5 block">Expected Value</span>
          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{data.expectedValue || 'Not specified'}</p>
        </div>
        <div>
          <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-widest mb-1.5 block">Reason for Paid</span>
          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed italic border-l-2 border-[var(--color-border-strong)] pl-3">
            {data.reason || 'Not specified'}
          </p>
        </div>
      </div>
    </div>
  );
};
