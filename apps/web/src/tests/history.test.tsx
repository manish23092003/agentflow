// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any */
import './setup';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { History } from '../pages/History';
import { BrowserRouter } from 'react-router-dom';
import { api } from '../lib/api';
import { ResearchSession, ResearchState } from '../types/research';

vi.mock('../lib/api', () => ({
  api: {
    getAllSessions: vi.fn(),
  }
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('History Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (api.getAllSessions as any).mockImplementation(() => new Promise(() => {})); // Never resolves
    render(<BrowserRouter><History /></BrowserRouter>);
    expect(screen.getByText('Loading history…')).toBeInTheDocument();
  });

  it('renders error state on API failure', async () => {
    (api.getAllSessions as any).mockRejectedValue(new Error('Network failure'));
    render(<BrowserRouter><History /></BrowserRouter>);
    
    await waitFor(() => {
      expect(screen.getByText('Network failure')).toBeInTheDocument();
    });
  });

  it('renders empty state when no sessions exist', async () => {
    (api.getAllSessions as any).mockResolvedValue([]);
    render(<BrowserRouter><History /></BrowserRouter>);
    
    await waitFor(() => {
      expect(screen.getByText('No research sessions yet.')).toBeInTheDocument();
    });
  });

  it('renders sessions list with real data', async () => {
    const sessions: ResearchSession[] = [
      {
        id: 'session-1',
        userId: 'u1',
        goal: 'Goal 1',
        status: ResearchState.COMPLETED,
        researchBudget: 1000,
        spent: 500000,
        createdAt: '2026-08-19T00:00:00Z',
        updatedAt: '2026-08-19T01:00:00Z'
      },
      {
        id: 'session-2',
        userId: 'u1',
        goal: 'Goal 2',
        status: ResearchState.FAILED,
        researchBudget: 2000,
        spent: 1000000,
        createdAt: '2026-08-19T00:00:00Z',
        updatedAt: '2026-08-19T01:00:00Z'
      }
    ];

    (api.getAllSessions as any).mockResolvedValue(sessions);
    render(<BrowserRouter><History /></BrowserRouter>);
    
    await waitFor(() => {
      expect(screen.getByText('Goal 1')).toBeInTheDocument();
      expect(screen.getByText('Goal 2')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Research complete')).toBeInTheDocument();
    expect(screen.getByText("Research couldn't be completed")).toBeInTheDocument();
    expect(screen.getByText('0.50 USDC')).toBeInTheDocument(); // 500000
    expect(screen.getByText('1.00 USDC')).toBeInTheDocument(); // 1000000
  });
});
