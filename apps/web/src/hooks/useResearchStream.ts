import { useState, useEffect, useCallback, useRef } from 'react';
import { BaseEvent } from '../types/index.js';
import { API_BASE } from '../lib/api.js';

export type ConnectionStatus = 'CONNECTED' | 'RECONNECTING' | 'DISCONNECTED';

export interface UseResearchStreamResult {
  events: BaseEvent[];
  connectionStatus: ConnectionStatus;
  reconnect: () => void;
}

export function useResearchStream(sessionId: string | undefined): UseResearchStreamResult {
  const [events, setEvents] = useState<BaseEvent[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('DISCONNECTED');
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const connect = useCallback(() => {
    if (!sessionId) return;
    
    // Cleanup any existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    setConnectionStatus(reconnectAttemptsRef.current > 0 ? 'RECONNECTING' : 'DISCONNECTED');

    const eventSource = new EventSource(`${API_BASE}/research/${sessionId}/stream`, { withCredentials: true });
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setConnectionStatus('CONNECTED');
      reconnectAttemptsRef.current = 0;
    };

    eventSource.onerror = () => {
      eventSource.close();
      setConnectionStatus('RECONNECTING');
      
      // Exponential backoff: 1s, 2s, 4s, 8s, up to 30s
      const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
      reconnectAttemptsRef.current++;
      
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, delay);
    };

    // Generic message handler for standard events without specific event name
    eventSource.onmessage = (e) => {
      // Keep-alives are just empty lines or comments, which might trigger onmessage with empty data
      if (!e.data || e.data === '') return;
      try {
        const parsed = JSON.parse(e.data) as BaseEvent;
        if (parsed && parsed.type && parsed.id) {
          setEvents(prev => {
            // Deduplicate by ID
            if (prev.some(ev => ev.id === parsed.id)) return prev;
            return [...prev, parsed];
          });
        }
      } catch (err) {
        console.error('Failed to parse SSE message', err);
      }
    };

    // Standard event handlers based on our backend implementation
    const eventTypes = [
      'session_state',
      'research_failed',
      'citation_added',
      'agent_action',
      'service_discovered',
      'service_evaluated',
      'approval_required',
      'payment_started',
      'payment_settled',
      'resource_acquired',
      'research_completed'
    ];

    eventTypes.forEach(type => {
      eventSource.addEventListener(type, (e: MessageEvent) => {
        if (!e.data || e.data === '') return;
        try {
          const parsed = JSON.parse(e.data) as BaseEvent;
          if (parsed && parsed.id) {
            setEvents(prev => {
              if (prev.some(ev => ev.id === parsed.id)) return prev;
              return [...prev, parsed];
            });
          }
        } catch (err) {
          console.error(`Failed to parse SSE event type ${type}`, err);
        }
      });
    });

  }, [sessionId]);

  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  return { events, connectionStatus, reconnect: connect };
}
