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
  it('renders the Dashboard when authenticated and accesses protected route', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AuthProvider>
          <WalletProvider>
            <App />
          </WalletProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      // The shell should render 'Dashboard' when authenticated
      expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0);
      expect(screen.getByRole('button', { name: /new research/i })).toBeInTheDocument();
    });
  });

  it('renders New Research page when authenticated', async () => {
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
      expect(screen.getByRole('button', { name: /Connect Pera Wallet to start paid research/i })).toBeInTheDocument();
    });
  });

  it('renders the Landing page at root', async () => {
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
      // Landing page tests: should have specific headings and links
      expect(screen.getByRole('heading', { name: /Your AI Agent for/i })).toBeInTheDocument();
      // Wait for multiple "Sign In" elements since there might be mobile/desktop navigation
      const signInLinks = screen.getAllByRole('link', { name: /Sign In/i });
      expect(signInLinks.length).toBeGreaterThan(0);
      const getStartedLinks = screen.getAllByRole('link', { name: /Get Started/i });
      expect(getStartedLinks.length).toBeGreaterThan(0);
    });
  });

  it('renders the Sign In page', async () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <WalletProvider>
            <App />
          </WalletProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Welcome back to AgentFlow/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Sign up/i })).toBeInTheDocument();
    });
  });

  it('renders the Sign Up page', async () => {
    render(
      <MemoryRouter initialEntries={['/signup']}>
        <AuthProvider>
          <WalletProvider>
            <App />
          </WalletProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Create your AgentFlow account/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
      // For password/confirm password, they might both be labeled password, let's use placeholder or specific labels
      expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Create Account/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Sign in/i })).toBeInTheDocument();
    });
  });
});
