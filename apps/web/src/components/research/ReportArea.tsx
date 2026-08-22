import React from 'react';
import { ResearchState } from '../../types/index.js';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ReportAreaProps {
  state: ResearchState;
  reportContent?: string;
  failureReason?: string;
}

interface Step {
  state: ResearchState;
  label: string;
}

// Ordered list of "happy path" steps a user can relate to
const PROGRESS_STEPS: Step[] = [
  { state: ResearchState.RESEARCHING_FREE,      label: 'Searching public sources' },
  { state: ResearchState.FREE_RESEARCH_COMPLETE, label: 'Public sources collected' },
  { state: ResearchState.EVALUATING_GAPS,        label: 'Checking what information is still missing' },
  { state: ResearchState.PAID_DISCOVERY,         label: 'Looking for additional sources' },
  { state: ResearchState.SERVICE_EVALUATION,     label: 'Comparing available sources' },
  { state: ResearchState.PENDING_APPROVAL,       label: 'Waiting for your approval' },
  { state: ResearchState.PAYMENT_AUTHORIZED,     label: 'Purchase approved' },
  { state: ResearchState.PAYING,                 label: 'Processing purchase' },
  { state: ResearchState.RESOURCE_ACQUIRED,      label: 'Premium source unlocked' },
  { state: ResearchState.SYNTHESIZING,           label: 'Writing your report' },
];

// State order index for "has this state been passed?"
const STATE_ORDER: Record<string, number> = {};
PROGRESS_STEPS.forEach((s, i) => { STATE_ORDER[s.state] = i; });
// Terminal states
STATE_ORDER[ResearchState.COMPLETED] = PROGRESS_STEPS.length;
STATE_ORDER[ResearchState.FAILED] = PROGRESS_STEPS.length;
STATE_ORDER[ResearchState.USER_REJECTED] = PROGRESS_STEPS.length;
STATE_ORDER[ResearchState.ALTERNATIVE_DISCOVERY] = STATE_ORDER[ResearchState.PAID_DISCOVERY];

const currentStateIndex = (state: ResearchState): number => STATE_ORDER[state] ?? -1;

// Which steps are relevant to the current happy path?
// We hide PAID, SERVICE, APPROVAL, PAYING, RESOURCE if we're already at SYNTHESIZING
// without having passed through them — i.e. the simple path (no paid source needed).
const isFreeOnlyPath = (state: ResearchState): boolean => {
  const simple = [
    ResearchState.CREATED,
    ResearchState.RESEARCHING_FREE,
    ResearchState.FREE_RESEARCH_COMPLETE,
    ResearchState.EVALUATING_GAPS,
    ResearchState.SYNTHESIZING,
    ResearchState.COMPLETED,
  ];
  return simple.includes(state);
};

const SIMPLE_STEPS: Step[] = [
  { state: ResearchState.RESEARCHING_FREE,       label: 'Searching public sources' },
  { state: ResearchState.FREE_RESEARCH_COMPLETE, label: 'Public sources collected' },
  { state: ResearchState.EVALUATING_GAPS,        label: 'Checking what information is still missing' },
  { state: ResearchState.SYNTHESIZING,           label: 'Writing your report' },
];

