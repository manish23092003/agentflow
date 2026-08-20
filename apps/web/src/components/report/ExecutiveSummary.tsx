import React from 'react';

interface ExecutiveSummaryProps {
  content?: string;
}

export const ExecutiveSummary: React.FC<ExecutiveSummaryProps> = ({ content }) => {
  if (!content) return null;

  return (
    <div className="mb-10">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Executive Summary</h2>
      <div className="prose prose-blue max-w-none text-gray-700 leading-relaxed">
        {content}
      </div>
    </div>
  );
};
