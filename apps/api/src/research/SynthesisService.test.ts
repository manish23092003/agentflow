import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SynthesisService } from './SynthesisService.js';
import { ResearchState } from '../agent/ResearchStateMachine.js';

const MOCK_REPORT = 'This is the final report with meaningful content about the research topic.';

// Mock all external dependencies so module-level imports don't fail
vi.mock('ai', () => ({
  generateText: vi.fn().mockResolvedValue({ text: 'This is the final report with meaningful content about the research topic.' })
}));

vi.mock('../llm/gemini.js', () => ({
  GeminiProvider: vi.fn().mockImplementation(() => ({
    getModel: vi.fn().mockReturnValue('mock-model')
  }))
}));

vi.mock('../config.js', () => ({
  config: {
    geminiApiKey: 'mock-key',
    geminiModel: 'gemini-mock'
  }
}));

vi.mock('./ResearchEventService.js', () => ({
  researchEvents: {
    emitResearchCompleted: vi.fn(),
    emitResearchFailed: vi.fn(),
    emitSessionState: vi.fn(),
    emitAgentAction: vi.fn(),
    subscribe: vi.fn()
  }
}));

describe('SynthesisService', () => {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  let repository: any;
  let service: SynthesisService;

  beforeEach(() => {
    repository = {
      getSession: vi.fn().mockResolvedValue({
        id: 'session-1',
        status: ResearchState.SYNTHESIZING,
        goal: 'test goal',
        report: null
      }),
      getCitationsBySessionId: vi.fn().mockResolvedValue([
        { id: '1', title: 'Test Citation', provider: 'TestProvider', snippet: 'A snippet' }
      ]),
      updateStatus: vi.fn().mockResolvedValue({}),
      updateReport: vi.fn().mockResolvedValue({ id: 'session-1', report: MOCK_REPORT })
    };

    // After updateReport, getSession should return the session WITH the report
    // so the verification check passes
    let callCount = 0;
    repository.getSession.mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return { id: 'session-1', status: ResearchState.SYNTHESIZING, goal: 'test goal', report: null };
      }
      // Second call (verification) returns session with report
      return { id: 'session-1', status: ResearchState.SYNTHESIZING, goal: 'test goal', report: MOCK_REPORT };
    });

    service = new SynthesisService(repository);
  });

  // Test 1: synthesis succeeds → report persisted → COMPLETED
  it('should call updateReport with generated text on successful synthesis', async () => {
    await service.synthesize('session-1');
    expect(repository.updateReport).toHaveBeenCalledWith('session-1', MOCK_REPORT);
  });

  // Test 2: COMPLETED state only reached after report is persisted
  it('should transition to COMPLETED only after report is persisted and verified', async () => {
    await service.synthesize('session-1');
    // updateReport must be called before updateStatus (COMPLETED transition calls updateStatus)
    const updateReportOrder = repository.updateReport.mock.invocationCallOrder[0];
    const updateStatusOrder = repository.updateStatus.mock.invocationCallOrder[0];
    expect(updateReportOrder).toBeLessThan(updateStatusOrder);
  });

  // Test 3: transition to FAILED if no citations exist
  it('should transition to FAILED if no citations exist', async () => {
    repository.getCitationsBySessionId.mockResolvedValue([]);
    await expect(service.synthesize('session-1')).rejects.toThrow('NO_CITATIONS_FOR_SYNTHESIS');
    // updateReport should NOT have been called
    expect(repository.updateReport).not.toHaveBeenCalled();
  });

  // Test 4: synthesis returns empty → FAILED
  it('should transition to FAILED when LLM returns empty text', async () => {
    const { generateText } = await import('ai');
    vi.mocked(generateText).mockResolvedValueOnce({ text: '' } as any);
    await expect(service.synthesize('session-1')).rejects.toThrow();
    expect(repository.updateReport).not.toHaveBeenCalled();
  });

  // Test 5: synthesis returns whitespace-only → FAILED
  it('should transition to FAILED when LLM returns whitespace-only text', async () => {
    const { generateText } = await import('ai');
    vi.mocked(generateText).mockResolvedValueOnce({ text: '   \n\t  ' } as any);
    await expect(service.synthesize('session-1')).rejects.toThrow();
    expect(repository.updateReport).not.toHaveBeenCalled();
  });

  // Test 6: database persistence fails → FAILED
  it('should transition to FAILED when database persistence fails', async () => {
    repository.updateReport.mockRejectedValue(new Error('DB write failed'));
    await expect(service.synthesize('session-1')).rejects.toThrow();
  });

  // Test 7: persistence verification fails → FAILED
  it('should transition to FAILED when report verification shows empty after save', async () => {
    // updateReport succeeds but getSession returns empty report (simulating partial write)
    repository.updateReport.mockResolvedValue({});
    repository.getSession
      .mockResolvedValueOnce({ id: 'session-1', status: ResearchState.SYNTHESIZING, goal: 'test goal' })
      .mockResolvedValueOnce({ id: 'session-1', status: ResearchState.SYNTHESIZING, goal: 'test goal', report: '' });
    await expect(service.synthesize('session-1')).rejects.toThrow('Report persistence verification failed');
  });

  // Test 8: invalid state rejects early
  it('should throw if session is not in SYNTHESIZING state', async () => {
    repository.getSession.mockResolvedValue({ id: 'session-1', status: ResearchState.COMPLETED, goal: 'test' });
    await expect(service.synthesize('session-1')).rejects.toThrow('Invalid state transition');
  });
});
