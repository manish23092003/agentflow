/* eslint-disable @typescript-eslint/no-explicit-any */
export enum ResearchState {
  CREATED = 'CREATED',
  RESEARCHING_FREE = 'RESEARCHING_FREE',
  FREE_RESEARCH_COMPLETE = 'FREE_RESEARCH_COMPLETE',
  EVALUATING_GAPS = 'EVALUATING_GAPS',
  PAID_DISCOVERY = 'PAID_DISCOVERY',
  SERVICE_EVALUATION = 'SERVICE_EVALUATION',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  PAYMENT_AUTHORIZED = 'PAYMENT_AUTHORIZED',
  PAYING = 'PAYING',
  RESOURCE_ACQUIRED = 'RESOURCE_ACQUIRED',
  SYNTHESIZING = 'SYNTHESIZING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  USER_REJECTED = 'USER_REJECTED',
  ALTERNATIVE_DISCOVERY = 'ALTERNATIVE_DISCOVERY'
}

export interface ResearchSession {
  id: string;
  userId: string;
  goal: string;
  status: ResearchState;
  researchBudget: number;
  spent: number;
  createdAt: string;
  updatedAt: string;
  failureReason?: string;
  report?: string;
}

export interface Citation {
  id: string;
  researchSessionId: string;
  url: string;
  title?: string;
  snippet?: string;
  sourceType: string;
  provider: string;
  retrievedAt: string;
  relevanceScore?: number;
  contentHash?: string;
  isPaid: boolean;
  cost: number;
  purchaseId?: string;
}

export interface PaymentRecord {
  id: string;
  transactionId?: string;
  amount: number;
  asset: string;
  receiver: string;
  network: string;
  decision: string;
  status: string;
  agentAction: string;
  createdAt: string;
  timestamp?: string; // from Json/Prisma repo mapping
  resource?: string; // from mapping
  researchSessionId?: string;
}

export interface ApprovalRequest {
  id: string;
  paymentRecordId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';
  resourceUrl: string;
  amount: number;
  asset: string;
  network: string;
  payTo: string;
  reason: string;
  requestedAt: string;
  expiresAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  resolvedBy?: string;
  resolutionReason?: string;
  researchSessionId?: string;
  researchGoal?: string;
}

export interface BaseEvent {
  id: string;
  sessionId: string;
  type: string;
  timestamp: string;
  data: any;
}
