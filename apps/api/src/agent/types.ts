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
