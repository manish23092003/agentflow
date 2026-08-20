import React from 'react';

interface Citation {
  id: string;
  title: string;
  url: string;
  provider: string;
  isPaid: boolean;
  costBaseUnits?: number;
  retrievedAt: string;
}

interface CitationListProps {
  citations: Citation[];
}

export const CitationList: React.FC<CitationListProps> = ({ citations }) => {
  const formatUSDC = (baseUnits: number) => {
    return (baseUnits / 1000000).toFixed(2) + ' USDC';
  };

  if (citations.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm mt-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-2 uppercase tracking-wide">Sources</h3>
        <p className="text-sm text-gray-500 italic">No sources collected yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm mt-4 overflow-hidden">
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Sources ({citations.length})</h3>
      </div>
      <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
        {citations.map(c => (
          <div key={c.id} className="p-4 hover:bg-gray-50 transition-colors">
            <div className="flex justify-between items-start mb-1">
              <a 
                href={c.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm font-medium text-blue-600 hover:underline line-clamp-2"
                title={c.title}
              >
                {c.title}
              </a>
              {c.isPaid && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200 whitespace-nowrap">
                  Paid
                </span>
              )}
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="text-xs text-gray-500 flex items-center space-x-2">
                <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600">{c.provider}</span>
                <span>{new Date(c.retrievedAt).toLocaleTimeString()}</span>
              </div>
              {c.isPaid && c.costBaseUnits && (
                <div className="text-xs font-mono font-medium text-gray-700">
                  {formatUSDC(c.costBaseUnits)}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
