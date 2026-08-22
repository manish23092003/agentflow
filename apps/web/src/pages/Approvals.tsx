import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApprovalRequest } from '../types/research';
import { api } from '../lib/api';
import { formatBaseUnits } from '../utils/currency';

export const Approvals = () => {
  const navigate = useNavigate();
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

  return (
    <div className="page">
      <div className="eyebrow">Approvals</div>
      <div className="page-header-row" style={{ marginTop: 0, marginBottom: 24 }}>
        <div>
          <h1 className="hero-title" style={{ fontSize: 32, margin: 0 }}>Pending Approvals</h1>
          <p style={{ color: 'var(--text-3)', fontSize: 14, marginTop: 4 }}>
            Review and authorize premium resources requested by the agent.
          </p>
        </div>
        <div style={{ background: 'var(--surface-sunken)', border: '1px solid var(--border-soft)', padding: '6px 12px', borderRadius: '100px', fontSize: 13, color: 'var(--text-1)', fontWeight: 500 }}>
          {approvals.length} Action{approvals.length !== 1 ? 's' : ''} Needed
        </div>
      </div>

      {error && (
        <div style={{ background: 'var(--red)', color: '#fff', padding: '12px 16px', borderRadius: 'var(--radius-md)', marginBottom: 24 }}>
          <strong>Error: </strong> {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-3)' }}>
          Loading approvals...
        </div>
      ) : approvals.length === 0 ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', background: 'var(--surface)', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>✅</div>
          <h3 style={{ fontSize: 18, fontWeight: 500, color: 'var(--text-1)', marginBottom: 4 }}>All caught up!</h3>
          <p style={{ color: 'var(--text-3)', fontSize: 15 }}>There are no pending authorization requests.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
          {approvals.map(approval => {
            const hostname = new URL(approval.resourceUrl).hostname;
            return (
              <div 
                key={approval.id} 
                style={{ 
                  background: 'var(--surface)', 
                  border: '1px solid var(--border-soft)', 
                  borderRadius: 'var(--radius-lg)', 
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  cursor: 'pointer'
                }}
                onClick={() => navigate(approval.researchSessionId ? `/research/${approval.researchSessionId}` : '#')}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
                  e.currentTarget.style.borderColor = 'var(--accent)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.borderColor = 'var(--border-soft)';
                }}
              >
                <div style={{ height: 4, background: 'var(--accent)', width: '100%' }} />
                <div style={{ padding: 20, display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <span style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      padding: '2px 8px', 
                      borderRadius: 4, 
                      fontSize: 11, 
                      fontWeight: 600, 
                      background: 'rgba(255, 171, 0, 0.1)', 
                      color: 'var(--yellow)',
                      letterSpacing: '0.05em'
                    }}>
                      PENDING
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-4)' }}>
                      {new Date(approval.requestedAt).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)', marginBottom: 4, wordBreak: 'break-all' }} title={approval.resourceUrl}>
                    {hostname}
                  </h3>
                  <p style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-0)', marginBottom: 16 }}>
                    {formatBaseUnits(approval.amount, approval.asset)}
                  </p>
                  
                  <div style={{ 
                    fontSize: 14, 
                    color: 'var(--text-2)', 
                    fontStyle: 'italic', 
                    borderLeft: '2px solid var(--border-soft)', 
                    paddingLeft: 12,
                    marginBottom: 24,
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    "{approval.reason}"
                  </div>

                  <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid var(--border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '65%' }}>
                      <span style={{ fontSize: 11, color: 'var(--text-4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Research Goal</span>
                      <span style={{ fontSize: 13, color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={approval.researchGoal}>
                        {approval.researchGoal || 'Unknown'}
                      </span>
                    </div>
                    {approval.researchSessionId && (
                      <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 13 }}>
                        Review
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
