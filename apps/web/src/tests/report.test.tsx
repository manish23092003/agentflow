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

  it('renders completed state with no narrative if report is missing', () => {
    render(<FinalReport session={baseSession} />);
    expect(screen.getByText('Test Goal')).toBeInTheDocument();
    expect(screen.getByText(/Final Research Report/i)).toBeInTheDocument();
    expect(screen.queryByText('Executive Summary')).not.toBeInTheDocument();
    expect(screen.queryByText('Key Findings')).not.toBeInTheDocument();
  });

  it('renders executive summary when string is provided (fallback)', () => {
    render(<FinalReport session={{ ...baseSession, report: 'Just a text summary' }} />);
    expect(screen.getByText('Executive Summary')).toBeInTheDocument();
    expect(screen.getByText('Just a text summary')).toBeInTheDocument();
  });

  it('renders structured report (executive summary, key findings, limitations)', () => {
    const reportObj = {
      executiveSummary: 'This is the summary',
      keyFindings: ['Finding 1', 'Finding 2'],
      limitations: ['Limitation 1']
    };
    render(<FinalReport session={{ ...baseSession, report: JSON.stringify(reportObj) }} />);
    
    expect(screen.getByText('Executive Summary')).toBeInTheDocument();
    expect(screen.getByText('This is the summary')).toBeInTheDocument();
    
    expect(screen.getByText('Key Findings')).toBeInTheDocument();
    expect(screen.getByText('Finding 1')).toBeInTheDocument();
    expect(screen.getByText('Finding 2')).toBeInTheDocument();
    
    expect(screen.getByText('Research Limitations')).toBeInTheDocument();
    expect(screen.getByText('Limitation 1')).toBeInTheDocument();
  });

  it('renders failure reason in limitations when FAILED', () => {
    render(<FinalReport session={{ ...baseSession, status: ResearchState.FAILED, failureReason: 'Out of funds' }} />);
    expect(screen.getByText('Research Limitations')).toBeInTheDocument();
    expect(screen.getByText('Critical Failure')).toBeInTheDocument();
    expect(screen.getByText('Out of funds')).toBeInTheDocument();
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
    expect(screen.getByText('FREE')).toBeInTheDocument();

    expect(screen.getByText('Paid Source')).toBeInTheDocument();
    expect(screen.getByText('PAID')).toBeInTheDocument();
    expect(screen.getByText('0.50 USDC')).toBeInTheDocument(); // 500000 base units
  });

  it('renders transaction proof for paid source with transactionId', () => {
    render(<CitationPanel citations={citations} payments={payments} />);
    
    const viewTxLink = screen.getByText('View transaction');
    expect(viewTxLink).toBeInTheDocument();
    expect(viewTxLink).toHaveAttribute('href', 'https://testnet.explorer.perawallet.app/tx/tx-12345');
  });

  it('does not render transaction proof if transactionId is missing', () => {
    const paymentsNoTx = [{ ...payments[0], transactionId: undefined }];
    render(<CitationPanel citations={citations} payments={paymentsNoTx} />);
    
    expect(screen.queryByText('View transaction')).not.toBeInTheDocument();
  });
  
  it('displays FREE badge if isPaid is false even if cost is present somehow', () => {
    const weirdCitation = { ...citations[0], cost: 1000, isPaid: false };
    render(<CitationPanel citations={[weirdCitation]} payments={[]} />);
    expect(screen.getByText('FREE')).toBeInTheDocument();
    expect(screen.queryByText('PAID')).not.toBeInTheDocument();
  });
});
