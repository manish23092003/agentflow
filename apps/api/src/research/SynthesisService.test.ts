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
    const expectedText = `${MOCK_REPORT}\n\n### Sources\n\n[1] Test Citation\n    No URL available`;
    expect(repository.updateReport).toHaveBeenCalledWith('session-1', expectedText);
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

  describe('Sanitization & Formatting', () => {
    it('should map UUIDs to sequential numbers and append canonical Sources section', async () => {
      const { generateText } = await import('ai');
      // LLM uses mapped [1] format
      vi.mocked(generateText).mockResolvedValueOnce({ text: 'Market growth is strong [1].' } as any);
      
      const cits = [
        { id: '02ded405-85f2-495e-8925-d631e751ad1c', title: 'Source A', url: 'https://a.com', provider: 'test', snippet: '' }
      ];
      repository.getCitationsBySessionId.mockResolvedValue(cits);

      await service.synthesize('session-1');
      
      const expectedReport = 'Market growth is strong [1].\n\n### Sources\n\n[1] Source A\n    https://a.com';
      expect(repository.updateReport).toHaveBeenCalledWith('session-1', expectedReport);
    });

    it('should sanitize leaked UUIDs to their mapped number if known', async () => {
      const { generateText } = await import('ai');
      // LLM leaks the known UUID
      vi.mocked(generateText).mockResolvedValueOnce({ text: 'The market is growing [02ded405-85f2-495e-8925-d631e751ad1c].' } as any);
      
      const cits = [
        { id: '02ded405-85f2-495e-8925-d631e751ad1c', title: 'Source A', url: 'https://a.com', provider: 'test', snippet: '' }
      ];
      repository.getCitationsBySessionId.mockResolvedValue(cits);

      await service.synthesize('session-1');
      
      const expectedReport = 'The market is growing [1].\n\n### Sources\n\n[1] Source A\n    https://a.com';
      expect(repository.updateReport).toHaveBeenCalledWith('session-1', expectedReport);
    });

    it('should completely remove unknown/leaked UUIDs', async () => {
      const { generateText } = await import('ai');
      // LLM leaks a completely unknown UUID
      vi.mocked(generateText).mockResolvedValueOnce({ text: 'The market is growing [d7aa9a8b-42cd-4a5c-85db-f3f74f781758].' } as any);
      
      repository.getCitationsBySessionId.mockResolvedValue([]);
      
      // Wait, if 0 citations it fails. Let's add 1 valid citation.
      const cits = [
        { id: '02ded405-85f2-495e-8925-d631e751ad1c', title: 'Source A', url: 'https://a.com', provider: 'test', snippet: '' }
      ];
      repository.getCitationsBySessionId.mockResolvedValue(cits);

      await service.synthesize('session-1');
      
      // The unknown UUID is stripped, leaving brackets []. Then [] is stripped.
      // So 'The market is growing [].' -> 'The market is growing .'
      const expectedReport = 'The market is growing .\n\n### Sources\n\n[1] Source A\n    https://a.com';
      expect(repository.updateReport).toHaveBeenCalledWith('session-1', expectedReport);
    });

    it('should remove LLM-generated Sources section to prevent duplicates', async () => {
      const { generateText } = await import('ai');
      vi.mocked(generateText).mockResolvedValueOnce({ 
        text: 'Report body [1].\n\n## Sources\n[1] LLM Invented Source\nhttps://fake.com' 
      } as any);
      
      const cits = [
        { id: '02ded405-85f2-495e-8925-d631e751ad1c', title: 'Actual Source', url: 'https://real.com', provider: 'test', snippet: '' }
      ];
      repository.getCitationsBySessionId.mockResolvedValue(cits);

      await service.synthesize('session-1');
      
      // Should replace the hallucinated sources block with the canonical one
      const expectedReport = 'Report body [1].\n\n### Sources\n\n[1] Actual Source\n    https://real.com';
      expect(repository.updateReport).toHaveBeenCalledWith('session-1', expectedReport);
    });

    it('should safely handle missing URL or title in citations', async () => {
      const { generateText } = await import('ai');
      vi.mocked(generateText).mockResolvedValueOnce({ text: 'Body [1].' } as any);
      
      const cits = [
        { id: '11111111-1111-1111-1111-111111111111', title: null, url: null, provider: 'test', snippet: '' }
      ];
      repository.getCitationsBySessionId.mockResolvedValue(cits);

      await service.synthesize('session-1');
      
      const expectedReport = 'Body [1].\n\n### Sources\n\n[1] N/A\n    No URL available';
      expect(repository.updateReport).toHaveBeenCalledWith('session-1', expectedReport);
    });
  });
});
