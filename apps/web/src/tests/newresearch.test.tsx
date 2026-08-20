// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any */
import './setup.ts';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { NewResearch } from '../pages/NewResearch';

// Mock the api module
vi.mock('../lib/api', () => ({
  api: {
    startResearch: vi.fn()
  }
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

import { api } from '../lib/api';

const renderNewResearch = () =>
  render(
    <MemoryRouter initialEntries={['/research/new']}>
      <Routes>
        <Route path="/research/new" element={<NewResearch />} />
      </Routes>
    </MemoryRouter>
  );

describe('NewResearch — Start Research button', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page with plain-language copy and Start Research button', () => {
    renderNewResearch();
    expect(screen.getByText('New Research')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start research/i })).toBeInTheDocument();
    expect(screen.getByLabelText('What do you want to research?')).toBeInTheDocument();
    expect(screen.getByLabelText('Maximum budget')).toBeInTheDocument();
    // Ensure old Deploy Agent label is gone
    expect(screen.queryByText(/deploy agent/i)).not.toBeInTheDocument();
    // Ensure old Initialize Research label is gone
    expect(screen.queryByText(/initialize research/i)).not.toBeInTheDocument();
  });

  it('renders 3 example prompts', () => {
    renderNewResearch();
    const prompts = screen.getAllByRole('button', { name: /use example/i });
    expect(prompts.length).toBe(3);
  });

  it('clicking an example prompt fills the textarea', () => {
    renderNewResearch();
    const prompts = screen.getAllByRole('button', { name: /use example/i });
    fireEvent.click(prompts[0]);
    const textarea = screen.getByLabelText('What do you want to research?') as HTMLTextAreaElement;
    expect(textarea.value).not.toBe('');
  });

  it('shows validation error when goal is empty', async () => {
    renderNewResearch();
    fireEvent.click(screen.getByRole('button', { name: /start research/i }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Please describe what you want to research.')).toBeInTheDocument();
    });
    expect(api.startResearch).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('shows validation error when budget is invalid', async () => {
    renderNewResearch();
    fireEvent.change(screen.getByLabelText('What do you want to research?'), {
      target: { value: 'Test goal' }
    });
    fireEvent.change(screen.getByLabelText('Maximum budget'), {
      target: { value: '-1' }
    });
    fireEvent.click(screen.getByRole('button', { name: /start research/i }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(api.startResearch).not.toHaveBeenCalled();
  });

  it('calls api.startResearch with correct base units and navigates on success', async () => {
    (api.startResearch as any).mockResolvedValue({ id: 'session-abc', goal: 'Test goal', status: 'CREATED' });
    renderNewResearch();

    fireEvent.change(screen.getByLabelText('What do you want to research?'), {
      target: { value: 'Test research goal' }
    });
    fireEvent.change(screen.getByLabelText('Maximum budget'), {
      target: { value: '2.50' }
    });
    fireEvent.click(screen.getByRole('button', { name: /start research/i }));

    await waitFor(() => {
      // Budget: 2.50 USDC = 2,500,000 base units
      expect(api.startResearch).toHaveBeenCalledWith('Test research goal', 2_500_000);
      expect(mockNavigate).toHaveBeenCalledWith('/research/session-abc');
    });
  });

  it('shows loading state while starting', async () => {
    (api.startResearch as any).mockReturnValue(new Promise(() => {}));
    renderNewResearch();

    fireEvent.change(screen.getByLabelText('What do you want to research?'), {
      target: { value: 'Test goal' }
    });
    fireEvent.click(screen.getByRole('button', { name: /start research/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /starting/i })).toBeDisabled();
      expect(screen.getByLabelText('What do you want to research?')).toBeDisabled();
    });
  });

  it('shows error message and re-enables button on API failure', async () => {
    (api.startResearch as any).mockRejectedValue(new Error('Internal server error'));
    renderNewResearch();

    fireEvent.change(screen.getByLabelText('What do you want to research?'), {
      target: { value: 'Test goal' }
    });
    fireEvent.click(screen.getByRole('button', { name: /start research/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Internal server error')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /start research/i })).not.toBeDisabled();
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not send payment fields in the start request', async () => {
    (api.startResearch as any).mockResolvedValue({ id: 'session-xyz', goal: 'Test', status: 'CREATED' });
    renderNewResearch();

    fireEvent.change(screen.getByLabelText('What do you want to research?'), {
      target: { value: 'Test goal' }
    });
    fireEvent.click(screen.getByRole('button', { name: /start research/i }));

    await waitFor(() => {
      const call = (api.startResearch as any).mock.calls[0];
      // Only goal (string) and budget (number) — no payment fields
      expect(call).toHaveLength(2);
      expect(typeof call[0]).toBe('string');
      expect(typeof call[1]).toBe('number');
    });
  });
});
