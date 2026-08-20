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

describe('Research Workspace', () => {
  let mockFetch: any;
  let mockEventSource: any;

  beforeEach(() => {
    // Mock fetch
    mockFetch = vi.fn().mockImplementation((url) => {
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
        json: () => Promise.resolve({
          id: 'test-123',
          goal: 'Test Goal',
          status: 'RESEARCHING_FREE',
          researchBudget: 1000000,
          spent: 0,
          createdAt: new Date().toISOString()
        })
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
    expect(screen.getByText('Loading research…')).toBeInTheDocument();

    // Wait for hydration
    await waitFor(() => {
      expect(screen.getByText('Test Goal')).toBeInTheDocument();
    });

    expect(screen.getByText('Researching public sources')).toBeInTheDocument(); // from STATE_PRESENTATION
    expect(screen.getAllByText(/0\.00/).length).toBeGreaterThan(0); // spent
    expect(screen.getAllByText(/1\.00/).length).toBeGreaterThan(0); // total budget
  });

  it('appends SSE events to the timeline', async () => {
    renderWorkspace();
    await waitFor(() => expect(screen.getByText('Test Goal')).toBeInTheDocument());

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
              citation: {
                title: 'Test Source',
                providerName: 'Google',
                url: 'http://test.com',
                isPaid: false
              }
            }
          })
        });
      }
    });

    await waitFor(() => {
      expect(screen.getByText('Found a source: Test Source')).toBeInTheDocument();
      expect(screen.getByText('Test Source')).toBeInTheDocument();
    });
  });

  it('handles PENDING_APPROVAL placeholder', async () => {
    renderWorkspace();
    await waitFor(() => expect(screen.getByText('Test Goal')).toBeInTheDocument());

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
      expect(screen.getByText('test.com')).toBeInTheDocument();
      expect(screen.getByText('0.05 USDC')).toBeInTheDocument();
      expect(screen.getAllByText('Need it').length).toBeGreaterThan(0);
    });
  });

  it('renders FAILED state correctly', async () => {
    renderWorkspace();
    await waitFor(() => expect(screen.getByText('Test Goal')).toBeInTheDocument());

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
      expect(screen.getAllByText('Custom error message').length).toBeGreaterThan(0);
    });
  });

  it('handles reconnect behavior', async () => {
    renderWorkspace();
    await waitFor(() => expect(screen.getByText('Test Goal')).toBeInTheDocument());

    expect(screen.getByText('Disconnected')).toBeInTheDocument();

    act(() => {
      if (mockEventSource.onopen) mockEventSource.onopen();
    });

    await waitFor(() => expect(screen.getByText('Live')).toBeInTheDocument());

    act(() => {
      if (mockEventSource.onerror) mockEventSource.onerror();
    });

    await waitFor(() => expect(screen.getByText('Reconnecting…')).toBeInTheDocument());
  });
});
