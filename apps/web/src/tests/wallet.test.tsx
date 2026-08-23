// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any */
import './setup.ts';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { ApprovalCard } from '../components/hitl/ApprovalCard';
import { WalletProvider, _resetPeraWalletInstance } from '../context/WalletContext';
import { api } from '../lib/api';

import { AuthProvider } from '../context/AuthContext';
import algosdk from 'algosdk';



// Use shared mock from setup.ts
const mockPera = (globalThis as any).__mockPera;
const mockConnect = mockPera.connect;
const mockDisconnect = mockPera.disconnect;
const mockReconnectSession = mockPera.reconnectSession;
const _mockSignTransaction = mockPera.signTransaction;

vi.mock('../lib/api', () => ({
  api: {
    getApproval: vi.fn(),
    approve: vi.fn(),
    reject: vi.fn(),
    getAllPayments: vi.fn(),
    getSessionPayments: vi.fn(),
  }
}));

describe('User Wallet Experience & Pera Integration', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    _resetPeraWalletInstance();
    mockReconnectSession.mockResolvedValue([]);
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

  it('renders disconnected wallet header by default with Connect Pera action', async () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <WalletProvider>
            <Header />
          </WalletProvider>
        </AuthProvider>
      </BrowserRouter>
    );

    expect(screen.getByText('AgentFlow')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Connect Pera/i })).toBeInTheDocument();
    expect(screen.queryByText(/TestNet/i)).not.toBeInTheDocument();
  });

  it('updates header to connected state with shortened address, TestNet tag, and balance on connect', async () => {
    const fullAddress = 'DZDDQQEQWX7EQCVV2YSC5BULDMG5Q3SGVKDTEWV7Z7W5GCGZQUQRK2YLBQ';
    mockConnect.mockResolvedValue([fullAddress]);

    render(
      <BrowserRouter>
        <AuthProvider>
          <WalletProvider>
            <Header />
          </WalletProvider>
        </AuthProvider>
      </BrowserRouter>
    );

    const connectBtn = screen.getByRole('button', { name: /Connect Pera/i });
    fireEvent.click(connectBtn);

    await waitFor(() => {
      // Shortened address: DZDD...K2YLBQ
      expect(screen.getByText('DZDD...K2YLBQ')).toBeInTheDocument();
      expect(screen.getByText('TestNet')).toBeInTheDocument();
    });

    expect(localStorage.getItem('agentflow_wallet_address')).toBe(fullAddress);
  });

  it('allows disconnecting the wallet and returns to unconnected state', async () => {
    const fullAddress = 'DZDDQQEQWX7EQCVV2YSC5BULDMG5Q3SGVKDTEWV7Z7W5GCGZQUQRK2YLBQ';
    localStorage.setItem('agentflow_wallet_address', fullAddress);
    mockReconnectSession.mockResolvedValue([fullAddress]);
    mockDisconnect.mockResolvedValue(undefined);

    render(
      <BrowserRouter>
        <AuthProvider>
          <WalletProvider>
            <Header />
          </WalletProvider>
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('DZDD...K2YLBQ')).toBeInTheDocument();
    });

    // Click connected pill to open dropdown
    const pill = screen.getByRole('button', { expanded: false });
    fireEvent.click(pill);

    const disconnectBtn = screen.getByRole('button', { name: /Disconnect/i });
    fireEvent.click(disconnectBtn);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Connect Pera/i })).toBeInTheDocument();
    });

    expect(localStorage.getItem('agentflow_wallet_address')).toBeNull();
  });

  it('guarantees no seed phrases, mnemonics, or private keys exist in the DOM or localStorage', async () => {
    const fullAddress = 'DZDDQQEQWX7EQCVV2YSC5BULDMG5Q3SGVKDTEWV7Z7W5GCGZQUQRK2YLBQ';
    mockConnect.mockResolvedValue([fullAddress]);

    const { container } = render(
      <BrowserRouter>
        <AuthProvider>
          <WalletProvider>
            <Header />
          </WalletProvider>
        </AuthProvider>
      </BrowserRouter>
    );

    const connectBtn = screen.getByRole('button', { name: /Connect Pera/i });
    fireEvent.click(connectBtn);

    await waitFor(() => {
      expect(screen.getByText('DZDD...K2YLBQ')).toBeInTheDocument();
    });

    const htmlContent = container.innerHTML.toLowerCase();
    expect(htmlContent).not.toContain('mnemonic');
    expect(htmlContent).not.toContain('privatekey');
    expect(htmlContent).not.toContain('secretkey');
    expect(localStorage.getItem('mnemonic')).toBeNull();
    expect(localStorage.getItem('private_key')).toBeNull();
  });

  it('shows wallet requirement banner in ApprovalCard when wallet is disconnected', async () => {
    vi.spyOn(api, 'getApproval').mockResolvedValue({
      id: 'app-123',
      paymentRecordId: 'pay-123',
      resourceUrl: 'https://example.x402.goplausible.xyz/avm/weather',
      amount: 1000,
      asset: '10458941',
      network: 'algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=',
      payTo: 'MPY54CLPH2OKEGC6S5N2LDAFDNO5BVNV532NBZ5VD6GOND3STPNXZYXOFE',
      reason: 'Authoritative structured weather data',
      status: 'PENDING',
      createdAt: new Date().toISOString()
    } as any);

    const mockSession = {
      id: 'sess-123',
      userId: 'test-user',
      goal: 'Weather data',
      status: 'PENDING_APPROVAL',
      researchBudget: 200000,
      spent: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    } as any;

    render(
      <BrowserRouter>
        <WalletProvider>
          <ApprovalCard approvalId="app-123" session={mockSession} />
        </WalletProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/A wallet is required to purchase this paid resource/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Connect Pera Wallet/i })).toBeInTheDocument();
    });
  });

  it('allows approval and displays transaction ID and Pera Explorer link when wallet is connected', async () => {
    const fullAddress = 'DZDDQQEQWX7EQCVV2YSC5BULDMG5Q3SGVKDTEWV7Z7W5GCGZQUQRK2YLBQ';
    localStorage.setItem('agentflow_wallet_address', fullAddress);
    mockReconnectSession.mockResolvedValue([fullAddress]);

    vi.spyOn(api, 'getApproval').mockResolvedValue({
      id: 'app-123',
      paymentRecordId: 'pay-123',
      resourceUrl: 'https://example.x402.goplausible.xyz/avm/weather',
      amount: 1000,
      asset: '10458941',
      network: 'algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=',
      payTo: 'MPY54CLPH2OKEGC6S5N2LDAFDNO5BVNV532NBZ5VD6GOND3STPNXZYXOFE',
      reason: 'Authoritative structured weather data',
      status: 'PENDING',
      createdAt: new Date().toISOString()
    } as any);

    vi.spyOn(api, 'approve').mockResolvedValue({
      status: 'SUCCESS',
      payload: {
        transactionId: 'S7YCVDBDBBV7PNYFPOCF5C4PKPMBVGIHBGOGQ3NRWNA52A6SQ5BA',
        amount: 1000,
        status: 'SUCCESS'
      }
    } as any);

    const mockSession = {
      id: 'sess-123',
      userId: 'test-user',
      goal: 'Weather data',
      status: 'PENDING_APPROVAL',
      researchBudget: 200000,
      spent: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    } as any;

    render(
      <BrowserRouter>
        <WalletProvider>
          <ApprovalCard approvalId="app-123" session={mockSession} />
        </WalletProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Approve/i })).toBeInTheDocument();
      expect(screen.getAllByText('DZDD...K2YLBQ').length).toBeGreaterThan(0);
    });

    const approveBtn = screen.getByRole('button', { name: /Approve/i });
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(screen.getByText(/Purchase approved/i)).toBeInTheDocument();
      expect(screen.getByText('S7YCVDBDBBV7PNYFPOCF5C4PKPMBVGIHBGOGQ3NRWNA52A6SQ5BA')).toBeInTheDocument();
      expect(screen.getByText(/View on Pera Algorand Explorer/i)).toBeInTheDocument();
    });
  });
});
