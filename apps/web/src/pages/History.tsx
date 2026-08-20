import React, { useEffect, useState } from 'react';
import { Button } from '../components/ui';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { formatBaseUnits } from '../utils/currency';
import { ResearchSession, ResearchState } from '../types/research';
import { PlusCircle, AlertCircle } from 'lucide-react';
import { STATE_PRESENTATION } from '../utils/statePresentation';

const TONE_BADGE: Record<string, string> = {
  success: 'bg-green-100 text-green-800',
  danger: 'bg-red-100 text-red-800',
  warning: 'bg-amber-100 text-amber-800',
  info: 'bg-blue-100 text-blue-800',
  neutral: 'bg-gray-100 text-gray-600',
};

const statusLabel = (status: string): string => {
  const p = STATE_PRESENTATION[status as ResearchState];
  return p ? p.label : status;
};

const statusBadge = (status: string): string => {
  const p = STATE_PRESENTATION[status as ResearchState];
  return p ? (TONE_BADGE[p.tone] ?? TONE_BADGE.neutral) : TONE_BADGE.neutral;
};

export const History = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<ResearchSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchSessions = async () => {
      try {
        const data = await api.getAllSessions();
        if (mounted) {
          setSessions(data);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (mounted) {
          setError(err instanceof Error ? err.message : String(err));
          setLoading(false);
        }
      }
    };

    fetchSessions();
    return () => { mounted = false; };
  }, []);

  return (
    <main className="flex flex-col h-full">
      {/* Page header */}
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Research History</h1>
          <p className="text-sm text-gray-500 mt-0.5">All past and active research sessions.</p>
        </div>
        <Button id="new-research-history-btn" onClick={() => navigate('/research/new')}>
          <PlusCircle size={16} className="mr-2" aria-hidden="true" />
          New Research
        </Button>
      </header>

      {error ? (
        <div role="alert" className="flex items-start gap-3 bg-red-50 text-red-800 p-4 rounded-lg border border-red-200 mb-6">
          <AlertCircle size={18} className="shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="font-medium">Could not load history</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 border border-gray-200 rounded-lg bg-white overflow-hidden flex flex-col shadow-sm">
          {loading ? (
            <div className="p-12 text-center text-gray-400 text-sm animate-pulse" aria-busy="true">
              Loading history…
            </div>
          ) : sessions.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500 text-sm">No research sessions yet.</p>
              <Button className="mt-4" onClick={() => navigate('/research/new')}>Start your first research</Button>
            </div>
          ) : (
            <div className="overflow-x-auto flex-1">
              <table className="min-w-full divide-y divide-gray-100">
                <caption className="sr-only">All research sessions</caption>
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/2">Research</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Spent</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <span className="sr-only">Open</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {sessions.map(session => (
                    <tr key={session.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 break-words leading-snug">
                        {session.goal}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusBadge(session.status)}`}>
                          {statusLabel(session.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(session.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatBaseUnits(session.spent, 'USDC')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => navigate(`/research/${session.id}`)}
                          aria-label={`Open research: ${session.goal}`}
                        >
                          Open
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </main>
  );
};
