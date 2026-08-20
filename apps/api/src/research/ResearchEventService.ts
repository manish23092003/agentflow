import { EventEmitter } from 'events';
import crypto from 'crypto';
import { ResearchState } from '../agent/ResearchStateMachine.js';

export interface BaseEvent {
  id: string;
  sessionId: string;
  type: string;
  timestamp: string;
  data: unknown;
}

export class ResearchEventService {
  private emitter = new EventEmitter();

  // Increase limit for concurrent clients
  constructor() {
    this.emitter.setMaxListeners(100);
  }

  subscribe(sessionId: string, listener: (event: BaseEvent) => void): () => void {
    const eventName = `session:${sessionId}`;
    this.emitter.on(eventName, listener);
    return () => {
      this.emitter.off(eventName, listener);
    };
  }

  private emit(sessionId: string, type: string, data: unknown) {
    const event: BaseEvent = {
      id: crypto.randomUUID(),
      sessionId,
      type,
      timestamp: new Date().toISOString(),
      data
    };
    this.emitter.emit(`session:${sessionId}`, event);
  }

  emitSessionState(sessionId: string, status: ResearchState) {
    this.emit(sessionId, 'session_state', { status });
  }

  emitAgentAction(sessionId: string, action: string, details?: string) {
    this.emit(sessionId, 'agent_action', { action, details });
  }

  emitCitationAdded(sessionId: string, citation: { id: string; url: string; title?: string }) {
    this.emit(sessionId, 'citation_added', { 
      citationId: citation.id,
      url: citation.url, 
      title: citation.title 
    });
  }

  emitServiceDiscovered(sessionId: string, service: { id: string; name: string; cost: number; provider: string }) {
    this.emit(sessionId, 'service_discovered', { 
      serviceId: service.id,
      name: service.name,
      cost: service.cost,
      provider: service.provider
    });
  }

  emitServiceEvaluated(sessionId: string, serviceId: string, isEligible: boolean, reason?: string) {
    this.emit(sessionId, 'service_evaluated', {
      serviceId,
      isEligible,
      reason
    });
  }

  emitApprovalRequired(sessionId: string, approvalId: string, data: { service: string, amount: number, asset: string, network: string, reason: string, expectedValue: string, remainingBudget: number }) {
    this.emit(sessionId, 'approval_required', {
      approvalId,
      ...data
    });
  }

  emitPaymentStarted(sessionId: string, transactionId: string, amount: number, asset: string) {
    this.emit(sessionId, 'payment_started', {
      transactionId,
      amount,
      asset
    });
  }

  emitPaymentSettled(sessionId: string, transactionId: string) {
    this.emit(sessionId, 'payment_settled', {
      transactionId
    });
  }

  emitResourceAcquired(sessionId: string, url: string) {
    this.emit(sessionId, 'resource_acquired', {
      url
    });
  }

  emitResearchCompleted(sessionId: string) {
    this.emit(sessionId, 'research_completed', {});
  }

  emitResearchFailed(sessionId: string, error: string) {
    this.emit(sessionId, 'research_failed', {
      error
    });
  }
}

export const researchEvents = new ResearchEventService();
