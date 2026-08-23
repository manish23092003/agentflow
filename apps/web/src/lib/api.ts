import { ResearchSession, Citation, PaymentRecord, ApprovalRequest } from '../types/research';
import { AuthResponse, WalletNonceResponse, WalletVerifyResponse } from '../types/auth';

const isProd = import.meta.env.PROD;
const envUrl = import.meta.env.VITE_API_URL;

if (isProd && !envUrl) {
  throw new Error("VITE_API_URL environment variable is required in production");
}

export const API_ORIGIN = envUrl || '';
export const API_BASE = `${API_ORIGIN}/api/v1`;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchApi<T>(url: string, options?: RequestInit, attempt = 1): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${url}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...options?.headers,
      },
    });
  } catch (error) {
    if (attempt <= 3) {
      await sleep(attempt === 1 ? 500 : attempt === 2 ? 1000 : 2000);
      return fetchApi<T>(url, options, attempt + 1);
    }
    throw error;
  }

  if (!response.ok) {
    if (response.status >= 500 && attempt <= 3) {
      await sleep(attempt === 1 ? 500 : attempt === 2 ? 1000 : 2000);
      return fetchApi<T>(url, options, attempt + 1);
    }

    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || errorData.error || `API request failed: ${response.statusText}`);
  }

  return response.json();
}

export const api = {
  // Auth & Identity
  auth: {
    signup: (data: { name: string; email: string; password: string }) =>
      fetchApi<AuthResponse>('/auth/signup', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    login: (data: { email: string; password: string }) =>
      fetchApi<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    googleAuth: (credential: string) =>
      fetchApi<AuthResponse>('/auth/google', {
        method: 'POST',
        body: JSON.stringify({ credential }),
      }),

    getMe: () =>
      fetchApi<AuthResponse>('/auth/me'),

    getWalletNonce: (address: string) =>
      fetchApi<WalletNonceResponse>('/auth/wallet/nonce', {
        method: 'POST',
        body: JSON.stringify({ address }),
      }),

    verifyWallet: (data: { address: string; nonce: string; signature: string; network?: string }) =>
      fetchApi<WalletVerifyResponse>('/auth/wallet/verify', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    logout: () =>
      fetchApi<{ success: boolean; message: string }>('/auth/logout', {
        method: 'POST',
      }),
  },

  // Research Sessions
  startResearch: (goal: string, budget: number, walletAddress: string) => 
    fetchApi<ResearchSession>('/research/start', {
      method: 'POST',
      body: JSON.stringify({ goal, budget, walletAddress }),
    }),

  getAllSessions: () =>
    fetchApi<ResearchSession[]>('/research'),

  getSession: (id: string) => 
    fetchApi<ResearchSession>(`/research/${id}`),

  getCitations: (sessionId: string) => 
    fetchApi<Citation[]>(`/research/${sessionId}/citations`),

  getSessionPayments: (sessionId: string) => 
    fetchApi<PaymentRecord[]>(`/research/${sessionId}/payments`),

  getAllPayments: () =>
    fetchApi<PaymentRecord[]>('/payments'),

  // Approvals
  getApproval: (approvalId: string) =>
    fetchApi<ApprovalRequest>(`/agent/${approvalId}`),

  getAllApprovals: () => 
    fetchApi<ApprovalRequest[]>('/agent/approvals'),

  approve: (approvalId: string, signedTransactionBase64: string, payerAddress?: string) => 
    fetchApi<{ status: string; reason?: string; payload?: { transactionId?: string; amount?: number } }>(`/agent/approve/${approvalId}`, {
      method: 'POST',
      body: JSON.stringify({ signedTransactionBase64, payerAddress }),
    }),

  reject: (approvalId: string) => 
    fetchApi<{ status: string; reason?: string }>(`/agent/reject/${approvalId}`, {
      method: 'POST',
    }),
};
