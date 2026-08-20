import React, { useState } from 'react';
import { ApprovalRequest, ResearchSession } from '../../types/research';
import { formatBaseUnits } from '../../utils/currency';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

interface ApprovalDetailsProps {
  approval: ApprovalRequest;
  session: ResearchSession;
}

export const ApprovalDetails: React.FC<ApprovalDetailsProps> = ({ approval, session }) => {
  const [showTechDetails, setShowTechDetails] = useState(false);

  // Display a clean URL label (hostname only for display, full URL on hover)
  const resourceDisplay = (() => {
    try {
      const url = new URL(approval.resourceUrl);
      return url.hostname + (url.pathname !== '/' ? url.pathname : '');
    } catch {
      return approval.resourceUrl;
    }
  })();

  const costDisplay = formatBaseUnits(approval.amount, approval.asset);
  const budgetDisplay = formatBaseUnits(session.researchBudget, approval.asset);
  const spentDisplay = formatBaseUnits(session.spent, approval.asset);
  const percentSpent = session.researchBudget > 0
    ? Math.min(100, (session.spent / session.researchBudget) * 100)
    : 0;

  return (
    <div className="space-y-4 text-sm">

      {/* Q1: What does it want to buy? */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">What does it want to buy?</p>
        <a
          href={approval.resourceUrl}
          target="_blank"
          rel="noreferrer"
          className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 break-all"
          title={approval.resourceUrl}
        >
          <span>{resourceDisplay}</span>
          <ExternalLink size={12} className="shrink-0" aria-hidden="true" />
        </a>
      </div>

      {/* Q2: Why does it need it? */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Why does it need it?</p>
        <p className="text-gray-800 leading-relaxed italic border-l-2 border-gray-300 pl-3">
          {approval.reason || 'The agent did not provide a reason.'}
        </p>
      </div>

      {/* Q3: How much? */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">How much will it cost?</p>
        <p className="text-2xl font-bold text-gray-900">{costDisplay}</p>
        <div className="mt-3">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Budget used so far: {spentDisplay}</span>
            <span>Total budget: {budgetDisplay}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-blue-500 h-1.5 rounded-full"
              style={{ width: `${percentSpent}%` }}
              role="progressbar"
              aria-valuenow={parseFloat(spentDisplay)}
              aria-valuemax={parseFloat(budgetDisplay)}
              aria-label="Budget used"
            />
          </div>
        </div>
      </div>

      {/* Q4: What if I say no? */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">What if I say no?</p>
        <p className="text-gray-600">The agent will continue with the information it already found and write the best report it can.</p>
      </div>

      {/* Collapsible technical details */}
      <div>
        <button
          type="button"
          onClick={() => setShowTechDetails(v => !v)}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 font-medium transition-colors"
          aria-expanded={showTechDetails}
        >
          {showTechDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          Payment details
        </button>
        {showTechDetails && (
          <div className="mt-2 bg-gray-100 rounded-lg border border-gray-200 p-3 text-xs text-gray-600 space-y-1 font-mono">
            <p><span className="text-gray-400">Asset:</span> {approval.asset}</p>
            <p><span className="text-gray-400">Network:</span> {approval.network}</p>
            <p className="break-all"><span className="text-gray-400">Pay to:</span> {approval.payTo}</p>
            <p><span className="text-gray-400">Approval ID:</span> {approval.id}</p>
          </div>
        )}
      </div>
    </div>
  );
};
