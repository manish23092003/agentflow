import React from 'react';
import { PaymentLedger } from '../components/payments/PaymentLedger';

export const Payments = () => {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Payment History</h1>
        <p className="text-sm text-gray-500 mt-1">A complete ledger of all autonomous procurement transactions across all research sessions.</p>
      </div>

      <PaymentLedger global={true} />
    </div>
  );
};
