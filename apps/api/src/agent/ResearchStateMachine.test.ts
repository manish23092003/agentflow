import { describe, it, expect } from 'vitest';
import { ResearchStateMachine, ResearchState } from './ResearchStateMachine.js';

describe('ResearchStateMachine', () => {
  it('should allow valid transitions according to Phase 6 spec', () => {
    // Basic valid transitions
    expect(() => ResearchStateMachine.validateTransition(ResearchState.CREATED, ResearchState.RESEARCHING_FREE)).not.toThrow();
    expect(() => ResearchStateMachine.validateTransition(ResearchState.RESEARCHING_FREE, ResearchState.FREE_RESEARCH_COMPLETE)).not.toThrow();
    expect(() => ResearchStateMachine.validateTransition(ResearchState.FREE_RESEARCH_COMPLETE, ResearchState.EVALUATING_GAPS)).not.toThrow();
    expect(() => ResearchStateMachine.validateTransition(ResearchState.EVALUATING_GAPS, ResearchState.PAID_DISCOVERY)).not.toThrow();
    expect(() => ResearchStateMachine.validateTransition(ResearchState.EVALUATING_GAPS, ResearchState.SYNTHESIZING)).not.toThrow();
    expect(() => ResearchStateMachine.validateTransition(ResearchState.SERVICE_EVALUATION, ResearchState.PENDING_APPROVAL)).not.toThrow();
    expect(() => ResearchStateMachine.validateTransition(ResearchState.SERVICE_EVALUATION, ResearchState.PAYMENT_AUTHORIZED)).not.toThrow();
    expect(() => ResearchStateMachine.validateTransition(ResearchState.PENDING_APPROVAL, ResearchState.PAYMENT_AUTHORIZED)).not.toThrow();
    expect(() => ResearchStateMachine.validateTransition(ResearchState.PENDING_APPROVAL, ResearchState.USER_REJECTED)).not.toThrow();
    expect(() => ResearchStateMachine.validateTransition(ResearchState.USER_REJECTED, ResearchState.ALTERNATIVE_DISCOVERY)).not.toThrow();
    expect(() => ResearchStateMachine.validateTransition(ResearchState.PAYMENT_AUTHORIZED, ResearchState.PAYING)).not.toThrow();
    expect(() => ResearchStateMachine.validateTransition(ResearchState.PAYING, ResearchState.RESOURCE_ACQUIRED)).not.toThrow();
    expect(() => ResearchStateMachine.validateTransition(ResearchState.RESOURCE_ACQUIRED, ResearchState.SYNTHESIZING)).not.toThrow();
    expect(() => ResearchStateMachine.validateTransition(ResearchState.SYNTHESIZING, ResearchState.COMPLETED)).not.toThrow();
  });

  it('should reject invalid transitions', () => {
    // Required invalid examples from user request
    expect(() => ResearchStateMachine.validateTransition(ResearchState.CREATED, ResearchState.PAID_DISCOVERY)).toThrowError(/Invalid state transition/);
    expect(() => ResearchStateMachine.validateTransition(ResearchState.CREATED, ResearchState.PAYMENT_AUTHORIZED)).toThrowError(/Invalid state transition/);
    expect(() => ResearchStateMachine.validateTransition(ResearchState.RESEARCHING_FREE, ResearchState.PAYING)).toThrowError(/Invalid state transition/);
    expect(() => ResearchStateMachine.validateTransition(ResearchState.PENDING_APPROVAL, ResearchState.PAYING)).toThrowError(/Invalid state transition/);
    expect(() => ResearchStateMachine.validateTransition(ResearchState.USER_REJECTED, ResearchState.PAYING)).toThrowError(/Invalid state transition/);
  });

  it('should correctly gate tool availability', () => {
    // ServiceDiscoveryTool
    expect(ResearchStateMachine.isToolAllowed(ResearchState.PAID_DISCOVERY, 'ServiceDiscoveryTool')).toBe(true);
    expect(ResearchStateMachine.isToolAllowed(ResearchState.ALTERNATIVE_DISCOVERY, 'ServiceDiscoveryTool')).toBe(true);
    expect(ResearchStateMachine.isToolAllowed(ResearchState.CREATED, 'ServiceDiscoveryTool')).toBe(false);
    
    // PaymentTool
    expect(ResearchStateMachine.isToolAllowed(ResearchState.SERVICE_EVALUATION, 'PaymentTool')).toBe(true);
    expect(ResearchStateMachine.isToolAllowed(ResearchState.PAID_DISCOVERY, 'PaymentTool')).toBe(false);
    expect(ResearchStateMachine.isToolAllowed(ResearchState.PAYING, 'PaymentTool')).toBe(false);
    
    // WebSearchTool
    expect(ResearchStateMachine.isToolAllowed(ResearchState.RESEARCHING_FREE, 'WebSearchTool')).toBe(true);
    expect(ResearchStateMachine.isToolAllowed(ResearchState.EVALUATING_GAPS, 'WebSearchTool')).toBe(false);
  });
});