const FailedDetail: React.FC<{ failureReason?: string }> = ({ failureReason }) => {
  const [expanded, setExpanded] = React.useState(false);

  const isQuotaError = failureReason?.toLowerCase().includes('quota') || failureReason?.toLowerCase().includes('429');

  const friendlyMessage = (): string => {
    if (!failureReason) return 'An unexpected error occurred.';
    if (isQuotaError) {
      return 'AI research is temporarily unavailable because the Gemini quota has been reached.';
    }
    if (failureReason.toLowerCase().includes('no tool call') || failureReason.toLowerCase().includes('llm')) {
      return 'The AI model did not return a usable response.';
    }
    if (failureReason.toLowerCase().includes('citation') || failureReason.toLowerCase().includes('0 citation')) {
      return 'No useful information was found in the search results.';
    }
    if (failureReason.toLowerCase().includes('timeout')) {
      return 'The research took too long and timed out.';
    }
    return 'An error occurred during the research process.';
  };

  return (
    <div className="bg-[var(--color-danger-bg)] border border-[var(--color-danger-border)] p-8">
      <div className="flex items-start gap-4 mb-6">
        <XCircle size={24} className="text-[var(--color-danger)] shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <h3 className="text-xl font-display font-semibold text-[var(--color-danger)] mb-2 uppercase tracking-wide">Research Error</h3>
          <p className="text-base text-[var(--color-danger)] opacity-90">{friendlyMessage()}</p>
        </div>
      </div>

      <div className="pl-10 space-y-6">
        <div>
          <p className="text-sm font-semibold text-[var(--color-danger)] uppercase tracking-widest mb-3 opacity-80">Suggested Actions</p>
          <ul className="list-disc list-inside text-[var(--color-danger)] opacity-90 space-y-2">
            {isQuotaError ? (
              <li>Retry later when the quota resets</li>
            ) : (
              <>
                <li>Try rephrasing your research question</li>
                <li>Start a new research session with a slightly different topic</li>
                <li>Check that the API keys are configured correctly if the problem persists</li>
              </>
            )}
          </ul>
        </div>

        {failureReason && (
          <div>
            <button
              type="button"
              onClick={() => setExpanded(e => !e)}
              className="text-xs text-[var(--color-danger)] uppercase tracking-widest font-semibold hover:opacity-70 transition-opacity focus:outline-none"
              aria-expanded={expanded}
            >
              {expanded ? 'Hide technical details' : 'View technical details'}
            </button>
            {expanded && (
              <pre className="mt-4 text-xs text-[var(--color-danger)] bg-black/10 p-4 font-mono overflow-auto whitespace-pre-wrap break-words">
                {failureReason}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const ReportArea: React.FC<ReportAreaProps> = ({ state, reportContent, failureReason }) => {
  if (state === 'FAILED' as ResearchState) {
    return <FailedDetail failureReason={failureReason} />;
  }

  if (state === 'COMPLETED' as ResearchState) {
    return (
      <div className="min-h-[400px] p-2">
        {reportContent ? (
          <article className="markdown-report" aria-label="Research report">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {reportContent}
            </ReactMarkdown>
          </article>
        ) : (
          <div className="text-center py-24">
            <CheckCircle2 size={48} className="text-[var(--color-success)] mx-auto mb-6" aria-hidden="true" />
            <p className="text-2xl font-display font-semibold text-[var(--color-text-primary)]">Research Complete</p>
            <p className="text-[var(--color-text-secondary)] text-base mt-3">The report will appear here.</p>
          </div>
        )}
      </div>
    );
  }

  // In-progress state — show progress checklist
  const simpleMode = isFreeOnlyPath(state);
  const steps = simpleMode ? SIMPLE_STEPS : PROGRESS_STEPS;
  const currentIdx = currentStateIndex(state);

  return (
    <div className="p-2">
      <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-widest mb-10">Compilation Progress</h2>
      <ol className="space-y-6" aria-label="Research progress">
        {steps.map((step) => {
          const stepIdx = STATE_ORDER[step.state] ?? 0;
          const isCurrent = step.state === state;
          const isDone = stepIdx < currentIdx && !isCurrent;

          return (
            <li key={step.state} className={`flex items-center gap-6 ${!isDone && !isCurrent ? 'opacity-40' : ''}`}>
              <div className="shrink-0 font-mono text-sm w-6 text-center">
                {isDone ? (
                  <span className="text-[var(--color-text-muted)]">✓</span>
                ) : isCurrent ? (
                  <Loader2 size={16} className="text-[var(--color-accent-primary)] animate-spin inline" aria-label="In progress" />
                ) : (
                  <span className="text-[var(--color-text-muted)]">-</span>
                )}
              </div>
              <span
                className={`text-lg font-medium tracking-wide ${
                  isCurrent ? 'text-[var(--color-accent-primary)]' : 'text-[var(--color-text-primary)]'
                }`}
              >
                {step.label}
              </span>
            </li>
          );
        })}
        {/* Final step always shown */}
        <li className={`flex items-center gap-6 ${(state as string) === 'COMPLETED' ? '' : 'opacity-40'}`}>
          <div className="shrink-0 font-mono text-sm w-6 text-center">
             {(state as string) === 'COMPLETED' ? (
                <span className="text-[var(--color-text-muted)]">✓</span>
              ) : (
                <span className="text-[var(--color-text-muted)]">-</span>
              )}
          </div>
          <span className="text-lg font-medium tracking-wide text-[var(--color-text-primary)]">
            Report ready
          </span>
        </li>
      </ol>
    </div>
  );
};
