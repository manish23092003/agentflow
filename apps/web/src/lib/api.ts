import { ResearchSession, Citation, PaymentRecord, ApprovalRequest } from '../types/research';

const API_BASE = '/api/v1';

async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API request failed: ${response.statusText}`);
  }

  return response.json();
}

export const api = {
  // Research Sessions
  startResearch: (goal: string, budget: number) => 
    fetchApi<ResearchSession>('/research/start', {
      method: 'POST',
      body: JSON.stringify({ goal, budget }),
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

  approve: (approvalId: string) => 
    fetchApi<{ status: string; reason?: string }>(`/agent/approve/${approvalId}`, {
      method: 'POST',
    }),

  reject: (approvalId: string) => 
    fetchApi<{ status: string; reason?: string }>(`/agent/reject/${approvalId}`, {
      method: 'POST',
    }),
};
