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
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-sm font-medium text-gray-900 mb-4 uppercase tracking-wider">Sources</h3>
        <p className="text-sm text-gray-500">No sources available yet.</p>
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
    <div className="bg-white border border-gray-200 rounded-lg p-6 flex flex-col h-full max-h-[800px]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wider">Sources</h3>
        <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
          {citations.length} items
        </span>
      </div>
      
      <div className="flex-1 overflow-y-auto pr-2 space-y-3">
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
