// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ServiceEvaluationService } from './ServiceEvaluationService.js';
import { ResearchState } from '../agent/ResearchStateMachine.js';
import { DiscoveredService } from './types.js';
import { PolicyEngine } from '../agent/PolicyEngine.js';
import { UserSpendingPolicy } from '../agent/types.js';

// Mock dependencies
const mockGenerateObject = vi.fn();
vi.mock('ai', () => ({
  generateObject: (...args: unknown[]) => mockGenerateObject(...args),
}));

describe('ServiceEvaluationService', () => {
  let repository: unknown;
  let policyEngine: unknown;
  let service: ServiceEvaluationService;
  const mockSessionId = 'session-123';
  const mockPolicy: UserSpendingPolicy = {
    dailyLimit: 1000000,
    maxPerTransaction: 500000,
    allowedAssets: [12345],
    allowedNetworks: ['net1'],
    requireApprovalAbove: 200000
  };

  const candidateA: DiscoveredService = {
    id: 'candidate-A',
    name: 'Service A',
    url: 'https://a.com',
    description: 'High relevance, cheap',
    rawAmount: 10000, // 0.01 USDC
    decimals: 6,
    priceUsdc: 0.01,
    asset: '12345',
    network: 'net1',
    paymentScheme: 'exact'
  };

  const candidateB: DiscoveredService = {
    id: 'candidate-B',
    name: 'Service B',
    url: 'https://b.com',
    description: 'Medium relevance',
    rawAmount: 50000, // 0.05 USDC
    decimals: 6,
    priceUsdc: 0.05,
    asset: '12345',
    network: 'net1',
    paymentScheme: 'exact'
  };

  const candidateC: DiscoveredService = {
    id: 'candidate-C',
    name: 'Service C',
    url: 'https://c.com',
    description: 'High relevance, over budget',
    rawAmount: 500000, // 0.50 USDC
    decimals: 6,
    priceUsdc: 0.50,
    asset: '12345',
    network: 'net1',
    paymentScheme: 'exact'
  };

  const gap = { missingInformation: ['data'], importance: 'HIGH' };

  beforeEach(() => {
    vi.restoreAllMocks();
    repository = {
      getSession: vi.fn().mockResolvedValue({
        id: mockSessionId,
        status: ResearchState.SERVICE_EVALUATION,
        researchBudget: 200000,
        spent: 0
      }),
      updateStatus: vi.fn().mockResolvedValue({}),
      createRecommendation: vi.fn().mockResolvedValue({})
    };
    policyEngine = {
      evaluate: vi.fn().mockResolvedValue({ decision: 'APPROVED', reason: 'ok' })
    };
    service = new ServiceEvaluationService(repository as unknown as any, policyEngine as unknown as PolicyEngine);
  });

  it('1. should select valid service and transition to PAYMENT_AUTHORIZED when policy APPROVED', async () => {
    mockGenerateObject.mockResolvedValue({
      object: {
        selectedServiceId: 'candidate-A',
        reason: 'Best match',
        relevanceScore: 0.95,
        expectedValue: 'HIGH',
        alternative: ''
      }
    });

    await service.evaluateServices(mockSessionId, gap, [candidateA, candidateB], mockPolicy);

    expect(repository.createRecommendation).toHaveBeenCalledWith(expect.objectContaining({
      service: 'Service A',
      price: 10000,
      status: 'SELECTED',
      relevanceScore: 0.95
    }));
    expect((policyEngine as any).evaluate).toHaveBeenCalledWith(expect.objectContaining({ rawAmount: 10000 }), mockPolicy);
    expect((repository as any).updateStatus).toHaveBeenCalledWith(mockSessionId, ResearchState.PAYMENT_AUTHORIZED, undefined);
  });

  it('2. should transition to PENDING_APPROVAL if policy REQUIRES_APPROVAL', async () => {
    policyEngine.evaluate.mockResolvedValue({ decision: 'REQUIRES_APPROVAL', reason: 'over auto limit' });
    mockGenerateObject.mockResolvedValue({
      object: {
        selectedServiceId: 'candidate-B',
        reason: 'Ok match',
        relevanceScore: 0.7,
        expectedValue: 'MEDIUM'
      }
    });

    await service.evaluateServices(mockSessionId, gap, [candidateA, candidateB], mockPolicy);

    expect((repository as any).updateStatus).toHaveBeenCalledWith(mockSessionId, ResearchState.PENDING_APPROVAL, 'over auto limit');
    expect((repository as any).createRecommendation).toHaveBeenCalledWith(expect.objectContaining({ status: 'PENDING' }));
  });

  it('3. should transition to ALTERNATIVE_DISCOVERY if policy DENIED', async () => {
    policyEngine.evaluate.mockResolvedValue({ decision: 'DENIED', reason: 'daily limit' });
    mockGenerateObject.mockResolvedValue({
      object: {
        selectedServiceId: 'candidate-A',
        reason: 'Match',
        relevanceScore: 0.8,
        expectedValue: 'HIGH'
      }
    });

    await service.evaluateServices(mockSessionId, gap, [candidateA], mockPolicy);

    expect((repository as any).updateStatus).toHaveBeenCalledWith(mockSessionId, ResearchState.ALTERNATIVE_DISCOVERY, 'Policy Engine DENIED: daily limit');
    expect((repository as any).createRecommendation).toHaveBeenCalledWith(expect.objectContaining({ status: 'REJECTED' }));
  });

  it('4. should reject if selected service is over remaining budget despite LLM choosing it', async () => {
    // LLM mistakenly picks candidate C which is 500000, but remaining budget is 200000
    mockGenerateObject.mockResolvedValue({
      object: {
        selectedServiceId: 'candidate-C',
        reason: 'Most relevant',
        relevanceScore: 0.99,
        expectedValue: 'HIGH'
      }
    });

    await service.evaluateServices(mockSessionId, gap, [candidateA, candidateC], mockPolicy);

    // Application validation should fail it before policy engine
    expect(policyEngine.evaluate).not.toHaveBeenCalled();
    expect(repository.updateStatus).toHaveBeenCalledWith(
      mockSessionId,
      ResearchState.ALTERNATIVE_DISCOVERY,
      expect.stringContaining('exceeds budget')
    );
  });

  it('5. should reject if selectedServiceId is totally fabricated by LLM', async () => {
    mockGenerateObject.mockResolvedValue({
      object: {
        selectedServiceId: 'fake-id',
        reason: 'Fabricated',
        relevanceScore: 0.9,
        expectedValue: 'HIGH'
      }
    });

    await service.evaluateServices(mockSessionId, gap, [candidateA], mockPolicy);

    expect((policyEngine as any).evaluate).not.toHaveBeenCalled();
    expect((repository as any).updateStatus).toHaveBeenCalledWith(mockSessionId, ResearchState.FAILED, expect.stringContaining('invalid service ID'));
  });

  it('6. should transition to SYNTHESIZING if LLM returns null selectedServiceId (no worthwhile candidates)', async () => {
    mockGenerateObject.mockResolvedValue({
      object: {
        selectedServiceId: null,
        reason: 'None are good enough',
        relevanceScore: 0.1,
        expectedValue: 'LOW'
      }
    });

    await service.evaluateServices(mockSessionId, gap, [candidateB], mockPolicy);

    expect((policyEngine as any).evaluate).not.toHaveBeenCalled();
    expect((repository as any).createRecommendation).toHaveBeenCalledWith(expect.objectContaining({
      status: 'NO_ELIGIBLE_SERVICE',
      service: 'None'
    }));
    expect((repository as any).updateStatus).toHaveBeenCalledWith(mockSessionId, ResearchState.SYNTHESIZING, expect.any(String));
  });

  it('7. should transition to SYNTHESIZING immediately if no candidates provided', async () => {
    await service.evaluateServices(mockSessionId, gap, [], mockPolicy);

    expect(mockGenerateObject).not.toHaveBeenCalled();
    expect(repository.updateStatus).toHaveBeenCalledWith(mockSessionId, ResearchState.SYNTHESIZING, expect.any(String));
  });

  it('8. SECURITY: LLM cannot fabricate price or other metadata', async () => {
    // We mock the LLM returning extra fields NOT in schema just to simulate if a bypass occurred
    // But since generateObject uses Zod, those fields are dropped. 
    // We verify the application constructs the recommendation exclusively from candidateA
    mockGenerateObject.mockResolvedValue({
      object: {
        selectedServiceId: 'candidate-A',
        reason: 'Good',
        relevanceScore: 0.9,
        expectedValue: 'HIGH',
        // Simulate hallucinated fields even if dropped by schema
        price: 0,
        asset: '99999',
        network: 'fake-net'
      }
    });

    await service.evaluateServices(mockSessionId, gap, [candidateA], mockPolicy);

    expect((repository as any).createRecommendation).toHaveBeenCalledWith(expect.objectContaining({
      price: 10000, // True base unit price from candidateA
      asset: '12345',
      network: 'net1'
    }));
    
    expect((policyEngine as any).evaluate).toHaveBeenCalledWith(expect.objectContaining({
      rawAmount: 10000,
      network: 'net1'
    }), mockPolicy);
  });
});
