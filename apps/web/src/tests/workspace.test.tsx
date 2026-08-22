// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any */
import './setup.ts';
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Workspace } from '../pages/Workspace';

// Mock matchMedia if not present
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock react-markdown to avoid ESM issues in tests
vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => {
    // Render the raw markdown as a div for testing purposes
    return React.createElement('div', { 'data-testid': 'markdown-content' }, children);
  }
}));

vi.mock('remark-gfm', () => ({ default: () => {} }));

describe('Research Workspace', () => {
  let mockFetch: any;
  let mockEventSource: any;

  const baseSession = {
    id: 'test-123',
    goal: 'Test Goal',
    status: 'RESEARCHING_FREE',
    researchBudget: 1000000,
    spent: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    report: null,
    failureReason: null
  };

  beforeEach(() => {
    // Mock fetch
    mockFetch = vi.fn().mockImplementation((url) => {
      if (url.includes('/auth/me')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            user: { id: 'u1', email: 'test@example.com', name: 'Test User' },
            wallets: []
          })
        });
      }
      if (url.includes('/citations')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        });
      }
      if (url.includes('/payments')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        });
      }
      if (url.includes('/agent/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'app-1',
            paymentRecordId: 'pay-1',
            status: 'PENDING',
            resourceUrl: 'http://test.com',
            amount: 50000,
            asset: 'USDC',
            network: 'testnet',
            payTo: 'addr123',
            reason: 'Need it',
            requestedAt: new Date().toISOString(),
            expiresAt: new Date().toISOString()
          })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(baseSession)
      });
    });
    global.fetch = mockFetch;

    // Mock EventSource
    mockEventSource = {
      close: vi.fn(),
      addEventListener: vi.fn(),
      onerror: null,
      onopen: null,
      onmessage: null
    };
    global.EventSource = vi.fn(() => mockEventSource) as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderWorkspace = () => {
    return render(
      <MemoryRouter initialEntries={['/research/test-123']}>
        <Routes>
          <Route path="/research/:id" element={<Workspace />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('hydrates session and renders initial state', async () => {
    renderWorkspace();
    
    // Should show loading initially
    expect(screen.getByText('Loading research...')).toBeInTheDocument();

    // Wait for hydration
    await waitFor(() => expect(screen.getAllByText('Test Goal').length).toBeGreaterThan(0));

    expect(screen.getAllByText('Researching public sources').length).toBeGreaterThan(0); // from STATE_PRESENTATION
    expect(screen.getAllByText(/0\.00/).length).toBeGreaterThan(0); // spent
    expect(screen.getAllByText(/1\.00/).length).toBeGreaterThan(0); // total budget
  });

  it('appends SSE events to the timeline', async () => {
    renderWorkspace();
    await waitFor(() => expect(screen.getAllByText('Test Goal')[0]).toBeInTheDocument());

    await waitFor(() => {
      expect(mockEventSource.addEventListener.mock.calls.some((c: any) => c[0] === 'citation_added')).toBe(true);
    });

    // Trigger an SSE event via addEventListener callbacks
    act(() => {
      const handlerCall = mockEventSource.addEventListener.mock.calls.find(
        (c: any) => c[0] === 'citation_added'
      );
      if (handlerCall) {
        handlerCall[1]({
          data: JSON.stringify({
            id: 'ev-1',
            type: 'citation_added',
            timestamp: new Date().toISOString(),
            data: {
            citationId: 'cit-1',
            title: 'Test Source',
            url: 'http://test.com',
            providerName: 'TestProvider'
          }
          })
        });
      }
    });

    await waitFor(() => {
      expect(screen.getByText('Found a source: Test Source')).toBeInTheDocument();
      expect(screen.getAllByText('Test Source')[0]).toBeInTheDocument();
    });
  });

  it('handles PENDING_APPROVAL placeholder', async () => {
    renderWorkspace();
    await waitFor(() => expect(screen.getAllByText('Test Goal')[0]).toBeInTheDocument());

    act(() => {
      // Send approval_required
      const approveCall = mockEventSource.addEventListener.mock.calls.find(
        (c: any) => c[0] === 'approval_required'
      );
      if (approveCall) {
        approveCall[1]({
          data: JSON.stringify({
            id: 'ev-2',
            type: 'approval_required',
            timestamp: new Date().toISOString(),
            data: {
              approvalId: 'app-1',
              service: 'Test Service',
              amount: 50000,
              reason: 'Need it',
              expectedValue: 'High'
            }
          })
        });
      }

      // Send session_state update to PENDING_APPROVAL
      const stateCall = mockEventSource.addEventListener.mock.calls.find(
        (c: any) => c[0] === 'session_state'
      );
      if (stateCall) {
        stateCall[1]({
          data: JSON.stringify({
            id: 'ev-3',
            type: 'session_state',
            timestamp: new Date().toISOString(),
            data: { status: 'PENDING_APPROVAL' }
          })
        });
      }
    });

    await waitFor(() => {
      expect(screen.getAllByText('Your approval is needed').length).toBeGreaterThan(0);
    });
  });

  it('renders FAILED state correctly', async () => {
    renderWorkspace();
    await waitFor(() => expect(screen.getAllByText('Test Goal')[0]).toBeInTheDocument());

    act(() => {
      const stateCall = mockEventSource.addEventListener.mock.calls.find(
        (c: any) => c[0] === 'session_state'
      );
      if (stateCall) {
        stateCall[1]({
          data: JSON.stringify({
            id: 'ev-4',
            type: 'session_state',
            timestamp: new Date().toISOString(),
            data: { status: 'FAILED', error: 'Custom error message' }
          })
        });
      }
    });

    await waitFor(() => {
      expect(screen.getAllByText("Research couldn't be completed").length).toBeGreaterThan(0);
    });
  });

  it('handles reconnect behavior', async () => {
    renderWorkspace();
    await waitFor(() => expect(screen.getAllByText('Test Goal')[0]).toBeInTheDocument());

    expect(screen.getByText('Offline')).toBeInTheDocument();

    act(() => {
      if (mockEventSource.onopen) mockEventSource.onopen();
    });

    await waitFor(() => expect(screen.getByText('Live')).toBeInTheDocument());

    act(() => {
      if (mockEventSource.onerror) mockEventSource.onerror();
    });

    await waitFor(() => expect(screen.getByText('Reconnecting…')).toBeInTheDocument());
  });

  // Test: COMPLETED session renders the FinalReport component with report content
  it('renders FinalReport component with markdown when session is COMPLETED and report exists', async () => {
    const reportText = '# Research Report\n\nThis is the report content.';
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/citations')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      if (url.includes('/payments')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          ...baseSession,
          status: 'COMPLETED',
          report: reportText
        })
      });
    });

    renderWorkspace();
    await waitFor(() => expect(screen.getAllByText('Test Goal')[0]).toBeInTheDocument());

    // The FinalReport component should render via ReactMarkdown (mocked as div)
    const markdownEl = screen.getByTestId('markdown-content');
    expect(markdownEl).toBeInTheDocument();
    expect(markdownEl.textContent).toContain('Research Report');
  });

  // Test: Re-fetches session when research_completed SSE fires
  it('re-fetches session on research_completed SSE event to get persisted report', async () => {
    renderWorkspace();
    await waitFor(() => expect(screen.getAllByText('Test Goal')[0]).toBeInTheDocument());

    const initialCallCount = mockFetch.mock.calls.length;

    act(() => {
      const completedCall = mockEventSource.addEventListener.mock.calls.find(
        (c: any) => c[0] === 'research_completed'
      );
      if (completedCall) {
        completedCall[1]({
          data: JSON.stringify({
            id: 'ev-done',
            type: 'research_completed',
            timestamp: new Date().toISOString(),
            data: {}
          })
        });
      }
    });

    await waitFor(() => {
      // Should have made another fetch call to /api/v1/research/test-123
      const sessionFetches = mockFetch.mock.calls.filter(
        (call: any[]) => call[0] === '/api/v1/research/test-123' && !call[0].includes('/citations') && !call[0].includes('/payments')
      );
      expect(sessionFetches.length).toBeGreaterThan(initialCallCount - (initialCallCount - 1));
    });
  });

  // Test: Free source renders as clickable anchor with real URL
  it('renders free citation sources as clickable anchors with correct href', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/citations')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            {
              id: 'c1',
              researchSessionId: 'test-123',
              url: 'https://example.com/article',
              title: 'Example Free Article',
              provider: 'Tavily',
              sourceType: 'WEB_SEARCH',
              retrievedAt: new Date().toISOString(),
              isPaid: false,
              cost: 0
            }
          ])
        });
      }
      if (url.includes('/payments')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(baseSession)
      });
    });

    renderWorkspace();
    await waitFor(() => expect(screen.getByText('Example Free Article')).toBeInTheDocument());

    // Find the source anchor element
    const sourceLink = screen.getByRole('link', { name: /Open source: Example Free Article/i });
    expect(sourceLink).toBeInTheDocument();
    expect(sourceLink).toHaveAttribute('href', 'https://example.com/article');
    expect(sourceLink).toHaveAttribute('target', '_blank');
    expect(sourceLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  // Test: Paid source renders with "Open purchased source" label
  it('renders paid citation sources with correct label and URL', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/citations')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            {
              id: 'c2',
              researchSessionId: 'test-123',
              url: 'https://paid-source.example.com/resource',
              title: 'Paid Research Data',
              provider: 'x402-bazaar',
              sourceType: 'X402_RESOURCE',
              retrievedAt: new Date().toISOString(),
              isPaid: true,
              cost: 500000
            }
          ])
        });
      }
      if (url.includes('/payments')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(baseSession)
      });
    });

    renderWorkspace();
    await waitFor(() => expect(screen.getByText('Paid Research Data')).toBeInTheDocument());

    // Should have the "Open purchased source" label
    expect(screen.getByText(/Open purchased source/i)).toBeInTheDocument();

    // The anchor should point to the real backend URL
    const sourceLink = screen.getByRole('link', { name: /Open purchased source: Paid Research Data/i });
    expect(sourceLink).toHaveAttribute('href', 'https://paid-source.example.com/resource');
    expect(sourceLink).toHaveAttribute('target', '_blank');
    expect(sourceLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  // Test: Missing URL doesn't generate a fake link
  it('does not render anchor when citation URL is missing', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/citations')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            {
              id: 'c3',
              researchSessionId: 'test-123',
              url: '',
              title: 'No URL Source',
              provider: 'Unknown',
              sourceType: 'WEB_SEARCH',
              retrievedAt: new Date().toISOString(),
              isPaid: false,
              cost: 0
            }
          ])
        });
      }
      if (url.includes('/payments')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(baseSession)
      });
    });

    renderWorkspace();
    await waitFor(() => expect(screen.getAllByText('Test Goal')[0]).toBeInTheDocument());
    // With empty URL, the citation is filtered out (url is falsy in allCitationsMap.set check)
    // So no source link should appear
    expect(screen.queryByRole('link', { name: /Open source/i })).not.toBeInTheDocument();
  });
});
