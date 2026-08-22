import React from 'react';
import { ResearchSession } from '../../types/research';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface FinalReportProps {
  session: ResearchSession;
}

export const FinalReport: React.FC<FinalReportProps> = ({ session }) => {
  return (
    <div className="py-8 lg:py-12 pr-4 min-h-[500px]">
      <div className="mb-16 border-b border-[var(--color-border-subtle)] pb-12">
        <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-widest mb-6">Final Output</h2>
        <h1 className="text-4xl lg:text-5xl font-display font-semibold text-[var(--color-text-primary)] leading-tight mb-4">{session.goal}</h1>
      </div>
      
      <article className="markdown-report" aria-label="Research report">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {session.report || '*No report content available.*'}
        </ReactMarkdown>
      </article>
    </div>
  );
};
