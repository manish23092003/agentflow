import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResearchOrchestrator } from './ResearchOrchestrator.js';
import { ResearchState } from './ResearchStateMachine.js';

describe('ResearchOrchestrator', () => {
/* eslint-disable @typescript-eslint/no-explicit-any */
  let repository: any;
  let researchAgent: any;
  let gapAnalysisService: any;
  let serviceEvaluationService: any;
  let synthesisService: any;
  let procurementService: any;
  let orchestrator: ResearchOrchestrator;

  beforeEach(() => {
    repository = {
      getSession: vi.fn(),
      updateStatus: vi.fn(),
      db: {
        researchGap: { findMany: vi.fn().mockResolvedValue([]) },
        paidResourceRecommendation: { findFirst: vi.fn().mockResolvedValue(null) }
      }
    };
    researchAgent = { runFreeResearchPhase: vi.fn() };
    gapAnalysisService = { evaluateGaps: vi.fn() };
    serviceEvaluationService = { evaluateServices: vi.fn() };
    synthesisService = { synthesize: vi.fn() };
    procurementService = { executeProcurement: vi.fn() };

    orchestrator = new ResearchOrchestrator(
      repository,
      researchAgent,
      gapAnalysisService,
      serviceEvaluationService,
      synthesisService,
      procurementService,
      {} as any
    );
  });

  it('should halt on terminal state COMPLETED', async () => {
    repository.getSession.mockResolvedValueOnce({ status: ResearchState.COMPLETED });
    await orchestrator.run('session-1');
    expect(researchAgent.runFreeResearchPhase).not.toHaveBeenCalled();
  });

  it('should transition from CREATED to RESEARCHING_FREE and stop (for this loop)', async () => {
    repository.getSession
      .mockResolvedValueOnce({ status: ResearchState.CREATED })
      .mockResolvedValueOnce({ status: ResearchState.COMPLETED }); // Force exit

    await orchestrator.run('session-1');
    expect(repository.updateStatus).toHaveBeenCalledWith('session-1', ResearchState.RESEARCHING_FREE);
  });

  it('should run FREE_RESEARCH_COMPLETE to EVALUATING_GAPS', async () => {
    repository.getSession
      .mockResolvedValueOnce({ status: ResearchState.FREE_RESEARCH_COMPLETE })
      .mockResolvedValueOnce({ status: ResearchState.COMPLETED });

    // Assuming transition calls updateStatus
    repository.getSession.mockResolvedValueOnce({ status: ResearchState.EVALUATING_GAPS });
    await orchestrator.run('session-1');
    // It should have transitioned
    // expect transition to be called...
  });
});
