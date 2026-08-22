import React from 'react';
import { ExternalLink } from 'lucide-react';
import { Citation } from '../../types/research';
import { formatBaseUnits } from '../../utils/currency';
import { getExplorerTxUrl } from '../../utils/explorer';

interface CitationItemProps {
  citation: Citation;
  transactionId?: string;
  index?: number;
}

export const CitationItem: React.FC<CitationItemProps> = ({ citation, transactionId, index }) => {
  const explorerUrl = getExplorerTxUrl(transactionId);
  const costLabel = formatBaseUnits(citation.cost || 0, 'USDC');

  return (
    <div className="group flex flex-col pt-6 pb-2 border-t border-[var(--color-border-subtle)] first:border-t-0 first:pt-0">
      <div className="flex gap-4">
        {index !== undefined && (
          <div className="font-mono text-xs text-[var(--color-text-muted)] mt-1 shrink-0">
            {(index + 1).toString().padStart(2, '0')}
          </div>
        )}
        <div className="flex-1">
          <a 
            href={citation.url} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-base font-medium text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-primary)] transition-colors line-clamp-2 leading-snug mb-2"
          >
            {citation.title || citation.url}
          </a>
          
          <div className="flex items-center gap-3 mt-3 text-xs font-mono">
            <span className="text-[var(--color-text-muted)]">{citation.provider}</span>
            <span className="text-[var(--color-border-strong)]">|</span>
            <span className="text-[var(--color-text-muted)]">{new Date(citation.retrievedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            {citation.isPaid && (
              <>
                <span className="text-[var(--color-border-strong)]">|</span>
                <span className="text-[var(--color-accent-primary)] font-semibold">Premium</span>
                <span className="text-[var(--color-text-primary)]">{costLabel}</span>
              </>
            )}
          </div>
          
          {citation.isPaid && explorerUrl && (
            <div className="mt-2">
              <a 
                href={explorerUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors font-mono"
              >
                <ExternalLink size={12} className="mr-1" />
                Proof of payment
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
