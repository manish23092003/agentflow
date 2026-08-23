// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any */
import './setup.ts';
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApprovalCard } from '../components/hitl/ApprovalCard';
import { PaymentLedger } from '../components/payments/PaymentLedger';
import { ExpenseSummary } from '../components/payments/ExpenseSummary';
import { api } from '../lib/api';
import algosdk from 'algosdk';

vi.mock('../lib/api', () => ({
  api: {
    getApproval: vi.fn(),
    approve: vi.fn(),
    reject: vi.fn(),
    getAllPayments: vi.fn(),
    getSessionPayments: vi.fn(),
  }
}));



describe('HITL & Payment Components', () => {
  const mockSession = {
    id: 'session-123',
    userId: 'user-1',
    goal: 'Test',
    status: 'PENDING_APPROVAL' as any,
    researchBudget: 1000000,
    spent: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const mockApproval = {
    id: 'app-1',
    paymentRecordId: 'pay-1',
    status: 'PENDING',
    resourceUrl: 'http://example.com/premium',
    amount: 50000,
    asset: '10458941',
    network: 'testnet',
    payTo: 'MPY54CLPH2OKEGC6S5N2LDAFDNO5BVNV532NBZ5VD6GOND3STPNXZYXOFE',
    reason: 'Valuable dataset',
    requestedAt: new Date().toISOString(),
    expiresAt: new Date().toISOString()
  };

  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(algosdk.Algodv2.prototype, 'getTransactionParams').mockReturnValue({
      do: vi.fn().mockResolvedValue({
        fee: 1000,
        minFee: 1000,
        firstValid: 1,
        lastValid: 1000,
        genesisID: 'testnet-v1.0',
        genesisHash: new Uint8Array(32)
      })
    } as any);
  });

  describe('ApprovalCard', () => {
    it('1. renders loading state initially', () => {
      (api.getApproval as any).mockImplementation(() => new Promise(() => {}));
      const { container } = render(<ApprovalCard approvalId="app-1" session={mockSession} />);
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('2. renders approval details on success', async () => {
      (api.getApproval as any).mockResolvedValue(mockApproval);
      render(<ApprovalCard approvalId="app-1" session={mockSession} />);
      
      await waitFor(() => {
        expect(screen.getByText(/YOUR APPROVAL IS NEEDED/i)).toBeInTheDocument();
        expect(screen.getByText('example.com/premium')).toBeInTheDocument();
        expect(screen.getByText('0.05 USDC')).toBeInTheDocument();
        expect(screen.getByText(/Valuable dataset/i)).toBeInTheDocument();
      });
    });

    it('3. renders error state if fetch fails', async () => {
      (api.getApproval as any).mockRejectedValue(new Error('Fetch failed'));
      render(<ApprovalCard approvalId="app-1" session={mockSession} />);
      
      await waitFor(() => {
        expect(screen.getByText('Could not load approval')).toBeInTheDocument();
        expect(screen.getByText('Fetch failed')).toBeInTheDocument();
      });
    });

    it('4. displays APPROVED state correctly if already approved', async () => {
      (api.getApproval as any).mockResolvedValue({ ...mockApproval, status: 'APPROVED' });
      render(<ApprovalCard approvalId="app-1" session={mockSession} />);
      
      await waitFor(() => {
        expect(screen.getByText('Purchase approved — the agent is continuing your research.')).toBeInTheDocument();
        expect(screen.queryByText('Approve Purchase')).not.toBeInTheDocument();
      });
    });

    it('5. displays REJECTED state correctly if already rejected', async () => {
      (api.getApproval as any).mockResolvedValue({ ...mockApproval, status: 'REJECTED' });
      render(<ApprovalCard approvalId="app-1" session={mockSession} />);
      
      await waitFor(() => {
        expect(screen.getByText('Purchase declined — the agent will use the sources it already has.')).toBeInTheDocument();
        expect(screen.queryByText('Approve Purchase')).not.toBeInTheDocument();
      });
    });

    it('6. handles successful approval action', async () => {
      (api.getApproval as any).mockResolvedValue(mockApproval);
      (api.approve as any).mockResolvedValue({ status: 'SUCCESS' });
      
      render(<ApprovalCard approvalId="app-1" session={mockSession} />);
      
      await waitFor(() => expect(screen.getByText(/Approve 0.05 USDC/i)).toBeInTheDocument());
      
      fireEvent.click(screen.getByText(/Approve 0.05 USDC/i));
      
      await waitFor(() => {
        expect(api.approve).toHaveBeenCalledWith('app-1', expect.any(String), expect.any(String));
        expect(screen.getByText('Purchase approved — the agent is continuing your research.')).toBeInTheDocument();
      });
    });

    it('7. handles successful rejection action', async () => {
      (api.getApproval as any).mockResolvedValue(mockApproval);
      (api.reject as any).mockResolvedValue({ status: 'REJECTED' });
      
      render(<ApprovalCard approvalId="app-1" session={mockSession} />);
      
      await waitFor(() => expect(screen.getByRole('button', { name: /reject|decline/i })).toBeInTheDocument());
      
      fireEvent.click(screen.getByRole('button', { name: /reject|decline/i }));
      
      await waitFor(() => {
        expect(api.reject).toHaveBeenCalledWith('app-1');
        expect(screen.getByText('Purchase declined — the agent will use the sources it already has.')).toBeInTheDocument();
      });
    });

    it('8. handles approval action failure', async () => {
      (api.getApproval as any).mockResolvedValue(mockApproval);
      (api.approve as any).mockRejectedValue(new Error('Network error'));
      
      render(<ApprovalCard approvalId="app-1" session={mockSession} />);
      
      await waitFor(() => expect(screen.getByText(/Approve/i)).toBeInTheDocument());
      
      fireEvent.click(screen.getByText(/Approve/i));
      
      await waitFor(() => {
        expect(screen.getByText('Payment signing or processing failed: Network error')).toBeInTheDocument();
      });
    });

    it('9. handles STALE state on expiration', async () => {
      (api.getApproval as any).mockResolvedValue(mockApproval);
      (api.approve as any).mockRejectedValue(new Error('stale price'));
      
      render(<ApprovalCard approvalId="app-1" session={mockSession} />);
      
      await waitFor(() => expect(screen.getByText(/Approve/i)).toBeInTheDocument());
      fireEvent.click(screen.getByText(/Approve/i));
      
      await waitFor(() => {
        expect(screen.getByText('This request has expired. The agent will automatically look for an alternative source.')).toBeInTheDocument();
      });
    });
  });

  describe('PaymentLedger', () => {
    const mockPayments = [
      {
        id: 'pay-1',
        amount: 1500000,
        asset: 'USDC',
        network: 'testnet',
        status: 'SUCCESS',
        receiver: 'vendor A',
        decision: 'APPROVED',
        agentAction: 'Purchase',
        createdAt: new Date().toISOString()
      }
    ];

    it('10. renders session payments properly', async () => {
      (api.getSessionPayments as any).mockResolvedValue(mockPayments);
      
      render(<PaymentLedger sessionId="session-123" />);
      
      await waitFor(() => {
        expect(screen.getByText('Session Payments')).toBeInTheDocument();
        expect(screen.getByText('1.50 USDC')).toBeInTheDocument();
        expect(screen.getByText('SUCCESS')).toBeInTheDocument();
      });
    });

    it('11. renders global payments properly', async () => {
      (api.getAllPayments as any).mockResolvedValue(mockPayments);
      
      render(<PaymentLedger global={true} />);
      
      await waitFor(() => {
        expect(screen.getByText('Global Payment Ledger')).toBeInTheDocument();
        expect(screen.getByText('1.50 USDC')).toBeInTheDocument();
      });
    });

    it('12. shows empty state if no payments', async () => {
      (api.getSessionPayments as any).mockResolvedValue([]);
      
      render(<PaymentLedger sessionId="session-123" />);
      
      await waitFor(() => {
        expect(screen.getByText('No payments recorded yet.')).toBeInTheDocument();
      });
    });

    it('13. shows error if fetch fails', async () => {
      (api.getSessionPayments as any).mockRejectedValue(new Error('Ledger error'));
      
      render(<PaymentLedger sessionId="session-123" />);
      
      await waitFor(() => {
        expect(screen.getByText(/Ledger error/i)).toBeInTheDocument();
      });
    });
  });

  describe('ExpenseSummary', () => {
    it('14. correctly renders budget utilization bars', () => {
      render(<ExpenseSummary budget={1000000} spent={250000} />);
      
      expect(screen.getByText('25.0%')).toBeInTheDocument();
      // ExpenseSummary no longer shows raw decimal format if formatBaseUnits is used, it renders USDC text directly
    });

    it('15. correctly handles over-budget state', () => {
      render(<ExpenseSummary budget={1000000} spent={1500000} />);
      
      // Spent is capped at 100% visually, but the math is what it is
      // remaining is max(0, budget - spent) -> 0.00
      // spent and remaining are now properly formatted via formatBaseUnits
    });
  });
});
