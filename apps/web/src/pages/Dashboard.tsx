import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { ResearchSession } from '../types/research';
import { StatusPill } from '../components/ui/StatusPill';
import { STATE_PRESENTATION } from '../utils/statePresentation';
import { useAuth } from '../context/AuthContext';

export const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [active, setActive]   = useState(0);
  const [pending, setPending] = useState(0);
  const [spent, setSpent]     = useState(0);
  const [recent, setRecent]   = useState<ResearchSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let m = true;
    (async () => {
      try {
        const [sessions, approvals] = await Promise.all([api.getAllSessions(), api.getAllApprovals()]);
        if (!m) return;
        setActive(sessions.length);
        setPending(approvals.filter(a => a.status === 'PENDING').length);
        setSpent(sessions.reduce((a, s) => a + s.spent, 0));
        setRecent(sessions.slice(0, 8));
        setLoading(false);
      } catch {
        if (m) setLoading(false);
      }
    })();
    return () => { m = false; };
  }, []);

  const formatUsd = (baseUnits: number) => `$${(baseUnits / 1_000_000).toFixed(2)}`;

  const firstName = user?.name ? user.name.split(' ')[0] : 'Researcher';

  return (
    <div className="page">
      <div className="eyebrow">Dashboard</div>
      <h1 className="hero-title">Welcome back, {firstName}.<br/>What are you researching today?</h1>
      <div style={{ marginTop: 22 }}>
        <button className="btn btn-primary" onClick={() => navigate('/research/new')}>
          New Research →
        </button>
      </div>

      <div className="metrics-row">
        <div className="metric">
          <div className="metric-label">Total Research</div>
          <div className="metric-value">{loading ? '—' : active}</div>
        </div>
        <div className="metric" style={{ cursor: 'pointer' }} onClick={() => navigate('/approvals')}>
          <div className="metric-label">Needs Approval</div>
          <div className="metric-value">{loading ? '—' : pending}</div>
        </div>
        <div className="metric" style={{ cursor: 'pointer' }} onClick={() => navigate('/payments')}>
          <div className="metric-label">Total Spent</div>
          <div className="metric-value">
            {loading ? '—' : formatUsd(spent)} <span className="unit">USDC</span>
          </div>
        </div>
      </div>

      <div className="page-header-row">
        <div className="section-title">Current Research</div>
        <div className="muted" style={{ fontSize: 13 }}>{recent.length} total</div>
      </div>
      
      <div className="research-list">
        {loading ? (
           <div style={{ padding: '20px', color: 'var(--text-3)' }}>Loading...</div>
        ) : recent.length === 0 ? (
           <div style={{ padding: '20px', color: 'var(--text-3)' }}>No research sessions found.</div>
        ) : (
          recent.map(s => {
            const statusText = STATE_PRESENTATION[s.status]?.label ?? s.status;
            return (
              <div key={s.id} className="research-item" onClick={() => navigate(`/research/${s.id}`)}>
                <div className="ri-main">
                  <div className="ri-title">{s.goal}</div>
                  <div className="ri-meta">
                    <StatusPill status={s.status} textOverride={statusText} />
                    <span className="sep">·</span>
                    <span>Updated {new Date(s.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="ri-right">
                  <div className="ri-stat">
                    <div className="n">{formatUsd(s.spent)}</div>
                    <div className="l">Spent</div>
                  </div>
                  {/* Assuming sources isn't readily available on the session summary, we'll omit or put 0 */}
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
