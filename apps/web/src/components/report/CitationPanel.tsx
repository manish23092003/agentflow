import React from 'react';
import { Citation, PaymentRecord } from '../../types/research';
import { CitationItem } from './CitationItem';

interface CitationPanelProps {
  citations: Citation[];
  payments: PaymentRecord[];
}

export const CitationPanel: React.FC<CitationPanelProps> = ({ citations, payments }) => {
  if (!citations || citations.length === 0) {
    return (
      <div className="py-8 border-t border-[var(--color-border-subtle)]">
        <h3 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-widest mb-4">Sources</h3>
        <p className="text-sm text-[var(--color-text-muted)] italic">No sources available yet.</p>
      </div>
    );
  }

  // Helper to find transaction ID for a paid citation
  const getTransactionIdForCitation = (citation: Citation) => {
    if (!citation.isPaid || !citation.purchaseId) return undefined;
    const payment = payments.find(p => p.id === citation.purchaseId);
    return payment?.transactionId;
  };

  return (
    <div className="py-8 border-t border-[var(--color-border-subtle)] flex flex-col h-full max-h-[800px]">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-widest">Sources ({citations.length})</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar">
        {citations.map((citation, index) => (
          <CitationItem 
            key={citation.id} 
            citation={citation} 
            index={index}
            transactionId={getTransactionIdForCitation(citation)} 
          />
        ))}
      </div>
    </div>
  );
};
