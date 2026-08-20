import React from 'react';
import { PaymentRecord } from '../../types/research';
import { PaymentStatusBadge } from './PaymentStatusBadge';
import { formatBaseUnits } from '../../utils/currency';
import { getExplorerTxUrl } from '../../utils/explorer';

interface PaymentRowProps {
  payment: PaymentRecord;
}

export const PaymentRow: React.FC<PaymentRowProps> = ({ payment }) => {
  const explorerLink = payment.transactionId && payment.network.toLowerCase().includes('testnet')
    ? getExplorerTxUrl(payment.transactionId)
    : undefined;

  // Use timestamp if present, otherwise fallback to createdAt
  const dateStr = payment.timestamp || payment.createdAt;
  const date = dateStr ? new Date(dateStr) : new Date();

  return (
    <tr className="hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0">
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {date.toLocaleString()}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium truncate max-w-xs" title={payment.resource || payment.receiver}>
        {payment.resource || payment.receiver}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
        {formatBaseUnits(payment.amount, payment.asset)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <PaymentStatusBadge status={payment.status} />
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {payment.transactionId ? (
          explorerLink ? (
            <a href={explorerLink} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline flex items-center">
              <span className="truncate max-w-[120px] inline-block">{payment.transactionId}</span>
              <svg className="ml-1 w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          ) : (
            <span className="truncate max-w-[120px] inline-block" title={payment.transactionId}>{payment.transactionId}</span>
          )
        ) : (
          <span className="text-gray-400 italic">Pending...</span>
        )}
      </td>
    </tr>
  );
};
