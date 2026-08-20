import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApprovalRequest } from '../types/research';
import { api } from '../lib/api';
import { formatBaseUnits } from '../utils/currency';

export const Approvals = () => {
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    api.getAllApprovals()
      .then(data => {
        if (mounted) {
          // Filter to only show PENDING requests
          setApprovals(data.filter(a => a.status === 'PENDING'));
          setLoading(false);
        }
      })
      .catch(err => {
        if (mounted) {
          setError(err.message);
          setLoading(false);
        }
      });
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 text-red-800 p-4 rounded-md border border-red-200">
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pending Approvals</h1>
          <p className="text-sm text-gray-500 mt-1">Review and authorize premium resources requested by the agent.</p>
        </div>
        <div className="text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-medium border border-blue-100">
          {approvals.length} Action{approvals.length !== 1 ? 's' : ''} Needed
        </div>
      </div>

      {approvals.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center shadow-sm">
          <div className="text-4xl mb-4">✅</div>
          <h3 className="text-lg font-medium text-gray-900">All caught up!</h3>
          <p className="text-gray-500 mt-1">There are no pending authorization requests.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {approvals.map(approval => (
            <div key={approval.id} className="bg-white border border-blue-200 shadow-sm rounded-lg overflow-hidden flex flex-col hover:shadow-md transition-shadow">
              <div className="h-1 bg-blue-500 w-full" />
              <div className="p-5 flex flex-col flex-grow">
                <div className="flex justify-between items-start mb-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    PENDING
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(approval.requestedAt).toLocaleDateString()}
                  </span>
                </div>
                
                <h3 className="text-md font-semibold text-gray-900 mb-1 break-all" title={approval.resourceUrl}>
                  {new URL(approval.resourceUrl).hostname}
                </h3>
                <p className="text-xl font-bold text-gray-900 mb-4">
                  {formatBaseUnits(approval.amount, approval.asset)}
                </p>
                
                <div className="text-sm text-gray-600 line-clamp-3 mb-6 italic border-l-2 border-gray-200 pl-3">
                  "{approval.reason}"
                </div>

                <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Research Goal</span>
                    <span className="text-sm text-gray-700 truncate max-w-[200px]" title={approval.researchGoal}>
                      {approval.researchGoal || 'Unknown'}
                    </span>
                  </div>
                  {approval.researchSessionId && (
                    <Link 
                      to={`/research/${approval.researchSessionId}`}
                      className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    >
                      Review
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
