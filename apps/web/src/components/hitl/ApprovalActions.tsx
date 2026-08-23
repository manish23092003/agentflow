import React from 'react';
import { api } from '../../lib/api';
import { Loader2, Wallet, ExternalLink, ShieldCheck } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import { ApprovalRequest } from '../../types/research';
import algosdk from 'algosdk';

export type ApprovalState = 'PENDING' | 'APPROVING' | 'REJECTING' | 'APPROVED' | 'REJECTED' | 'STALE' | 'FAILED';

interface ApprovalActionsProps {
  approval: ApprovalRequest;
  currentState: ApprovalState;
  costDisplay?: string;
  onStateChange: (state: ApprovalState) => void;
  onError: (error: string) => void;
}

export const ApprovalActions: React.FC<ApprovalActionsProps> = ({
  approval,
  currentState,
  costDisplay,
  onStateChange,
  onError
}) => {
  const [transactionId, setTransactionId] = React.useState<string | null>(null);
  const { isConnected, shortAddress, address, signTransactions } = useWallet();
  const isPending = currentState === 'PENDING';
  const isWorking = currentState === 'APPROVING' || currentState === 'REJECTING';

  const handleApprove = async () => {
    if (!isPending) return;
    if (!isConnected || !address) {
      onError('Please connect your Pera Wallet before approving payment.');
      return;
    }

    onStateChange('APPROVING');
    try {
      // Construct Algorand Transaction using TestNet Algod
      const algodClient = new algosdk.Algodv2('', 'https://testnet-api.algonode.cloud', '');
      const req = algodClient.getTransactionParams();
      const sp = await req.do();

      const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        sender: address,
        receiver: approval.payTo,
        amount: approval.amount,
        assetIndex: Number(approval.asset),
        note: new Uint8Array(Array.from(`x402-payment-v1-${Date.now()}`).map(c => c.charCodeAt(0))),
        suggestedParams: sp
      });

      const txnsToSign = [{ txn, signers: [address] }];
      const signedTxns = await signTransactions([txnsToSign]);
      
      let binary = '';
      const bytes = new Uint8Array(signedTxns[0]);
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const signedTxnBase64 = btoa(binary);

      const res = await api.approve(approval.id, signedTxnBase64, address);
      if (res.status === 'SUCCESS') {
        if (res.payload?.transactionId) {
          setTransactionId(res.payload.transactionId);
        }
        onStateChange('APPROVED');
      } else {
        onStateChange('FAILED');
        onError(res.reason || 'The purchase could not be approved. Please try again.');
      }
    } catch (err: unknown) {
      if (err instanceof Error) console.error('APPROVAL ERROR STACK:', err.stack);
      console.error('APPROVAL ERROR TRACE:', err);
      const message = err instanceof Error ? err.message : String(err);
      console.error('Approval Error:', err);
      if (message.includes('expired') || message.includes('stale')) {
        onStateChange('STALE');
        onError('This request has expired. The agent will automatically look for an alternative source.');
      } else {
        onStateChange('FAILED');
        onError(`Payment signing or processing failed: ${message}`);
      }
    }
  };

  const handleReject = async () => {
    if (!isPending) return;
    onStateChange('REJECTING');
    try {
      const res = await api.reject(approval.id);
      if (res.status === 'REJECTED') {
        onStateChange('REJECTED');
      } else {
        onStateChange('FAILED');
        onError(res.reason || 'The rejection could not be processed. Please try again.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('expired') || message.includes('stale')) {
        onStateChange('STALE');
        onError('This request has already expired.');
      } else {
        onStateChange('FAILED');
        onError('Something went wrong. Please try again.');
      }
    }
  };

  // Post-action confirmation states
  if (currentState === 'APPROVED') {
    return (
      <div className="space-y-3 p-4 bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] rounded">
        <div className="flex items-center gap-2 text-[var(--color-success)] font-medium text-base">
          <ShieldCheck size={18} />
          <span>Purchase approved — the agent is continuing your research.</span>
        </div>
        <div className="text-xs text-[var(--color-text-secondary)] space-y-1.5 font-mono pt-1">
          <div>Amount: <span className="text-[var(--color-text-primary)] font-bold">{costDisplay || '0.001 USDC'}</span></div>
          <div>Network: Algorand TestNet</div>
          {transactionId && (
            <div className="flex flex-col gap-1 pt-1">
              <div>
                <span className="text-[var(--color-text-muted)]">Transaction ID: </span>
                <span className="text-[var(--color-text-primary)] font-semibold break-all">{transactionId}</span>
              </div>
              <div>
                <a
                  href={`https://testnet.explorer.perawallet.app/tx/${transactionId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[var(--color-accent-primary)] hover:underline"
                >
                  <ExternalLink size={12} />
                  View on Pera Algorand Explorer
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (currentState === 'REJECTED') {
    return (
      <div className="flex items-center gap-4 text-[var(--color-text-secondary)]">
        <span className="font-mono text-base">✕</span>
        <span>Purchase declined — the agent will use the sources it already has.</span>
      </div>
    );
  }

  if (currentState === 'STALE') {
    return (
      <div className="flex items-center gap-4 text-[var(--color-text-muted)]">
        <span className="font-mono">⚠</span>
        <span>This request has expired. The agent will automatically look for an alternative source.</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
      <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
        {isConnected ? (
          <>
            <span>Authorizing from:</span>
            <span className="font-mono text-[var(--color-text-primary)] font-semibold">{shortAddress}</span>
          </>
        ) : (
          <div className="flex items-center gap-2 text-[var(--color-warning)]">
            <Wallet size={13} />
            <span>Wallet not connected</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          id="approval-reject-btn"
          onClick={handleReject}
          disabled={isWorking}
          className="px-4 py-2 border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)] rounded text-xs uppercase tracking-wider font-semibold transition-colors disabled:opacity-50"
        >
          {currentState === 'REJECTING' ? 'Rejecting...' : 'Reject'}
        </button>

        <button
          type="button"
          id="approval-approve-btn"
          onClick={handleApprove}
          disabled={isWorking}
          className="px-5 py-2 bg-[var(--accent)] text-[#14130f] rounded text-xs uppercase tracking-wider font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
        >
          {currentState === 'APPROVING' ? (
            <>
              <Loader2 size={13} className="animate-spin" />
              Processing Payment...
            </>
          ) : (
            `Approve ${costDisplay || '0.10 USDC'}`
          )}
        </button>
      </div>
    </div>
  );
};
