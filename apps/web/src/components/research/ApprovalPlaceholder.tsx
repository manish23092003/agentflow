import React from 'react';
import { BaseEvent } from '../../types/index.js';

interface ApprovalPlaceholderProps {
  event: BaseEvent | null;
}

export const ApprovalPlaceholder: React.FC<ApprovalPlaceholderProps> = ({ event }) => {
  if (!event || event.type !== 'approval_required') return null;

  const data = event.data;

  const formatUSDC = (baseUnits: number) => {
    return (baseUnits / 1000000).toFixed(2) + ' USDC';
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-6 shadow-sm">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <span className="text-amber-500 text-2xl">⚠️</span>
        </div>
        <div className="ml-4 flex-1">
          <h3 className="text-lg font-medium text-amber-800">Approval Required</h3>
          <p className="text-sm text-amber-700 mt-1">
            The agent has identified a paid resource that exceeds autonomous limits.
          </p>
          
          <div className="mt-4 bg-white bg-opacity-60 rounded p-4 border border-amber-100">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <dt className="text-xs font-medium text-amber-500 uppercase">Service</dt>
                <dd className="mt-1 text-sm text-amber-900 font-medium">{data.service}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-xs font-medium text-amber-500 uppercase">Amount</dt>
                <dd className="mt-1 text-sm text-amber-900 font-mono font-medium">{formatUSDC(data.amount)}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium text-amber-500 uppercase">Reason</dt>
                <dd className="mt-1 text-sm text-amber-900 italic">"{data.reason}"</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium text-amber-500 uppercase">Expected Value</dt>
                <dd className="mt-1 text-sm text-amber-900">{data.expectedValue}</dd>
              </div>
            </dl>
          </div>
          
          <div className="mt-6 border-t border-amber-200 pt-4 flex space-x-4 items-center">
             <div className="text-sm text-amber-600 italic">
               Approval controls will appear here.
             </div>
             <button className="opacity-50 cursor-not-allowed bg-amber-600 text-white px-4 py-2 rounded text-sm font-medium">
               Approve
             </button>
             <button className="opacity-50 cursor-not-allowed bg-white border border-amber-300 text-amber-700 px-4 py-2 rounded text-sm font-medium">
               Reject
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};
