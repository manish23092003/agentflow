/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GapAnalysisService } from './GapAnalysisService.js';
import { ResearchState } from '../agent/ResearchStateMachine.js';
import { generateObject } from 'ai';

vi.mock('ai', async (importOriginal: any) => {
  return {
    ...(await importOriginal() as any),
    generateObject: vi.fn(),
  };
});

describe('GapAnalysisService', () => {
  let repository: any;
  let service: GapAnalysisService;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = {
      getSession: vi.fn(),
      updateStatus: vi.fn(),
      getCitationsBySessionId: vi.fn(),
      createGap: vi.fn()
    };
    service = new GapAnalysisService(repository);
  });

  it('should transition to SYNTHESIZING when no material gap exists', async () => {
    repository.getSession.mockResolvedValue({ id: '1', status: ResearchState.EVALUATING_GAPS, goal: 'test' });
    repository.getCitationsBySessionId.mockResolvedValue([{ id: 'c1', title: 'test', snippet: 'test' }]);
    
    vi.mocked(generateObject).mockResolvedValue({
      object: {
        hasMaterialGap: false,
        missingInformation: [],
        importance: 'LOW',
        evidenceSummary: 'All good',
        recommendedAction: 'CONTINUE_FREE',
        evidenceCitationIds: ['c1']
      }
    } as any);

    await service.evaluateGaps('1');

    expect(repository.createGap).toHaveBeenCalledWith(expect.objectContaining({ hasMaterialGap: false }));
    expect(repository.updateStatus).toHaveBeenCalledWith('1', ResearchState.SYNTHESIZING);
  });

  it('should transition to PAID_DISCOVERY when a HIGH material gap exists', async () => {
    repository.getSession.mockResolvedValue({ id: '1', status: ResearchState.EVALUATING_GAPS, goal: 'test' });
    repository.getCitationsBySessionId.mockResolvedValue([{ id: 'c1', title: 'test', snippet: 'test' }]);
    
    vi.mocked(generateObject).mockResolvedValue({
      object: {
        hasMaterialGap: true,
        missingInformation: ['data'],
        importance: 'HIGH',
        evidenceSummary: 'Need data',
        recommendedAction: 'DISCOVER_PAID',
        evidenceCitationIds: ['c1']
      }
    } as any);

    await service.evaluateGaps('1');

    expect(repository.createGap).toHaveBeenCalledWith(expect.objectContaining({ hasMaterialGap: true, importance: 'HIGH' }));
    expect(repository.updateStatus).toHaveBeenCalledWith('1', ResearchState.PAID_DISCOVERY);
  });

  it('should transition to PAID_DISCOVERY when a MEDIUM material gap exists', async () => {
    repository.getSession.mockResolvedValue({ id: '1', status: ResearchState.EVALUATING_GAPS, goal: 'test' });
    repository.getCitationsBySessionId.mockResolvedValue([{ id: 'c1', title: 'test', snippet: 'test' }]);
    
    vi.mocked(generateObject).mockResolvedValue({
      object: {
        hasMaterialGap: true,
        missingInformation: ['data'],
        importance: 'MEDIUM',
        evidenceSummary: 'Need data',
        recommendedAction: 'DISCOVER_PAID',
        evidenceCitationIds: ['c1']
      }
    } as any);

    await service.evaluateGaps('1');

    expect(repository.updateStatus).toHaveBeenCalledWith('1', ResearchState.PAID_DISCOVERY);
  });

  it('should transition to SYNTHESIZING when a LOW material gap exists', async () => {
    repository.getSession.mockResolvedValue({ id: '1', status: ResearchState.EVALUATING_GAPS, goal: 'test' });
    repository.getCitationsBySessionId.mockResolvedValue([{ id: 'c1', title: 'test', snippet: 'test' }]);
    
    vi.mocked(generateObject).mockResolvedValue({
      object: {
        hasMaterialGap: true,
        missingInformation: ['minor detail'],
        importance: 'LOW',
        evidenceSummary: 'Minor details missing',
        recommendedAction: 'CONTINUE_FREE',
        evidenceCitationIds: ['c1']
      }
    } as any);

    await service.evaluateGaps('1');

    expect(repository.updateStatus).toHaveBeenCalledWith('1', ResearchState.SYNTHESIZING);
  });

  // User Requested Tests:
  it('TEST 1: General question should result in materialGap=false and transition to SYNTHESIZING', async () => {
    repository.getSession.mockResolvedValue({ id: '1', status: ResearchState.EVALUATING_GAPS, goal: 'What are AI agents?' });
    repository.getCitationsBySessionId.mockResolvedValue([{ id: 'c1', title: 'test', snippet: 'test' }]);
    
    vi.mocked(generateObject).mockResolvedValue({
      object: {
        hasMaterialGap: false,
        missingInformation: [],
        importance: 'LOW',
        evidenceSummary: 'General info is sufficient',
        recommendedAction: 'CONTINUE_FREE',
        evidenceCitationIds: ['c1']
      }
    } as any);

    await service.evaluateGaps('1');
    expect(repository.createGap).toHaveBeenCalledWith(expect.objectContaining({ hasMaterialGap: false }));
    expect(repository.updateStatus).toHaveBeenCalledWith('1', ResearchState.SYNTHESIZING);
  });

  it('TEST 2: Quantitative market research should result in materialGap=true and transition to PAID_DISCOVERY', async () => {
    repository.getSession.mockResolvedValue({ id: '1', status: ResearchState.EVALUATING_GAPS, goal: 'Global AI Agent Market Size, Revenue Forecast, Enterprise Adoption and Market Share by Region 2026–2030' });
    repository.getCitationsBySessionId.mockResolvedValue([{ id: 'c1', title: 'general article', snippet: 'some general text' }]);
    
    vi.mocked(generateObject).mockResolvedValue({
      object: {
        hasMaterialGap: true,
        missingInformation: ['quantitative dataset', 'revenue forecast'],
        importance: 'HIGH',
        evidenceSummary: 'Missing detailed forecasts',
        recommendedAction: 'DISCOVER_PAID',
        evidenceCitationIds: ['c1']
      }
    } as any);

    await service.evaluateGaps('1');
    expect(repository.createGap).toHaveBeenCalledWith(expect.objectContaining({ hasMaterialGap: true, importance: 'HIGH' }));
    expect(repository.updateStatus).toHaveBeenCalledWith('1', ResearchState.PAID_DISCOVERY);
  });

  it('TEST 3: Explicit proprietary requirement should result in materialGap=true and transition to PAID_DISCOVERY', async () => {
    repository.getSession.mockResolvedValue({ id: '1', status: ResearchState.EVALUATING_GAPS, goal: 'Find proprietary analyst data for AI agent market revenue forecasts through 2030.' });
    repository.getCitationsBySessionId.mockResolvedValue([{ id: 'c1', title: 'test', snippet: 'test' }]);
    
    vi.mocked(generateObject).mockResolvedValue({
      object: {
        hasMaterialGap: true,
        missingInformation: ['proprietary analyst data'],
        importance: 'HIGH',
        evidenceSummary: 'Missing analyst data',
        recommendedAction: 'DISCOVER_PAID',
        evidenceCitationIds: ['c1']
      }
    } as any);

    await service.evaluateGaps('1');
    expect(repository.updateStatus).toHaveBeenCalledWith('1', ResearchState.PAID_DISCOVERY);
  });

  it('TEST 4: Free sources contain sufficient information should result in materialGap=false', async () => {
    repository.getSession.mockResolvedValue({ id: '1', status: ResearchState.EVALUATING_GAPS, goal: 'Global AI Agent Market Size 2024' });
    repository.getCitationsBySessionId.mockResolvedValue([{ id: 'c1', title: 'Market Report 2024', snippet: 'The market size is $5B' }]);
    
    vi.mocked(generateObject).mockResolvedValue({
      object: {
        hasMaterialGap: false,
        missingInformation: [],
        importance: 'LOW',
        evidenceSummary: 'Data was found in free sources',
        recommendedAction: 'CONTINUE_FREE',
        evidenceCitationIds: ['c1']
      }
    } as any);

    await service.evaluateGaps('1');
    expect(repository.createGap).toHaveBeenCalledWith(expect.objectContaining({ hasMaterialGap: false }));
    expect(repository.updateStatus).toHaveBeenCalledWith('1', ResearchState.SYNTHESIZING);
  });

  it('should safely fail if zero citations are available', async () => {
    repository.getSession.mockResolvedValue({ id: '1', status: ResearchState.EVALUATING_GAPS, goal: 'test' });
    repository.getCitationsBySessionId.mockResolvedValue([]);

    await expect(service.evaluateGaps('1')).rejects.toThrow();

    expect(repository.updateStatus).toHaveBeenCalledWith('1', ResearchState.FAILED);
    expect(generateObject).not.toHaveBeenCalled();
  });

  it('should reject if LLM invents invalid citation IDs', async () => {
    repository.getSession.mockResolvedValue({ id: '1', status: ResearchState.EVALUATING_GAPS, goal: 'test' });
    repository.getCitationsBySessionId.mockResolvedValue([{ id: 'c1', title: 'test', snippet: 'test' }]);
    
    vi.mocked(generateObject).mockResolvedValue({
      object: {
        hasMaterialGap: false,
        missingInformation: [],
        importance: 'LOW',
        evidenceSummary: 'All good',
        recommendedAction: 'CONTINUE_FREE',
        evidenceCitationIds: ['invalid-id']
      }
    } as any);

    await expect(service.evaluateGaps('1')).rejects.toThrow();

    expect(repository.updateStatus).toHaveBeenCalledWith('1', ResearchState.FAILED);
  });

  it('should transition to FAILED on Gemini API error', async () => {
    repository.getSession.mockResolvedValue({ id: '1', status: ResearchState.EVALUATING_GAPS, goal: 'test' });
    repository.getCitationsBySessionId.mockResolvedValue([{ id: 'c1', title: 'test', snippet: 'test' }]);
    
    vi.mocked(generateObject).mockRejectedValue(new Error('API Rate Limit'));

    await expect(service.evaluateGaps('1')).rejects.toThrow();

    expect(repository.updateStatus).toHaveBeenCalledWith('1', ResearchState.FAILED);
  });

  it('should throw Error if session does not exist', async () => {
    repository.getSession.mockResolvedValue(null);
    await expect(service.evaluateGaps('invalid')).rejects.toThrowError('Session not found: invalid');
  });

  it('should block execution if session is not in EVALUATING_GAPS', async () => {
    repository.getSession.mockResolvedValue({ id: '1', status: ResearchState.RESEARCHING_FREE, goal: 'test' });
    await expect(service.evaluateGaps('1')).rejects.toThrowError('Invalid state transition');
  });
});
