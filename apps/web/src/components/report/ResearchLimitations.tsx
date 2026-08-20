import React from 'react';

interface ResearchLimitationsProps {
  limitations?: string[];
  failureReason?: string;
}

export const ResearchLimitations: React.FC<ResearchLimitationsProps> = ({ limitations, failureReason }) => {
  if ((!limitations || limitations.length === 0) && !failureReason) return null;

  return (
    <div className="mb-10">
      <h2 className="text-xl font-semibold text-gray-900 mb-4 border-t border-gray-200 pt-6">Research Limitations</h2>
      
      {failureReason && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
          <p className="text-sm font-medium text-red-800">Critical Failure</p>
          <p className="text-sm text-red-700 mt-1">{failureReason}</p>
        </div>
      )}

      {limitations && limitations.length > 0 && (
        <ul className="space-y-3 mt-4">
          {limitations.map((limitation, idx) => (
            <li key={idx} className="flex text-gray-700 leading-relaxed text-sm">
              <span className="text-gray-400 mr-3 mt-1 flex-shrink-0">⚠️</span>
              <span>{limitation}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
