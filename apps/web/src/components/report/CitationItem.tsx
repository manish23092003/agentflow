import React from 'react';
import { ExternalLink, Link2, Clock } from 'lucide-react';
import { Citation } from '../../types/research';
import { SourceBadge } from './SourceBadge';
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
    <div className="flex flex-col p-4 bg-white border border-gray-100 rounded-md hover:border-gray-200 transition-colors shadow-sm">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          {index !== undefined && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-xs text-gray-600 font-medium">
              {index + 1}
            </span>
          )}
          <SourceBadge isPaid={citation.isPaid} costBaseUnits={citation.cost} />
        </div>
        
        <div className="text-xs text-gray-400 flex items-center">
          <Clock size={12} className="mr-1" />
          {new Date(citation.retrievedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      <h4 className="text-sm font-medium text-gray-900 mb-1 line-clamp-2">
        {citation.title || citation.url}
      </h4>

      <div className="flex items-center text-xs text-gray-500 mb-3 truncate">
        <Link2 size={12} className="mr-1 flex-shrink-0" />
        <a href={citation.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 hover:underline truncate">
          {citation.url}
        </a>
      </div>

      <div className="flex flex-wrap items-center justify-between mt-auto pt-2 border-t border-gray-50">
        <span className="text-xs font-medium text-gray-500 uppercase">
          {citation.provider}
        </span>

        {citation.isPaid && (
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-gray-900">
              {costLabel}
            </span>
            {explorerUrl && (
              <a 
                href={explorerUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                View transaction
                <ExternalLink size={12} className="ml-1" />
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
