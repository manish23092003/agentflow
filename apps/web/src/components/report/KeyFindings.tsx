import React from 'react';

interface KeyFindingsProps {
  findings?: string[];
}

export const KeyFindings: React.FC<KeyFindingsProps> = ({ findings }) => {
  if (!findings || findings.length === 0) return null;

  return (
    <div className="mb-10">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Key Findings</h2>
      <ul className="space-y-3">
        {findings.map((finding, idx) => (
          <li key={idx} className="flex text-gray-700 leading-relaxed">
            <span className="text-blue-500 mr-3 mt-1.5 flex-shrink-0">•</span>
            <span>{finding}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
