import React from 'react';
import { ResearchState } from '../../types/index.js';
import { CheckCircle2, Circle, Loader2, XCircle, ChevronDown, ChevronUp } from 'lucide-react';

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

  const friendlyMessage = (): string => {
    if (!failureReason) return 'An unexpected error occurred.';
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
    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
      <div className="flex items-start gap-3 mb-4">
        <XCircle size={22} className="text-red-500 shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <h3 className="text-base font-semibold text-red-800">Research couldn&apos;t be completed</h3>
          <p className="text-sm text-red-700 mt-1">{friendlyMessage()}</p>
        </div>
      </div>

      <div className="pl-8 space-y-3 text-sm">
        <div className="bg-white border border-red-100 rounded p-3">
          <p className="font-medium text-gray-700 mb-1">What you can do</p>
          <ul className="list-disc list-inside text-gray-600 space-y-1">
            <li>Try rephrasing your research question</li>
            <li>Start a new research session with a slightly different topic</li>
            <li>Check that the API keys are configured correctly if the problem persists</li>
          </ul>
        </div>

        {failureReason && (
          <div>
            <button
              type="button"
              onClick={() => setExpanded(e => !e)}
              className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 font-medium"
              aria-expanded={expanded}
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              Technical details
            </button>
            {expanded && (
              <pre className="mt-2 text-xs text-red-700 bg-red-100 p-3 rounded overflow-auto whitespace-pre-wrap break-words">
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
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm min-h-[200px] p-8">
        {reportContent ? (
          <article className="prose prose-gray max-w-none" aria-label="Research report">
            <div dangerouslySetInnerHTML={{ __html: reportContent }} />
          </article>
        ) : (
          <div className="text-center py-12">
            <CheckCircle2 size={40} className="text-green-500 mx-auto mb-3" aria-hidden="true" />
            <p className="text-xl font-medium text-gray-900">Research Complete</p>
            <p className="text-gray-500 text-sm mt-2">The report will appear here.</p>
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
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 min-h-[300px]">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-6">Progress</h2>
      <ol className="space-y-4" aria-label="Research progress">
        {steps.map((step) => {
          const stepIdx = STATE_ORDER[step.state] ?? 0;
          const isCurrent = step.state === state;
          const isDone = stepIdx < currentIdx && !isCurrent;


          return (
            <li key={step.state} className="flex items-center gap-3">
              {isDone ? (
                <CheckCircle2 size={20} className="text-green-500 shrink-0" aria-label="Complete" />
              ) : isCurrent ? (
                <Loader2 size={20} className="text-blue-500 shrink-0 animate-spin" aria-label="In progress" />
              ) : (
                <Circle size={20} className="text-gray-300 shrink-0" aria-label="Pending" />
              )}
              <span
                className={`text-sm ${
                  isDone ? 'text-gray-500 line-through-none' :
                  isCurrent ? 'text-gray-900 font-medium' :
                  'text-gray-400'
                }`}
              >
                {step.label}
              </span>
              {isCurrent && (
                <span className="ml-auto text-xs text-blue-500 font-medium animate-pulse">Now</span>
              )}
            </li>
          );
        })}
        {/* Final step always shown */}
        <li className="flex items-center gap-3">
          {(state as string) === 'COMPLETED' ? (
            <CheckCircle2 size={20} className="text-green-500 shrink-0" />
          ) : (
            <Circle size={20} className="text-gray-300 shrink-0" />
          )}
          <span className={`text-sm ${(state as string) === 'COMPLETED' ? 'text-gray-500' : 'text-gray-400'}`}>
            Report ready
          </span>
        </li>
      </ol>
    </div>
  );
};
