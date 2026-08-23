import React, { useState, useEffect } from 'react';
import { ApprovalRequest, ResearchSession } from '../../types/research';
import { ApprovalDetails } from './ApprovalDetails';
import { ApprovalActions, ApprovalState } from './ApprovalActions';
import { api } from '../../lib/api';
import { AlertCircle } from 'lucide-react';
import { formatBaseUnits } from '../../utils/currency';

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
      <div className="mb-12 border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-8 animate-pulse" aria-busy="true">
        <div className="h-4 bg-[var(--color-border-strong)] rounded w-1/3 mb-6" />
        <div className="h-10 bg-[var(--color-border-subtle)] rounded w-full mb-3" />
        <div className="h-10 bg-[var(--color-border-subtle)] rounded w-full" />
      </div>
    );
  }

  if (!approval) {
    return (
      <div className="mb-12 bg-[var(--color-danger-bg)] border border-[var(--color-danger-border)] p-8" role="alert">
        <div className="flex items-center gap-2 text-[var(--color-danger)] mb-2">
          <AlertCircle size={18} aria-hidden="true" />
          <h3 className="font-semibold text-base">Could not load approval</h3>
        </div>
        <p className="text-sm text-[var(--color-danger)] opacity-90">{error || 'Unknown error. Please refresh the page.'}</p>
      </div>
    );
  }

  return (
    <div
      className="mb-12 border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] p-8 relative overflow-hidden"
      role="dialog"
      aria-labelledby="approval-heading"
      aria-describedby="approval-description"
    >
      <div className="absolute top-0 left-0 w-1 h-full bg-[var(--color-warning)]" aria-hidden="true" />

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
        <div>
          <h2 id="approval-heading" className="text-3xl font-display font-semibold text-[var(--color-text-primary)] mb-2">
            YOUR APPROVAL IS NEEDED
          </h2>
          <p id="approval-description" className="text-base text-[var(--color-text-secondary)]">
            A premium source was found.
          </p>
        </div>
      </div>

      {error && currentState === 'FAILED' && (
        <div className="mb-6 p-4 bg-[var(--color-danger-bg)] border border-[var(--color-danger-border)] text-[var(--color-danger)] text-sm rounded-none" role="alert">
          {error}
        </div>
      )}

      <ApprovalDetails approval={approval} session={session} />

      <div className="mt-8 pt-6 border-t border-[var(--color-warning-border)]">
        <ApprovalActions
          approval={approval}
          currentState={currentState}
          costDisplay={formatBaseUnits(approval.amount, approval.asset)}
          onStateChange={setCurrentState}
          onError={setError}
        />
      </div>
    </div>
  );
};
