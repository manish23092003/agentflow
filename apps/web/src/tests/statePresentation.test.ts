import { describe, it, expect } from 'vitest';
import { STATE_PRESENTATION } from '../utils/statePresentation';
import { ResearchState } from '../types/research';

describe('State Presentation Map', () => {
  it('should have a complete presentation for every ResearchState', () => {
    const states = Object.values(ResearchState);

    states.forEach(state => {
      const presentation = STATE_PRESENTATION[state];
      expect(presentation, `Missing presentation for state: ${state}`).toBeDefined();
      expect(presentation.label, `Missing label for ${state}`).toBeTruthy();
      expect(presentation.description, `Missing description for ${state}`).toBeTruthy();
      expect(presentation.detail, `Missing detail for ${state}`).toBeTruthy();
      expect(presentation.tone).toMatch(/^(info|success|warning|danger|neutral)$/);
      expect(presentation.icon).toBeDefined();
    });
  });

  it('should not expose raw enum values as labels', () => {
    const states = Object.values(ResearchState);
    states.forEach(state => {
      const { label } = STATE_PRESENTATION[state];
      // Labels must not be raw SCREAMING_SNAKE_CASE enum values
      expect(label).not.toMatch(/^[A-Z_]+$/);
    });
  });

  it('maps PENDING_APPROVAL to warning tone and plain-language label', () => {
    const p = STATE_PRESENTATION[ResearchState.PENDING_APPROVAL];
    expect(p.tone).toBe('warning');
    expect(p.label).toBe('Your approval is needed');
    expect(p.description).toContain('agent found');
  });

  it('maps RESEARCHING_FREE to info tone and plain-language label', () => {
    const p = STATE_PRESENTATION[ResearchState.RESEARCHING_FREE];
    expect(p.tone).toBe('info');
    expect(p.label).toBe('Researching public sources');
    expect(p.description).toContain('free sources');
  });

  it('maps COMPLETED to success tone', () => {
    const p = STATE_PRESENTATION[ResearchState.COMPLETED];
    expect(p.tone).toBe('success');
    expect(p.label).toBe('Research complete');
  });

  it('maps FAILED to danger tone with actionable detail', () => {
    const p = STATE_PRESENTATION[ResearchState.FAILED];
    expect(p.tone).toBe('danger');
    expect(p.detail).toContain('try again');
  });

  it('maps SYNTHESIZING correctly', () => {
    const p = STATE_PRESENTATION[ResearchState.SYNTHESIZING];
    expect(p.label).toBe('Writing your research report');
  });

  it('maps PAYING correctly', () => {
    const p = STATE_PRESENTATION[ResearchState.PAYING];
    expect(p.label).toBe('Purchasing the approved source');
  });
});
