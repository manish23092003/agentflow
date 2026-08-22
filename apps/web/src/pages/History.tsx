import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { formatBaseUnits } from '../utils/currency';
import { ResearchSession } from '../types/research';
import { StatusPill } from '../components/ui/StatusPill';
import { STATE_PRESENTATION } from '../utils/statePresentation';

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
    <div className="page">
      <div className="eyebrow">History</div>
      <div className="page-header-row" style={{ marginTop: 0, marginBottom: 24 }}>
        <h1 className="hero-title" style={{ fontSize: 32, margin: 0 }}>Research History</h1>
        <button className="btn btn-primary" onClick={() => navigate('/research/new')}>
          New Research →
        </button>
      </div>

      {error && (
        <div style={{ background: 'var(--red)', color: '#fff', padding: '12px 16px', borderRadius: 'var(--radius-md)', marginBottom: 24 }}>
          <strong>Error: </strong> {error}
        </div>
      )}

      <div className="research-list">
        {loading ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-3)' }}>
            Loading history...
          </div>
        ) : sessions.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-3)', fontSize: 15, marginBottom: 16 }}>No research sessions found.</p>
            <button className="btn btn-secondary" onClick={() => navigate('/research/new')}>
              Start your first research
            </button>
          </div>
        ) : (
          sessions.map(s => {
            const statusText = STATE_PRESENTATION[s.status]?.label ?? s.status;
            return (
              <div key={s.id} className="research-item" onClick={() => navigate(`/research/${s.id}`)}>
                <div className="ri-main">
                  <div className="ri-title">{s.goal}</div>
                  <div className="ri-meta">
                    <StatusPill status={s.status} textOverride={statusText} />
                    <span className="sep">·</span>
                    <span>Created {new Date(s.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="ri-right">
                  <div className="ri-stat">
                    <div className="n">{formatBaseUnits(s.spent, 'USDC')}</div>
                    <div className="l">Spent</div>
                  </div>
                  <div className="ri-stat">
                    <div className="n">—</div>
                    <div className="l">Sources</div>
                  </div>
                  <div className="ri-arrow">→</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
