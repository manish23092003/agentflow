import React, { useEffect, useState } from 'react';
import { PaymentRecord } from '../../types/research';
import { PaymentRow } from './PaymentRow';
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
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm animate-pulse p-4">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="space-y-3">
          <div className="h-8 bg-gray-100 rounded"></div>
          <div className="h-8 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-red-200 rounded-lg p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-red-800">Error Loading Ledger</h3>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
          {global ? 'Global Payment Ledger' : 'Session Payment Ledger'}
        </h2>
        <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded border border-gray-200 font-mono">
          {payments.length} {payments.length === 1 ? 'Transaction' : 'Transactions'}
        </span>
      </div>
      
      {payments.length === 0 ? (
        <div className="p-8 text-center text-gray-500 text-sm">
          No payments recorded yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resource / Payee</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction ID</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payments.map(payment => (
                <PaymentRow key={payment.id} payment={payment} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
