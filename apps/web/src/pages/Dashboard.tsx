import React, { useEffect, useState } from 'react';
import { Button } from '../components/ui';
import { PlusCircle, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { formatBaseUnits } from '../utils/currency';
import { ResearchSession } from '../types/research';
import { STATE_PRESENTATION } from '../utils/statePresentation';
import { ResearchState } from '../types/research';

const STATUS_LABEL = (status: string): string => {
  const p = STATE_PRESENTATION[status as ResearchState];
  return p ? p.label : status;
};

const STATUS_TONE = (status: string): 'success' | 'danger' | 'info' | 'warning' | 'neutral' => {
  const p = STATE_PRESENTATION[status as ResearchState];
  return p ? p.tone : 'neutral';
};

const TONE_BADGE: Record<string, string> = {
  success: 'bg-green-100 text-green-800',
  danger: 'bg-red-100 text-red-800',
  warning: 'bg-amber-100 text-amber-800',
  info: 'bg-blue-100 text-blue-800',
  neutral: 'bg-gray-100 text-gray-600',
};

export const Dashboard = () => {
  const navigate = useNavigate();

  const [activeSessions, setActiveSessions] = useState(0);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [totalSpend, setTotalSpend] = useState(0);
  const [recentResearch, setRecentResearch] = useState<ResearchSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      try {
        const [sessions, approvals] = await Promise.all([
          api.getAllSessions(),
          api.getAllApprovals()
        ]);

        if (mounted) {
          const active = sessions.filter(s => s.status !== 'COMPLETED' && s.status !== 'FAILED' && s.status !== 'USER_REJECTED').length;
          const pending = approvals.filter(a => a.status === 'PENDING').length;
          const spent = sessions.reduce((acc, s) => acc + s.spent, 0);

          setActiveSessions(active);
          setPendingApprovals(pending);
          setTotalSpend(spent);
          setRecentResearch(sessions.slice(0, 5));
          setLoading(false);
        }
      } catch (err: unknown) {
        if (mounted) {
          setError(err instanceof Error ? err.message : String(err));
          setLoading(false);
        }
      }
    };

    fetchData();
    return () => { mounted = false; };
  }, []);

  return (
    <main className="flex flex-col h-full">
      {/* Page header */}
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Monitor your active research and recent results.</p>
        </div>
        <Button id="new-research-btn" onClick={() => navigate('/research/new')}>
          <PlusCircle size={16} className="mr-2" aria-hidden="true" />
          New Research
        </Button>
      </header>

      {error ? (
        <div role="alert" className="flex items-start gap-3 bg-red-50 text-red-800 p-4 rounded-lg border border-red-200 mb-6">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Could not load dashboard data</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      ) : (
        <section aria-label="Summary" className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {/* In Progress */}
          <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">In Progress</p>
            <p className={`text-3xl font-bold text-gray-900 ${loading ? 'animate-pulse text-gray-200' : ''}`}>
              {!loading && activeSessions}
            </p>
            <p className="text-xs text-gray-400 mt-1">active research sessions</p>
          </div>

          {/* Needs approval */}
          <button
            onClick={() => navigate('/approvals')}
            className={`bg-white border rounded-lg p-5 shadow-sm text-left hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${pendingApprovals > 0 ? 'border-amber-300' : 'border-gray-200'}`}
            aria-label={`${pendingApprovals} approval${pendingApprovals !== 1 ? 's' : ''} need your attention`}
          >
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Needs Your Approval</p>
            <p className={`text-3xl font-bold ${loading ? 'animate-pulse text-gray-200' : pendingApprovals > 0 ? 'text-amber-600' : 'text-gray-900'}`}>
              {!loading && pendingApprovals}
            </p>
            <p className="text-xs text-gray-400 mt-1">pending approvals</p>
          </button>

          {/* Total spent */}
          <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Total Spent</p>
            <p className={`text-3xl font-bold text-gray-900 ${loading ? 'animate-pulse text-gray-200' : ''}`}>
              {!loading && `$${(totalSpend / 1_000_000).toFixed(2)}`}
            </p>
            <p className="text-xs text-gray-400 mt-1">USDC across all sessions</p>
          </div>
        </section>
      )}

      {/* Recent research */}
      <section aria-label="Recent Research" className="flex-1 border border-gray-200 rounded-lg bg-white overflow-hidden flex flex-col shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-base font-semibold text-gray-900">Recent Research</h2>
          <Button variant="secondary" onClick={() => navigate('/history')}>View all</Button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm animate-pulse" aria-busy="true">Loading…</div>
        ) : recentResearch.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500 text-sm">No research sessions yet.</p>
            <Button className="mt-4" onClick={() => navigate('/research/new')}>Start your first research</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <caption className="sr-only">Recent research sessions</caption>
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Research</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Spent</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {recentResearch.map(session => {
                  const tone = STATUS_TONE(session.status);
                  return (
                    <tr key={session.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 max-w-[300px] truncate" title={session.goal}>
                        {session.goal}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${TONE_BADGE[tone]}`}>
                          {STATUS_LABEL(session.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(session.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatBaseUnits(session.spent, 'USDC')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Button variant="secondary" size="sm" onClick={() => navigate(`/research/${session.id}`)}>
                          Open
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
};
