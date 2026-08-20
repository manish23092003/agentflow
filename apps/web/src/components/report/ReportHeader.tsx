import React from 'react';
import { ResearchSession } from '../../types/research';

interface ReportHeaderProps {
  session: ResearchSession;
}

export const ReportHeader: React.FC<ReportHeaderProps> = ({ session }) => {
  return (
    <div className="border-b border-gray-200 pb-6 mb-8">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold tracking-wider text-blue-600 uppercase">
          Final Research Report
        </span>
        <span className="text-sm text-gray-500">
          Completed {new Date(session.updatedAt).toLocaleDateString()}
        </span>
      </div>
      <h1 className="text-3xl font-bold text-gray-900 leading-tight">
        {session.goal}
      </h1>
    </div>
  );
};
