import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useResearchStream } from '../hooks/useResearchStream.js';
import { ResearchSession, Citation, PaymentRecord } from '../types/research.js';
import { StatusPill } from '../components/ui/StatusPill.js';
import { STATE_PRESENTATION } from '../utils/statePresentation.js';
import { FinalReport } from '../components/report/FinalReport.js';
import { ApprovalCard } from '../components/hitl/ApprovalCard.js';
import { api } from '../lib/api.js';

export const Workspace = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [initialHydrationComplete, setInitialHydrationComplete] = useState(false);
  const [session, setSession] = useState<ResearchSession | null>(null);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [_payments, _setPayments] = useState<PaymentRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'report' | 'evidence'>('report');
  const [activeApprovalId, setActiveApprovalId] = useState<string | null>(null);

  const fetchSession = useCallback(async (): Promise<void> => {
    if (!id) return;
    try {
      const data = await api.getSession(id);
      setSession(data);
    } catch (err: unknown) {
      if (err instanceof Error && (err.message === 'NOT_FOUND' || err.message.includes('404'))) {
        setError('NOT_FOUND');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load this research session.');
      }
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    const hydrate = async () => {
      try {
        const [sessionData, citationsData, paymentsData] = await Promise.all([
          api.getSession(id),
          api.getCitations(id).catch(() => []),
          api.getSessionPayments(id).catch(() => [])
        ]);

        if (mounted) {
          setSession(sessionData);
          setCitations(citationsData);
          _setPayments(paymentsData);
          setInitialHydrationComplete(true);
        }
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : String(err));
      }
    };
    hydrate();
    return () => { mounted = false; };
  }, [id]);

  const { events, connectionStatus } = useResearchStream(initialHydrationComplete ? id : undefined);

  // Re-fetch session when research_completed SSE fires or when we know it's completed but missing the report
  useEffect(() => {
    const completedEvent = events.find(e => e.type === 'research_completed');
    // We use session?._id or any stable check? No, session?.report.
    // Wait, to avoid infinite loop we only fetch if we know it's completed but report is missing.
    // If completedEvent is present, we should also fetch, but only if we haven't already got the report.
    // Let's refine it:
    if ((completedEvent && !session?.report) || (session?.status === 'COMPLETED' && !session?.report)) {
      fetchSession();
    }
  }, [events, session?.status, session?.report, fetchSession]);

  useEffect(() => {
    const approvalEv = events.find(e => e.type === 'approval_required');
    if (approvalEv?.data?.approvalId) {
      setActiveApprovalId(approvalEv.data.approvalId);
    } else if (session?.status === 'PENDING_APPROVAL') {
      api.getAllApprovals().then(list => {
        const found = list.find(a => (a.researchSessionId === id || !a.researchSessionId) && a.status === 'PENDING');
        if (found) setActiveApprovalId(found.id);
      }).catch(console.error);
    }
  }, [events, session?.status, id]);

  if (error) {
    return (
      <div className="flex flex-col h-full p-8 justify-center items-center" style={{ background: 'var(--bg)', fontFamily: 'var(--font-sans)' }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)', padding: '32px', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
          <h2 style={{ fontSize: '18px', color: 'var(--text-0)', marginBottom: '8px' }}>
            {error === 'NOT_FOUND' ? 'Research session not found' : 'Something went wrong'}
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-3)', marginBottom: '24px' }}>{error}</p>
          <button className="btn btn-secondary" onClick={() => navigate('/history')}>Go to History</button>
        </div>
      </div>
    );
  }

  if (!initialHydrationComplete || !session) {
    return (
      <div style={{ display: 'flex', height: '100%', justifyContent: 'center', alignItems: 'center', color: 'var(--text-3)' }}>
        Loading research...
      </div>
    );
  }

  const latestStateEvent = events.filter(e => e.type === 'session_state').pop();
  const currentState = latestStateEvent ? latestStateEvent.data.status : session.status;
  const isCompleted = currentState === 'COMPLETED' && !!session.report;
  const isFailed = currentState === 'FAILED';
  const needsApproval = currentState === 'PENDING_APPROVAL' || currentState === 'PAYMENT_AUTHORIZED' || !!activeApprovalId;

  const additionalSpent = events
    .filter(e => e.type === 'resource_acquired')
    .reduce((acc, e) => acc + (e.data.amount || 0), 0);
  const totalSpent = session.spent + additionalSpent;

  const liveCitations = events
    .filter(e => e.type === 'citation_added')
    .map(e => ({
      id: e.data.citationId || Math.random().toString(),
      title: e.data.title,
      url: e.data.url,
      provider: e.data.provider,
      providerName: e.data.providerName,
      isPaid: e.data.isPaid,
      costBaseUnits: e.data.costBaseUnits,
      retrievedAt: e.timestamp
    }));

  const allCitationsMap = new Map();
  [...citations, ...liveCitations].forEach(c => { if (c.url) allCitationsMap.set(c.url, c); });
  const allCitations = Array.from(allCitationsMap.values());

  const formatUsd = (base: number) => `$${(base / 1_000_000).toFixed(2)}`;
  const statusText = STATE_PRESENTATION[currentState as keyof typeof STATE_PRESENTATION]?.label ?? currentState;

  const getSafeHostname = (url: string): string => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  // Timeline events mapped for display
  const displayEvents = events.map((e, idx) => {
    let label = e.type;
    let sub = '';
    if (e.type === 'session_state') {
      label = STATE_PRESENTATION[e.data.status as keyof typeof STATE_PRESENTATION]?.label ?? e.data.status;
    } else if (e.type === 'citation_added') {
      label = 'Found a source: ' + (e.data.title || 'Web Result');
      sub = e.data.title || '';
    } else if (e.type === 'resource_acquired') {
      label = 'Purchased resource';
      sub = e.data.url;
    } else if (e.type === 'approval_required') {
      label = 'Needs approval';
    } else if (e.type === 'research_failed') {
      label = "Research couldn't be completed";
    } else if (e.type === 'research_completed') {
      label = 'Research complete';
    } else if (e.type === 'payment_started') {
      label = 'Executing x402 payment...';
    } else if (e.type === 'payment_settled') {
      label = '✓ Payment confirmed';
      sub = e.data.transactionId ? `Transaction: ${e.data.transactionId}` : '';
    } else if (e.type === 'service_discovered') {
      label = 'Discovered premium resource';
    } else if (e.type === 'service_evaluated') {
      const decision = e.data.isEligible ? 'PURCHASE' : 'SKIP';
      label = `Decision: ${decision}`;
      sub = `Reason: ${e.data.reason}`;
    } else if (e.type === 'agent_action') {
      label = e.data.action || 'Agent working';
      sub = e.data.details || '';
    }
    const isLast = idx === events.length - 1;
    const dotCls = isCompleted || !isLast ? 'done' : 'now';
    return (
      <div key={idx} className="tl-item">
        <div className={`tl-dot ${dotCls}`}></div>
        <div className="tl-content">
          <div className="tl-label">{label}</div>
          {sub && <div className="tl-sub">{sub}</div>}
          <div className="tl-time">{new Date(e.timestamp).toLocaleTimeString()}</div>
        </div>
      </div>
    );
  });

  // Determine connection display text
  const connIsLive = connectionStatus === 'CONNECTED';
  const connIsReconnecting = connectionStatus === 'RECONNECTING';
  const connText = connIsLive ? 'Live' : connIsReconnecting ? 'Reconnecting…' : 'Offline';

  return (
    <div className="ws-wrapper" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
      <div className="ws-header">
        <div className="ws-title-block">
          <h1 className="ws-title">{session.goal}</h1>
          <div className="ws-status-line">
            <StatusPill status={currentState} textOverride={statusText} />
          </div>
        </div>
        <div className="ws-meta-cluster">
          <div className="ws-meta-item">
            <div className="ws-meta-label">Budget</div>
            <div className="ws-meta-value">{formatUsd(totalSpent)} of {formatUsd(session.researchBudget)}</div>
          </div>
          <div className="ws-meta-item">
            <div className="ws-meta-label">Connection</div>
            <div className="ws-meta-value">
              <span className="conn-dot" style={{ background: connIsLive ? 'var(--green)' : 'var(--text-4)' }}></span>
              {connText}
            </div>
          </div>
        </div>
      </div>

      <div className="ws-body">
        <div className="ws-main">
          <div className="ws-tabs">
            <div className={`ws-tab ${activeTab === 'report' ? 'active' : ''}`} onClick={() => setActiveTab('report')}>Report</div>
            <div className={`ws-tab ${activeTab === 'evidence' ? 'active' : ''}`} onClick={() => setActiveTab('evidence')}>Evidence</div>
          </div>
          
          <div id="ws-tab-content">
            {activeTab === 'evidence' ? (
              <div style={{ maxWidth: 640 }}>
                {allCitations.length === 0 ? (
                  <p className="body-text">No evidence gathered yet.</p>
                ) : (
                  allCitations.map((c, i) => {
                    const hostname = getSafeHostname(c.url);
                    const hasUrl = !!c.url;
                    
                    return (
                      <div 
                        key={i} 
                        className="evidence-card"
                        style={{ display: 'block' }}
                      >
                        <div className="ev-src">
                          {c.provider || c.providerName || hostname} — {c.isPaid ? '🔒 Paid source' : 'Free source'}
                        </div>
                        <p style={{ margin: '4px 0' }}>
                          {hasUrl ? (
                            <a href={c.url} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>
                              {c.title || c.url}
                            </a>
                          ) : (
                            c.title || c.url
                          )}
                        </p>
                        {c.transactionId && (
                          <div style={{ marginTop: 6, fontSize: 11.5, color: 'var(--text-3)' }}>
                            Tx: <a href={`https://testnet.explorer.perawallet.app/tx/${c.transactionId}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>View on Algorand TestNet</a>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              isCompleted ? (
                <FinalReport session={session} />
              ) : isFailed ? (
                <div style={{ maxWidth: 640 }}>
                  <h3 className="section-heading" style={{ color: 'var(--red)', marginBottom: 16 }}>Research couldn&apos;t be completed</h3>
                  <div style={{ background: 'var(--surface-sunken)', border: '1px solid var(--border-soft)', padding: 16, borderRadius: 8, marginBottom: 16 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-1)', marginBottom: 6 }}>What happened</div>
                    <p className="body-text" style={{ color: 'var(--text-2)', fontSize: 14, margin: 0 }}>
                      {session.failureReason?.toLowerCase().includes('quota') || session.failureReason?.toLowerCase().includes('429')
                        ? 'AI research is temporarily unavailable because the AI provider quota has been reached. Please try again in a few moments.'
                        : session.failureReason?.toLowerCase().includes('no tool call')
                        ? 'The research agent did not trigger a search tool call for this goal.'
                        : session.failureReason?.toLowerCase().includes('0 citation') || session.failureReason?.toLowerCase().includes('no useful information')
                        ? 'No useful information was found in the search results to answer this query.'
                        : 'An unexpected issue occurred while conducting research.'}
                    </p>
                  </div>
                  {session.failureReason && (
                    <details style={{ marginTop: 12 }}>
                      <summary style={{ cursor: 'pointer', fontSize: 12.5, color: 'var(--text-3)', fontWeight: 500 }}>Technical details</summary>
                      <pre className="code-block" style={{ marginTop: 8, fontSize: 12, color: 'var(--text-3)', padding: 12, borderRadius: 6, background: 'var(--surface-sunken)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {session.failureReason}
                      </pre>
                    </details>
                  )}
                  {events.filter(e => e.type === 'session_state' && e.data.status === 'FAILED').map(e => e.data.error).filter(Boolean).map((msg, i) => (
                    <p key={i} className="body-text" style={{ color: 'var(--text-3)', fontSize: 13, marginTop: 4 }}>{msg}</p>
                  ))}
                </div>
              ) : (
                <div style={{ maxWidth: 640 }}>
                  <p className="body-text" style={{ fontStyle: 'italic', fontFamily: 'var(--font-serif)', fontSize: 16, color: 'var(--text-2)', marginBottom: 28 }}>
                    &ldquo;I&rsquo;m working on your research question.&rdquo;
                  </p>
                  <div className="panel panel-pad" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', animation: 'softpulse 2.2s ease-in-out infinite' }}></div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-0)' }}>{statusText}</div>
                      <div style={{ fontSize: 12.5, color: 'var(--text-4)', marginTop: 2 }}>This usually takes a minute or two.</div>
                    </div>
                  </div>
                  {activeApprovalId ? (
                    <div style={{ marginTop: 24 }}>
                      <ApprovalCard approvalId={activeApprovalId} session={session} />
                    </div>
                  ) : needsApproval ? (
                    <div style={{ marginTop: 24 }}>
                      <button className="btn btn-primary" onClick={() => navigate('/approvals')}>
                        Review Approval
                      </button>
                    </div>
                  ) : null}
                </div>
              )
            )}
          </div>
        </div>

        <div className="ws-sidebar">
          {!isCompleted && (
            <div>
              <div className="sb-section-title">Activity</div>
              <div className="timeline">
                {displayEvents}
                {displayEvents.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-4)' }}>No activity yet.</p>}
              </div>
            </div>
          )}
          
          <div>
            <div className="sb-section-title">Sources</div>
            <div>
              {allCitations.map((c, i) => {
                const hostname = getSafeHostname(c.url);
                const hasUrl = !!c.url;
                const linkLabel = c.isPaid ? 'Open purchased source' : 'Open source';

                return (
                  <a
                    key={i}
                    href={hasUrl ? c.url : undefined}
                    target={hasUrl ? '_blank' : undefined}
                    rel={hasUrl ? 'noopener noreferrer' : undefined}
                    aria-label={`${linkLabel}: ${c.title || c.url}`}
                    className="source-item"
                    style={{
                      display: 'block',
                      textDecoration: 'none',
                      cursor: hasUrl ? 'pointer' : 'default'
                    }}
                  >
                    <div className="source-top">
                      <div className="source-title" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '70%' }}>{c.title || c.url}</div>
                      <span className={`source-tag ${c.isPaid ? 'paid' : 'free'}`}>{c.isPaid ? 'Paid' : 'Free'}</span>
                    </div>
                    <div className="source-provider">{c.provider || c.providerName || hostname}</div>
                    {hasUrl && (
                      <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 2 }}>
                        {linkLabel} ↗
                      </div>
                    )}
                  </a>
                );
              })}
              {allCitations.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-4)' }}>No sources yet.</p>}
            </div>
          </div>
          
          <div>
            <div className="sb-section-title">Budget</div>
            <div className="budget-module">
              <div className="budget-bar">
                <div className="budget-bar-fill" style={{ width: `${Math.min((totalSpent / session.researchBudget) * 100, 100)}%` }}></div>
              </div>
              <div className="b-row">
                <span className="b-label">Budget</span>
                <span className="b-value">{formatUsd(session.researchBudget)} <span style={{ fontSize: 11, color: 'var(--text-4)', fontWeight: 500 }}>USDC</span></span>
              </div>
              <div className="b-row">
                <span className="b-label">Spent</span>
                <span className="b-value accent">{formatUsd(totalSpent)}</span>
              </div>
              <div className="b-row">
                <span className="b-label">Remaining</span>
                <span className="b-value">{formatUsd(Math.max(session.researchBudget - totalSpent, 0))}</span>
              </div>
            </div>
          </div>
          
          {needsApproval && (
            <div>
              <div className="sb-section-title">Payments</div>
              <button className="btn btn-secondary btn-block" onClick={() => navigate('/approvals')}>Review approval →</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
