import React from 'react';
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
      const title = e.data?.citation?.title;
      const provider = e.data?.citation?.providerName || e.data?.citation?.provider;
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

const getEventIcon = (type: string): string => {
  switch (type) {
    case 'session_state': return '↻';
    case 'agent_action': return '◉';
    case 'citation_added': return '📄';
    case 'service_discovered': return '🔍';
    case 'service_evaluated': return '⚖';
    case 'approval_required': return '❕';
    case 'payment_started': return '→';
    case 'payment_settled': return '✓';
    case 'resource_acquired': return '🔓';
    case 'research_completed': return '✓';
    case 'research_failed': return '✕';
    default: return '·';
  }
};

const getEventToneClass = (type: string): string => {
  switch (type) {
    case 'research_completed':
    case 'payment_settled':
    case 'resource_acquired':
      return 'bg-green-50 border-green-200 text-green-700';
    case 'approval_required':
      return 'bg-amber-50 border-amber-200 text-amber-700';
    case 'research_failed':
      return 'bg-red-50 border-red-200 text-red-700';
    default:
      return 'bg-gray-50 border-gray-200 text-gray-600';
  }
};

export const LiveTimeline: React.FC<LiveTimelineProps> = ({ events }) => {
  const reversed = [...events].reverse();

  return (
    <section aria-label="Agent activity" className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Agent Activity</h3>
      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1" role="log" aria-live="polite" aria-relevant="additions">
        {reversed.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Waiting for activity…</p>
        ) : (
          reversed.map((event, idx) => (
            <div
              key={event.id}
              className={`relative pl-7 ${idx === 0 ? 'opacity-100' : 'opacity-70'} transition-opacity duration-300`}
            >
              {/* Timeline connector */}
              {idx !== reversed.length - 1 && (
                <div className="absolute left-[10px] top-5 bottom-[-12px] w-px bg-gray-100" aria-hidden="true" />
              )}

              {/* Icon dot */}
              <div
                className={`absolute left-0 top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] border ${
                  idx === 0 ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                }`}
                aria-hidden="true"
              >
                {getEventIcon(event.type)}
              </div>

              {/* Content */}
              <div>
                <p className="text-sm text-gray-800 leading-snug">{getEventLabel(event)}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </p>
                {/* Inline contextual message */}
                {event.data?.error && (
                  <p className={`text-xs mt-1 px-2 py-1 rounded border ${getEventToneClass(event.type)}`}>
                    {event.data.error}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
};
