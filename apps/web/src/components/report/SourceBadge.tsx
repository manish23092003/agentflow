import React from 'react';

interface SourceBadgeProps {
  isPaid: boolean;
  costBaseUnits?: number;
}
export const SourceBadge: React.FC<SourceBadgeProps> = ({ isPaid }) => {
  if (isPaid) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
        PAID
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
      FREE
    </span>
  );
};
