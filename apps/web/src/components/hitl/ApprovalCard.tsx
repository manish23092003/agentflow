import React, { useState, useEffect } from 'react';
import { ApprovalRequest, ResearchSession } from '../../types/research';
import { ApprovalDetails } from './ApprovalDetails';
import { ApprovalActions, ApprovalState } from './ApprovalActions';
import { api } from '../../lib/api';
import { AlertCircle } from 'lucide-react';

interface ApprovalCardProps {
  approvalId?: string;
  session: ResearchSession;
}

export const ApprovalCard: React.FC<ApprovalCardProps> = ({ approvalId, session }) => {
  const [approval, setApproval] = useState<ApprovalRequest | null>(null);
  const [currentState, setCurrentState] = useState<ApprovalState>('PENDING');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!approvalId) return;

    let isMounted = true;
    setLoading(true);

    api.getApproval(approvalId)
      .then(data => {
        if (!isMounted) return;
        setApproval(data);
        if (data.status === 'PENDING') setCurrentState('PENDING');
        else if (data.status === 'APPROVED') setCurrentState('APPROVED');
        else if (data.status === 'REJECTED' || data.status === 'CANCELLED') setCurrentState('REJECTED');
        else if (data.status === 'EXPIRED') setCurrentState('STALE');
        setLoading(false);
      })
      .catch(err => {
        if (!isMounted) return;
        setError(err.message || 'Failed to load the approval details.');
        setCurrentState('FAILED');
        setLoading(false);
      });

    return () => { isMounted = false; };
  }, [approvalId]);

  if (!approvalId) return null;

  if (loading) {
    return (
      <div className="bg-white border-2 border-amber-300 rounded-lg p-6 shadow-sm animate-pulse" aria-busy="true">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
        <div className="h-10 bg-gray-100 rounded w-full mb-3" />
        <div className="h-10 bg-gray-100 rounded w-full" />
      </div>
    );
  }

  if (!approval) {
    return (
      <div className="bg-white border border-red-200 rounded-lg p-6 shadow-sm" role="alert">
        <div className="flex items-center gap-2 text-red-700 mb-1">
          <AlertCircle size={16} aria-hidden="true" />
          <h3 className="font-semibold text-sm">Could not load approval</h3>
        </div>
        <p className="text-sm text-red-600">{error || 'Unknown error. Please refresh the page.'}</p>
      </div>
    );
  }

  return (
    <div
      className="bg-white border-2 border-amber-400 rounded-lg shadow-md overflow-hidden"
      role="dialog"
      aria-labelledby="approval-heading"
      aria-describedby="approval-description"
    >
      {/* Accent bar */}
      <div className="h-1 bg-amber-400 w-full" aria-hidden="true" />

      <div className="p-6">
        <div className="flex items-start justify-between mb-3 gap-3">
          <div>
            <h2 id="approval-heading" className="text-lg font-semibold text-gray-900">
              Your approval is needed
            </h2>
            <p id="approval-description" className="text-sm text-gray-500 mt-1">
              The agent found a source that could improve your research, but it costs money. Review it and decide.
            </p>
          </div>
          <span className="shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200 whitespace-nowrap">
            Action needed
          </span>
        </div>

        {error && currentState === 'FAILED' && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg" role="alert">
            {error}
          </div>
        )}

        <ApprovalDetails approval={approval} session={session} />

        <ApprovalActions
          approvalId={approval.id}
          currentState={currentState}
          onStateChange={setCurrentState}
          onError={setError}
        />
      </div>
    </div>
  );
};
