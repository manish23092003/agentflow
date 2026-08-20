/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest';
import { researchEvents } from './ResearchEventService.js';
import { ResearchState } from '../agent/ResearchStateMachine.js';

describe('ResearchEventService', () => {
  it('should emit session state correctly', () => {
    return new Promise<void>((resolve) => {
      const sessionId = 'test-session-1';
      
      const unsubscribe = researchEvents.subscribe(sessionId, (event) => {
        expect(event.sessionId).toBe(sessionId);
        expect(event.type).toBe('session_state');
        expect((event.data as any).status).toBe(ResearchState.RESEARCHING_FREE);
        expect(event.id).toBeDefined();
        expect(event.timestamp).toBeDefined();
        unsubscribe();
        resolve();
      });

      researchEvents.emitSessionState(sessionId, ResearchState.RESEARCHING_FREE);
    });
  });

  it('should isolate sessions', () => {
    return new Promise<void>((resolve) => {
      const sessionIdA = 'test-session-a';
      const sessionIdB = 'test-session-b';
      
      let receivedA = false;
      let receivedB = false;

      const unsubA = researchEvents.subscribe(sessionIdA, () => {
        receivedA = true;
      });

      const unsubB = researchEvents.subscribe(sessionIdB, () => {
        receivedB = true;
      });

      researchEvents.emitSessionState(sessionIdA, ResearchState.COMPLETED);

      setTimeout(() => {
        expect(receivedA).toBe(true);
        expect(receivedB).toBe(false);
        unsubA();
        unsubB();
        resolve();
      }, 50);
    });
  });
  
  it('should safely strip sensitive information from approval payloads', () => {
    return new Promise<void>((resolve) => {
      const sessionId = 'test-session-safe';
      
      const unsubscribe = researchEvents.subscribe(sessionId, (event) => {
        expect(event.type).toBe('approval_required');
        expect((event.data as any).amount).toBe(5000);
        expect((event.data as any).privateKey).toBeUndefined(); // Ensure no private key
        unsubscribe();
        resolve();
      });

      researchEvents.emitApprovalRequired(sessionId, 'app-123', {
        service: 'Safe Service',
        amount: 5000,
        asset: '1',
        network: 'testnet',
        reason: 'testing',
        expectedValue: 'HIGH',
        remainingBudget: 10000
      });
    });
  });
});
