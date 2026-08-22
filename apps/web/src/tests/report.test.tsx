// @vitest-environment jsdom
import './setup';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { FinalReport } from '../components/report/FinalReport';
import { CitationPanel } from '../components/report/CitationPanel';
import { ResearchSession, Citation, PaymentRecord, ResearchState } from '../types/research';

vi.mock('../utils/explorer', () => ({
  getExplorerTxUrl: (id?: string) => id ? `https://testnet.explorer.perawallet.app/tx/${id}` : null
}));

vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => {
    // Basic markdown → plain text conversion for testing
    const lines = (children || '').split('\n').map(line => {
      // Strip heading markers
      const stripped = line.replace(/^#{1,6}\s+/, '').replace(/^\*(.+)\*$/, '$1');
      return stripped;
    }).filter(l => l.trim().length > 0);
    return React.createElement(
      'div',
      { 'data-testid': 'markdown-content' },
      ...lines.map((line, i) => React.createElement('p', { key: i }, line))
    );
  }
}));

vi.mock('remark-gfm', () => ({ default: () => {} }));

describe('FinalReport', () => {
  const baseSession: ResearchSession = {
    id: 'test-session',
    userId: 'user-1',
    goal: 'Test Goal',
    status: ResearchState.COMPLETED,
    researchBudget: 1000000,
    spent: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('renders completed state with placeholder if report is missing', () => {
    render(<FinalReport session={baseSession} />);
    expect(screen.getByText(/Test Goal/i)).toBeInTheDocument();
    expect(screen.getByText(/Final Output/i)).toBeInTheDocument();
    expect(screen.getByText('No report content available.')).toBeInTheDocument();
  });

  it('renders markdown report when string is provided', () => {
    render(<FinalReport session={{ ...baseSession, report: '# Executive Summary\n\nJust a text summary' }} />);
    expect(screen.getByText('Executive Summary')).toBeInTheDocument();
    expect(screen.getByText('Just a text summary')).toBeInTheDocument();
  });
});

describe('CitationPanel', () => {
  const citations: Citation[] = [
    {
      id: 'c1',
      researchSessionId: 'test-session',
      url: 'https://example.com/free',
      title: 'Free Source',
      provider: 'Tavily',
      sourceType: 'WEB_SEARCH',
      retrievedAt: new Date().toISOString(),
      isPaid: false,
      cost: 0
    },
    {
      id: 'c2',
      researchSessionId: 'test-session',
      url: 'https://example.com/paid',
      title: 'Paid Source',
      provider: 'x402-bazaar',
      sourceType: 'X402_RESOURCE',
      retrievedAt: new Date().toISOString(),
      isPaid: true,
      cost: 500000,
      purchaseId: 'p1'
    }
  ];

  const payments: PaymentRecord[] = [
    {
      id: 'p1',
      transactionId: 'tx-12345',
      amount: 500000,
      asset: '10458941',
      network: 'testnet',
      receiver: 'someone',
      decision: 'APPROVED',
      status: 'SUCCESS',
      agentAction: 'pay',
      createdAt: new Date().toISOString()
    }
  ];

  it('renders free and paid badges properly', () => {
    render(<CitationPanel citations={citations} payments={payments} />);
    
    expect(screen.getByText('Free Source')).toBeInTheDocument();
    expect(screen.getAllByText('Premium')).toHaveLength(1);

    expect(screen.getByText('Paid Source')).toBeInTheDocument();
    expect(screen.getByText('0.50 USDC')).toBeInTheDocument(); // 500000 base units
  });

  it('renders transaction proof for paid source with transactionId', () => {
    render(<CitationPanel citations={citations} payments={payments} />);
    
    const viewTxLink = screen.getByText('Proof of payment');
    expect(viewTxLink).toBeInTheDocument();
    expect(viewTxLink).toHaveAttribute('href', 'https://testnet.explorer.perawallet.app/tx/tx-12345');
  });

  it('does not render transaction proof if transactionId is missing', () => {
    const paymentsNoTx = [{ ...payments[0], transactionId: undefined }];
    render(<CitationPanel citations={citations} payments={paymentsNoTx} />);
    
    expect(screen.queryByText('Proof of payment')).not.toBeInTheDocument();
  });
  
  it('displays FREE badge if isPaid is false even if cost is present somehow', () => {
    const weirdCitation = { ...citations[0], cost: 1000, isPaid: false };
    render(<CitationPanel citations={[weirdCitation]} payments={[]} />);
    expect(screen.queryByText('Premium')).not.toBeInTheDocument();
  });
});
