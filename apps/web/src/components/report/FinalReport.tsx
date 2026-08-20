import React from 'react';
import { ReportHeader } from './ReportHeader';
import { ExecutiveSummary } from './ExecutiveSummary';
import { KeyFindings } from './KeyFindings';
import { ResearchLimitations } from './ResearchLimitations';
import { ResearchSession } from '../../types/research';

interface FinalReportProps {
  session: ResearchSession;
}

export const FinalReport: React.FC<FinalReportProps> = ({ session }) => {
  // Extract potential structured data if backend placed it in session.report
  // The backend might send stringified JSON or just plain text.
  // We parse it safely if it's JSON, or use fallback if missing.
  let executiveSummary: string | undefined;
  let keyFindings: string[] | undefined;
  let limitations: string[] | undefined;

  if (session.report) {
    try {
      const parsed = JSON.parse(session.report);
      executiveSummary = parsed.executiveSummary;
      keyFindings = parsed.keyFindings;
      limitations = parsed.limitations;
    } catch {
      // If it's not JSON, it might just be markdown text.
      // In that case we just render it as Executive Summary.
      executiveSummary = session.report;
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 lg:p-10 min-h-[500px]">
      <ReportHeader session={session} />
      
      <div className="max-w-4xl">
        <ExecutiveSummary content={executiveSummary} />
        
        <KeyFindings findings={keyFindings} />
        
        <ResearchLimitations 
          limitations={limitations} 
          failureReason={session.failureReason} 
        />
      </div>
    </div>
  );
};
