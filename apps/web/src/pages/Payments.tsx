import React from 'react';
import { PaymentLedger } from '../components/payments/PaymentLedger';

export const Payments = () => {
  return (
    <div className="page">
      <div className="eyebrow">Ledger</div>
      <div className="page-header-row" style={{ marginTop: 0, marginBottom: 32 }}>
        <div>
          <h1 className="hero-title" style={{ fontSize: 32, margin: 0 }}>Payment History</h1>
          <p style={{ color: 'var(--text-3)', fontSize: 14, marginTop: 4 }}>
            A complete ledger of all autonomous procurement transactions across all research sessions.
          </p>
        </div>
      </div>

      <PaymentLedger global={true} />
    </div>
  );
};
