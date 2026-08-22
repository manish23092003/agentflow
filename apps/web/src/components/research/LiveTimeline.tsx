import React, { useState } from 'react';
import { BaseEvent } from '../../types/index.js';
import { STATE_PRESENTATION } from '../../utils/statePresentation.js';
import { ResearchState } from '../../types/research.js';

interface LiveTimelineProps {
  events: BaseEvent[];
}

const getEventLabel = (e: BaseEvent): string => {
  switch (e.type) {
    case 'session_state': {
      const status = e.data?.status as ResearchState;
      const p = STATE_PRESENTATION[status];
      return p ? p.label : `Status: ${status}`;
    }
    case 'citation_added': {
      const title = e.data?.title || e.data?.citation?.title;
      const provider = e.data?.providerName || e.data?.provider || e.data?.citation?.providerName || e.data?.citation?.provider;
      if (title) return `Found a source: ${title}`;
      if (provider) return `Found a source from ${provider}`;
      return 'Found a source';
    }
    case 'service_discovered':
      return `Checking a premium source${e.data?.title ? `: ${e.data.title}` : ''}`;
    case 'service_evaluated':
      return 'Compared premium source to research needs';
    case 'approval_required':
      return 'Waiting for your approval';
    case 'payment_started':
      return 'Processing your approved purchase';
    case 'payment_settled':
      return 'Purchase complete';
    case 'resource_acquired':
      return 'Premium source unlocked';
    case 'research_completed':
      return 'Research finished';
    case 'research_failed':
      return 'Research stopped';
    case 'agent_action':
      return 'Agent is working';
    default:
      return e.type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
  }
};

const getEventToneClass = (type: string): string => {
  switch (type) {
    case 'research_completed':
    case 'payment_settled':
    case 'resource_acquired':
      return 'text-[var(--color-success)] border-[var(--color-success-border)] bg-[var(--color-success-bg)]';
    case 'approval_required':
      return 'text-[var(--color-warning)] border-[var(--color-warning-border)] bg-[var(--color-warning-bg)]';
    case 'research_failed':
      return 'text-[var(--color-danger)] border-[var(--color-danger-border)] bg-[var(--color-danger-bg)]';
    default:
      return 'text-[var(--color-text-secondary)] border-[var(--color-border-strong)] bg-[var(--color-bg-surface-hover)]';
  }
};

export const LiveTimeline: React.FC<LiveTimelineProps> = ({ events }) => {
  const [showTechnical, setShowTechnical] = useState(false);
  const reversed = [...events].reverse();

  // Filter events based on toggle
  const displayEvents = reversed.filter(e => {
    if (showTechnical) return true;
    const semanticTypes = [
      'session_state',
      'citation_added',
      'approval_required',
      'payment_started',
      'payment_settled',
      'resource_acquired',
      'research_completed',
      'research_failed'
    ];
    return semanticTypes.includes(e.type);
  });

  return (
    <section aria-label="Agent activity" className="pt-8 border-t border-[var(--color-border-subtle)]">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-widest">Activity</h3>
        <button 
          onClick={() => setShowTechnical(!showTechnical)}
          className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors uppercase tracking-widest font-semibold focus:outline-none"
        >
          {showTechnical ? 'Hide technical' : 'View technical'}
        </button>
      </div>
      <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar" role="log" aria-live="polite" aria-relevant="additions">
        {displayEvents.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)] italic">Waiting for activity…</p>
        ) : (
          displayEvents.map((event, idx) => {
            const isFirst = idx === 0;
            return (
              <div
                key={event.id}
                className={`flex gap-3 ${isFirst ? 'opacity-100' : 'opacity-60'} hover:opacity-100 transition-opacity duration-300 pb-4 relative`}
              >
                <div className="mt-1 shrink-0 relative z-10 bg-[var(--color-bg-base)]">
                  <span className={`inline-block w-2 h-2 rounded-full ${isFirst ? 'bg-[var(--color-accent-primary)] animate-pulse' : 'bg-[var(--color-border-strong)]'}`}></span>
                </div>
                {!isFirst && <div className="absolute left-[3px] top-3 bottom-0 w-px bg-[var(--color-border-subtle)] -z-0"></div>}
                <div className="flex-1 -mt-1">
                  <p className={`text-sm font-medium ${isFirst ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'}`}>
                    {getEventLabel(event)}
                  </p>
                  
                  {showTechnical && event.type === 'agent_action' && event.data?.action && (
                    <p className="text-xs font-mono text-[var(--color-text-muted)] mt-1">
                      {event.data.action}
                    </p>
                  )}

                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  
                  {/* Inline contextual message */}
                  {event.data?.error && (
                    <p className={`text-xs mt-2 px-3 py-2 rounded-md border ${getEventToneClass(event.type)}`}>
                      {event.data.error}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};
