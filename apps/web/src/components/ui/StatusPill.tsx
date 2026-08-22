import React from 'react';


export function getStatusMeta(status: string) {
  // Map AgentFlow states to Omma status variants
  const activeStates = ['CREATED','RESEARCHING_FREE','EVALUATING_GAPS','PAID_DISCOVERY','SERVICE_EVALUATION','PAYING','SYNTHESIZING'];
  
  if (status === 'COMPLETED') return { cls: 'complete', label: 'Research complete' };
  if (status === 'FAILED') return { cls: 'failed', label: "Couldn't be completed" };
  if (status === 'PAYMENT_AUTHORIZED') return { cls: 'needs', label: 'Approval needed' };
  if (activeStates.includes(status)) return { cls: 'active', label: 'In progress' };
  
  return { cls: 'complete', label: status };
}

export const StatusPill = ({ status, textOverride }: { status: string, textOverride?: string }) => {
  const m = getStatusMeta(status);
  return (
    <span className={`status ${m.cls}`}>
      <span className="status-dot"></span>
      {textOverride || m.label}
    </span>
  );
};
