// @vitest-environment jsdom
import './setup.ts';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';

describe('Application Routing & Shell', () => {
  it('renders the Dashboard by default', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /new research/i })).toBeInTheDocument();
  });

  it('renders New Research page', () => {
    render(
      <MemoryRouter initialEntries={['/research/new']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getAllByText('New Research').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /start research/i })).toBeInTheDocument();
  });

  it('renders the Sidebar with navigation items', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByText('AgentFlow')).toBeInTheDocument();
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0);
    expect(screen.getByText('History')).toBeInTheDocument();
    expect(screen.getByText('Approvals')).toBeInTheDocument();
    expect(screen.getByText('Payments')).toBeInTheDocument();
    expect(screen.getByText('Algorand')).toBeInTheDocument();
    expect(screen.getByText('TestNet')).toBeInTheDocument();
  });
});
