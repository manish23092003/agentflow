import React, { useEffect, useState } from 'react';
import { PaymentRecord } from '../../types/research';
import { PaymentRow, CompactPaymentRow } from './PaymentRow';
import { api } from '../../lib/api';

interface PaymentLedgerProps {
  sessionId?: string;
  global?: boolean;
}

export const PaymentLedger: React.FC<PaymentLedgerProps> = ({ sessionId, global = false }) => {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const fetcher = global 
      ? api.getAllPayments() 
      : (sessionId ? api.getSessionPayments(sessionId) : Promise.resolve([]));

    fetcher
      .then(data => {
        if (!isMounted) return;
        setPayments(data);
        setLoading(false);
      })
      .catch(err => {
        if (!isMounted) return;
        setError(err.message || 'Failed to load payments');
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [sessionId, global]);

  if (loading) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-3)' }}>
        Loading payments...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ background: 'var(--red)', color: '#fff', padding: '12px 16px', borderRadius: 'var(--radius-md)' }}>
        <strong>Error: </strong> {error}
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid var(--border-soft)', background: 'var(--bg-1)' }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
          {global ? 'Global Payment Ledger' : 'Session Payments'}
        </h3>
        <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-3)' }}>
          {payments.length} {payments.length === 1 ? 'Tx' : 'Txs'}
        </span>
      </div>
      
      {payments.length === 0 ? (
        <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>
          No payments recorded yet.
        </div>
      ) : global ? (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-strong)' }}>
                {['Date', 'Resource / Payee', 'Amount', 'Status', 'Transaction ID'].map((h, i) => (
                  <th key={i} style={{ padding: '12px 24px', fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.map(payment => (
                <PaymentRow key={payment.id} payment={payment} />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ maxHeight: 300, overflowY: 'auto' }}>
          {payments.map(payment => (
            <CompactPaymentRow key={payment.id} payment={payment} />
          ))}
        </div>
      )}
    </div>
  );
};
