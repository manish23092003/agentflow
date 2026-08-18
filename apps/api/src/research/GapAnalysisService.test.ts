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
    expect(repository.updateStatus).toHaveBeenCalledWith('1', ResearchState.SYNTHESIZING, undefined);
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
    expect(repository.updateStatus).toHaveBeenCalledWith('1', ResearchState.PAID_DISCOVERY, undefined);
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

    expect(repository.updateStatus).toHaveBeenCalledWith('1', ResearchState.PAID_DISCOVERY, undefined);
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

    expect(repository.updateStatus).toHaveBeenCalledWith('1', ResearchState.SYNTHESIZING, undefined);
  });

  it('should safely fail if zero citations are available', async () => {
    repository.getSession.mockResolvedValue({ id: '1', status: ResearchState.EVALUATING_GAPS, goal: 'test' });
    repository.getCitationsBySessionId.mockResolvedValue([]);

    await service.evaluateGaps('1');

    expect(repository.updateStatus).toHaveBeenCalledWith('1', ResearchState.FAILED, 'NO_EVIDENCE_FOR_GAP_ANALYSIS');
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

    await service.evaluateGaps('1');

    expect(repository.updateStatus).toHaveBeenCalledWith('1', ResearchState.FAILED, 'LLM returned invalid citation IDs: invalid-id');
  });

  it('should transition to FAILED on Gemini API error', async () => {
    repository.getSession.mockResolvedValue({ id: '1', status: ResearchState.EVALUATING_GAPS, goal: 'test' });
    repository.getCitationsBySessionId.mockResolvedValue([{ id: 'c1', title: 'test', snippet: 'test' }]);
    
    vi.mocked(generateObject).mockRejectedValue(new Error('API Rate Limit'));

    await service.evaluateGaps('1');

    expect(repository.updateStatus).toHaveBeenCalledWith('1', ResearchState.FAILED, 'API Rate Limit');
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
