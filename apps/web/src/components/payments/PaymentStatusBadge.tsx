import React from 'react';

interface PaymentStatusBadgeProps {
  status: string;
}

export const PaymentStatusBadge: React.FC<PaymentStatusBadgeProps> = ({ status }) => {
  let bgColor = 'bg-gray-100';
  let textColor = 'text-gray-800';

  if (status === 'SUCCESS' || status === 'COMPLETED') {
    bgColor = 'bg-green-100';
    textColor = 'text-green-800';
  } else if (status === 'PENDING' || status === 'PENDING_APPROVAL') {
    bgColor = 'bg-blue-100';
    textColor = 'text-blue-800';
  } else if (status === 'FAILED' || status === 'REJECTED') {
    bgColor = 'bg-red-100';
    textColor = 'text-red-800';
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor} ${textColor}`}>
      {status.replace('_', ' ')}
    </span>
  );
};
