// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any */
import './setup.ts';
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { GoogleLoginButton } from '../components/auth/GoogleLoginButton';
import { api, API_BASE } from '../lib/api';

describe('GoogleLoginButton & Server Wakeup Flow (Redesigned SaaS UI)', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useFakeTimers();

    delete (window as any).location;
    window.location = {
      ...originalLocation,
      href: 'http://localhost:5173/login',
      search: '',
    } as any;
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    window.location = originalLocation as any;
  });

  it('renders Google sign-in button with default label and icon', () => {
    render(<GoogleLoginButton />);
    const button = screen.getByRole('button', { name: /continue with google/i });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });

  it('Scenario 1: Backend already awake — shows clean loading modal and redirects to Google OAuth when ready', async () => {
    let resolveHealth!: (val: boolean) => void;
    vi.spyOn(api, 'checkHealth').mockImplementation(
      () => new Promise((resolve) => { resolveHealth = resolve; })
    );

    render(<GoogleLoginButton />);
    const button = screen.getByRole('button', { name: /continue with google/i });

    await act(async () => {
      fireEvent.click(button);
    });

    // In-app loading modal should be displayed with clean plain-language copy
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Getting things ready')).toBeInTheDocument();
    expect(screen.getByText('This may take a moment. Thanks for your patience.')).toBeInTheDocument();
    expect(screen.getByText(/signing in securely with google/i)).toBeInTheDocument();

    // Health check resolves healthy
    await act(async () => {
      resolveHealth(true);
    });

    // Short visual state before redirect
    expect(screen.getByText(/redirecting to google\.\.\./i)).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    // Verify redirection to Google OAuth endpoint
    expect(window.location.href).toBe(`${API_BASE}/auth/google`);
  });

  it('Scenario 2: Backend asleep — stays on domain, displays discreet elapsed time without tech jargon, redirects when ready', async () => {
    const healthPromises: Array<(val: boolean) => void> = [];
    vi.spyOn(api, 'checkHealth').mockImplementation(
      () => new Promise((resolve) => { healthPromises.push(resolve); })
    );

    render(<GoogleLoginButton />);
    const button = screen.getByRole('button', { name: /continue with google/i });

    await act(async () => {
      fireEvent.click(button);
    });

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(window.location.href).toBe('http://localhost:5173/login'); // Remains on frontend!

    // Advance timer by 8 seconds (discreet elapsed counter)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(8000);
    });

    expect(screen.getByText('Getting things ready')).toBeInTheDocument();
    expect(screen.getByText('This may take a moment. Thanks for your patience.')).toBeInTheDocument();
    expect(screen.getByText(/\(8s\)/i)).toBeInTheDocument();

    // First ping finishes false (server still booting)
    await act(async () => {
      if (healthPromises[0]) healthPromises[0](false);
    });

    // Wait 2.5s for backoff and trigger second ping
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2600);
    });

    // Second ping succeeds
    await act(async () => {
      if (healthPromises[1]) healthPromises[1](true);
    });

    expect(screen.getByText(/redirecting to google\.\.\./i)).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    expect(window.location.href).toBe(`${API_BASE}/auth/google`);
  });

  it('Scenario 3: Backend unavailable / timeout — shows "We couldn\'t connect" and allows cancel/dismiss', async () => {
    vi.spyOn(api, 'checkHealth').mockResolvedValue(false);

    render(<GoogleLoginButton />);
    const button = screen.getByRole('button', { name: /continue with google/i });

    await act(async () => {
      fireEvent.click(button);
    });

    // Advance past max wait seconds (90s)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(95000);
    });

    // Clean error UI with specified plain language
    expect(screen.getByText("We couldn't connect")).toBeInTheDocument();
    expect(screen.getByText('Please check your connection and try again.')).toBeInTheDocument();
    const retryBtn = screen.getByRole('button', { name: 'Try again' });
    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    expect(retryBtn).toBeInTheDocument();
    expect(cancelBtn).toBeInTheDocument();

    // Clicking cancel dismisses and restores the button
    await act(async () => {
      fireEvent.click(cancelBtn);
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(button).not.toBeDisabled();
    expect(button).toHaveTextContent(/continue with google/i);
  });

  it('Scenario 4: Retry restores loading state and succeeds when backend responds', async () => {
    vi.spyOn(api, 'checkHealth').mockResolvedValue(false);

    render(<GoogleLoginButton />);
    const button = screen.getByRole('button', { name: /continue with google/i });

    await act(async () => {
      fireEvent.click(button);
    });

    // Trigger timeout
    await act(async () => {
      await vi.advanceTimersByTimeAsync(95000);
    });

    expect(screen.getByText("We couldn't connect")).toBeInTheDocument();

    // Set up controlled promise for retry
    let retryResolve!: (val: boolean) => void;
    vi.spyOn(api, 'checkHealth').mockImplementation(
      () => new Promise((resolve) => { retryResolve = resolve; })
    );

    const retryBtn = screen.getByRole('button', { name: 'Try again' });
    await act(async () => {
      fireEvent.click(retryBtn);
    });

    // Restores loading state
    expect(screen.getByText('Getting things ready')).toBeInTheDocument();

    await act(async () => {
      retryResolve(true);
    });

    expect(screen.getByText(/redirecting to google\.\.\./i)).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    expect(window.location.href).toBe(`${API_BASE}/auth/google`);
  });

  it('Scenario 5: Prevents duplicate clicks while wake-up is in progress', async () => {
    let checkCalls = 0;
    vi.spyOn(api, 'checkHealth').mockImplementation(async () => {
      checkCalls++;
      return false;
    });

    render(<GoogleLoginButton />);
    const button = screen.getByRole('button', { name: /continue with google/i });

    // Rapid double-click
    await act(async () => {
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);
    });

    expect(button).toBeDisabled();
    expect(checkCalls).toBe(1);
  });

  it('Scenario 6: Preserves query parameters on redirect', async () => {
    window.location.search = '?redirect=/workspace&plan=pro';
    let resolveHealth!: (val: boolean) => void;
    vi.spyOn(api, 'checkHealth').mockImplementation(
      () => new Promise((resolve) => { resolveHealth = resolve; })
    );

    render(<GoogleLoginButton />);
    const button = screen.getByRole('button', { name: /continue with google/i });

    await act(async () => {
      fireEvent.click(button);
    });

    await act(async () => {
      resolveHealth(true);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    expect(window.location.href).toBe(`${API_BASE}/auth/google?redirect=/workspace&plan=pro`);
  });
});
