import React from 'react';
import { PaymentRecord } from '../../types/research';
import { formatBaseUnits } from '../../utils/currency';
import { getExplorerTxUrl } from '../../utils/explorer';
import { ExternalLink } from 'lucide-react';
import { StatusPill } from '../ui/StatusPill';

interface PaymentRowProps {
  payment: PaymentRecord;
}

export const PaymentRow: React.FC<PaymentRowProps> = ({ payment }) => {
  const isTestnet = payment.network.toLowerCase().includes('testnet') || payment.network.includes('SGO1GKSz');
  const explorerLink = payment.transactionId && isTestnet
    ? getExplorerTxUrl(payment.transactionId)
    : undefined;

  const dateStr = payment.timestamp || payment.createdAt;
  const date = dateStr ? new Date(dateStr) : new Date();

  return (
    <tr style={{ borderBottom: '1px solid var(--border-soft)', transition: 'background 0.15s ease' }} 
        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-raised)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
    >
      <td style={{ padding: '16px 24px', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-3)' }}>
        {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </td>
      <td style={{ padding: '16px 24px', fontSize: 14, color: 'var(--text-1)', maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={payment.resource || payment.receiver}>
        {payment.resource || payment.receiver}
      </td>
      <td style={{ padding: '16px 24px', fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--text-0)', fontWeight: 500 }}>
        {formatBaseUnits(payment.amount, payment.asset)}
      </td>
      <td style={{ padding: '16px 24px' }}>
        <StatusPill status={payment.status} />
      </td>
      <td style={{ padding: '16px 24px', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-3)' }}>
        {payment.transactionId ? (
          explorerLink ? (
            <a href={explorerLink} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }} title={payment.transactionId}>
              <span style={{ maxWidth: 120, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block' }}>{payment.transactionId}</span>
              <ExternalLink size={12} />
            </a>
          ) : (
            <span style={{ maxWidth: 120, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block' }} title={payment.transactionId}>{payment.transactionId}</span>
          )
        ) : (
          <span style={{ fontStyle: 'italic', fontFamily: 'var(--font-serif)', color: 'var(--text-4)' }}>Pending...</span>
        )}
      </td>
    </tr>
  );
};

export const CompactPaymentRow: React.FC<PaymentRowProps> = ({ payment }) => {
  const isTestnet = payment.network.toLowerCase().includes('testnet') || payment.network.includes('SGO1GKSz');
  const explorerLink = payment.transactionId && isTestnet
    ? getExplorerTxUrl(payment.transactionId)
    : undefined;

  const dateStr = payment.timestamp || payment.createdAt;
  const date = dateStr ? new Date(dateStr) : new Date();
  
  return (
    <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-soft)', transition: 'background 0.15s ease' }}
         onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-raised)'}
         onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <span style={{ fontSize: 14, color: 'var(--text-1)', maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={payment.resource || payment.receiver}>
          {payment.resource || payment.receiver}
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--text-0)', fontWeight: 500 }}>
          {formatBaseUnits(payment.amount, payment.asset)}
        </span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <StatusPill status={payment.status} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-4)' }}>{date.toLocaleDateString()}</span>
        </div>
        {payment.transactionId && (
          explorerLink ? (
            <a href={explorerLink} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 12 }} title={payment.transactionId}>
              <span style={{ maxWidth: 100, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{payment.transactionId}</span>
              <ExternalLink size={12} />
            </a>
          ) : (
            <span style={{ color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: 12, maxWidth: 100, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={payment.transactionId}>{payment.transactionId}</span>
          )
        )}
      </div>
    </div>
  );
};
