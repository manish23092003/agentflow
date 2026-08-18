export interface UserSpendingPolicy {
  maxPerTransaction: number;
  dailyLimit: number;
  allowedAssets: number[];
  allowedNetworks: string[];
  requireApprovalAbove: number;
}

export type PolicyDecision = 
  | { decision: 'APPROVED'; reason: string }
  | { decision: 'DENIED'; reason: string }
  | { decision: 'REQUIRES_APPROVAL'; reason: string };

export interface AgentRequest {
  task: string;
  policy?: UserSpendingPolicy;
}

export interface AgentMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AgentExecutionMetadata {
  model: string;
  toolCalls: unknown[];
  status: 'COMPLETED' | 'FAILED' | 'REQUIRES_APPROVAL';
}

export interface AgentResponse {
  sessionId: string;
  message: string;
  metadata: AgentExecutionMetadata;
}
