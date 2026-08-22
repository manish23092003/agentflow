// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any */
import './setup.ts';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';

import { AuthProvider } from '../context/AuthContext';
import { WalletProvider } from '../context/WalletContext';

describe('Application Routing & Shell', () => {
  beforeEach(() => {
    (globalThis as any).fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/auth/me')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            user: {
              id: 'test-user-id',
              email: 'test@agentflow.ai',
              name: 'Test User',
              avatarUrl: null,
              createdAt: new Date().toISOString()
            },
            wallets: []
          })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([])
      });
    });
  });
  it('renders the Dashboard by default', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <WalletProvider>
            <App />
          </WalletProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0);
      expect(screen.getByRole('button', { name: /new research/i })).toBeInTheDocument();
    });
  });

  it('renders New Research page', async () => {
    render(
      <MemoryRouter initialEntries={['/research/new']}>
        <AuthProvider>
          <WalletProvider>
            <App />
          </WalletProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('New Research').length).toBeGreaterThan(0);
      expect(screen.getByRole('button', { name: /start research/i })).toBeInTheDocument();
    });
  });

  it('renders the Sidebar with navigation items', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <WalletProvider>
            <App />
          </WalletProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('AgentFlow').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0);
      expect(screen.getAllByText('New Research').length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Algorand TestNet/i).length).toBeGreaterThan(0);
    });
  });
});
