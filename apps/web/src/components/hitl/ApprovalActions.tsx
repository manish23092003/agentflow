import React from 'react';
import { api } from '../../lib/api';
import { Loader2 } from 'lucide-react';

export type ApprovalState = 'PENDING' | 'APPROVING' | 'REJECTING' | 'APPROVED' | 'REJECTED' | 'STALE' | 'FAILED';

interface ApprovalActionsProps {
  approvalId: string;
  currentState: ApprovalState;
  onStateChange: (state: ApprovalState) => void;
  onError: (error: string) => void;
}

export const ApprovalActions: React.FC<ApprovalActionsProps> = ({
  approvalId,
  currentState,
  onStateChange,
  onError
}) => {
  const isPending = currentState === 'PENDING';
  const isWorking = currentState === 'APPROVING' || currentState === 'REJECTING';

  const handleApprove = async () => {
    if (!isPending) return;
    onStateChange('APPROVING');
    try {
      const res = await api.approve(approvalId);
      if (res.status === 'SUCCESS') {
        onStateChange('APPROVED');
      } else {
        onStateChange('FAILED');
        onError(res.reason || 'The purchase could not be approved. Please try again.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('expired') || message.includes('stale')) {
        onStateChange('STALE');
        onError('This approval request has expired. The agent will look for an alternative source.');
      } else {
        onStateChange('FAILED');
        onError('Something went wrong while processing the approval. Please try again.');
      }
    }
  };

  const handleReject = async () => {
    if (!isPending) return;
    onStateChange('REJECTING');
    try {
      const res = await api.reject(approvalId);
      if (res.status === 'REJECTED') {
        onStateChange('REJECTED');
      } else {
        onStateChange('FAILED');
        onError(res.reason || 'The rejection could not be processed. Please try again.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('expired') || message.includes('stale')) {
        onStateChange('STALE');
        onError('This request has already expired.');
      } else {
        onStateChange('FAILED');
        onError('Something went wrong. Please try again.');
      }
    }
  };

  // Post-action confirmation states
  if (currentState === 'APPROVED') {
    return (
      <div className="mt-4 flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800 font-medium">
        <span>✓</span>
        <span>Purchase approved — the agent is continuing your research.</span>
      </div>
    );
  }

  if (currentState === 'REJECTED') {
    return (
      <div className="mt-4 flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
        <span>✕</span>
        <span>Purchase declined — the agent will use the sources it already has.</span>
      </div>
    );
  }

  if (currentState === 'STALE') {
    return (
      <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
        This request has expired. The agent will automatically look for an alternative source.
      </div>
    );
  }

  if (currentState === 'FAILED') {
    return (
      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
        Something went wrong. Please refresh the page and try again.
      </div>
    );
  }

  // Default: PENDING / APPROVING / REJECTING
  return (
    <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
      <button
        id="approval-reject-btn"
        type="button"
        onClick={handleReject}
        disabled={!isPending || isWorking}
        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {currentState === 'REJECTING' ? (
          <span className="flex items-center gap-2">
            <Loader2 size={14} className="animate-spin" aria-hidden="true" />
            Declining…
          </span>
        ) : (
          'Reject & Continue Without It'
        )}
      </button>

      <button
        id="approval-approve-btn"
        type="button"
        onClick={handleApprove}
        disabled={!isPending || isWorking}
        className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
      >
        {currentState === 'APPROVING' ? (
          <>
            <Loader2 size={14} className="animate-spin" aria-hidden="true" />
            Approving…
          </>
        ) : (
          'Approve Purchase'
        )}
      </button>
    </div>
  );
};
