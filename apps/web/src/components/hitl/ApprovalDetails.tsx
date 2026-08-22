import React, { useState } from 'react';
import { ApprovalRequest, ResearchSession } from '../../types/research.js';
import { formatBaseUnits } from '../../utils/currency.js';
import { useWallet } from '../../context/WalletContext.js';
import { Wallet, AlertCircle } from 'lucide-react';

interface ApprovalDetailsProps {
  approval: ApprovalRequest;
  session?: ResearchSession;
}

export const ApprovalDetails: React.FC<ApprovalDetailsProps> = ({ approval, session }) => {
  const [showTechDetails, setShowTechDetails] = useState(false);
  const { isConnected, shortAddress, address, connect, isConnecting } = useWallet();

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

  const isPremiumDemo = approval.resourceUrl.includes('/research/premium');
  const titleDisplay = isPremiumDemo ? 'AI Agents Market Growth Report 2026' : resourceDisplay;

  const budgetBefore = session?.researchBudget ? `$${(session.researchBudget / 1000000).toFixed(2)}` : null;
  const budgetAfter = session?.researchBudget ? `$${((session.researchBudget - approval.amount) / 1000000).toFixed(2)}` : null;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[var(--color-accent-subtle)] text-[var(--color-accent-primary)] uppercase tracking-wider">
            🔒 Paid x402 Resource
          </span>
          <span className="text-xs font-medium text-[var(--color-success)]">
            ✓ Within your budget
          </span>
        </div>
        <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-1">
          {titleDisplay}
        </h3>
        <p className="text-sm text-[var(--color-text-secondary)]">
          {isPremiumDemo ? 'Premium research containing market insights, emerging trends and growth analysis.' : 'Verified digital research provider from Bazaar.'}
        </p>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-widest mb-1">Why it is needed</h4>
        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed font-serif italic">
          &ldquo;{approval.reason || 'Public sources lack machine-readable API payloads or complete quantitative datasets.'}&rdquo;
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] rounded">
        <div>
          <div className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider mb-1">Price</div>
          <div className="text-2xl font-mono font-bold text-[var(--color-text-primary)]">{costDisplay}</div>
        </div>
        {budgetBefore && budgetAfter && (
          <div>
            <div className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider mb-1">Budget Impact</div>
            <div className="text-sm font-mono font-semibold text-[var(--color-text-primary)] mt-1">
              {budgetBefore} → {budgetAfter}
            </div>
          </div>
        )}
        <div>
          <div className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider mb-1">Network & Asset</div>
          <div className="text-sm font-medium text-[var(--color-text-primary)] mt-1">Algorand TestNet (USDC)</div>
        </div>
        <div>
          <div className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider mb-1">Payer Wallet</div>
          <div className="text-sm font-mono font-medium text-[var(--color-text-primary)] mt-1 flex items-center gap-1.5">
            <Wallet size={13} className={isConnected ? "text-green" : "text-[var(--color-text-muted)]"} />
            {isConnected ? shortAddress : <span className="text-[var(--color-warning)] font-sans text-xs">Disconnected</span>}
          </div>
        </div>
      </div>

      {!isConnected && (
        <div className="p-3 bg-[var(--color-warning-bg)] border border-[var(--color-warning-border)] text-xs text-[var(--color-warning)] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} className="flex-shrink-0" />
            <span>A wallet is required to purchase this paid resource. Please connect your Pera Wallet to authorize payment.</span>
          </div>
          <button
            type="button"
            onClick={connect}
            disabled={isConnecting}
            className="px-3 py-1.5 bg-[var(--accent)] text-[#14130f] rounded font-semibold text-xs flex items-center gap-1.5 hover:opacity-90 transition-opacity flex-shrink-0"
          >
            <Wallet size={12} />
            Connect Pera Wallet
          </button>
        </div>
      )}

      <div className="p-3 bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] rounded">
        <div className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider mb-1 font-semibold">Alternative</div>
        <p className="text-xs text-[var(--color-text-secondary)]">
          Continue with public sources without the paid resource.
        </p>
      </div>
      
      <div>
        <button
          type="button"
          onClick={() => setShowTechDetails(v => !v)}
          className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] uppercase tracking-widest font-semibold transition-colors focus:outline-none"
          aria-expanded={showTechDetails}
        >
          {showTechDetails ? 'Hide payment details' : 'View payment details'}
        </button>
        {showTechDetails && (
          <div className="mt-4 pt-4 border-t border-[var(--color-border-subtle)] text-xs text-[var(--color-text-secondary)] space-y-2 font-mono">
            <div className="flex gap-4">
              <span className="text-[var(--color-text-muted)] w-28">Resource URL:</span> 
              <span className="text-[var(--color-text-primary)] break-all">{approval.resourceUrl}</span>
            </div>
            <div className="flex gap-4">
              <span className="text-[var(--color-text-muted)] w-28">Asset ID:</span> 
              <span className="text-[var(--color-text-primary)]">{approval.asset} (USDC)</span>
            </div>
            <div className="flex gap-4">
              <span className="text-[var(--color-text-muted)] w-28">Network CAIP-2:</span> 
              <span className="text-[var(--color-text-primary)]">{approval.network}</span>
            </div>
            {approval.payTo && (
              <div className="flex gap-4">
                <span className="text-[var(--color-text-muted)] w-28">Recipient PayTo:</span> 
                <span className="text-[var(--color-text-primary)] break-all">{approval.payTo}</span>
              </div>
            )}
            {address && (
              <div className="flex gap-4">
                <span className="text-[var(--color-text-muted)] w-28">Payer Address:</span> 
                <span className="text-[var(--color-text-primary)] break-all">{address}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
