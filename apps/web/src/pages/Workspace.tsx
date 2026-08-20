import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useResearchStream } from '../hooks/useResearchStream.js';
import { WorkspaceHeader } from '../components/research/WorkspaceHeader.js';
import { LiveTimeline } from '../components/research/LiveTimeline.js';
import { CitationList } from '../components/research/CitationList.js';
import { ProcurementContext } from '../components/research/ProcurementContext.js';
import { ApprovalCard } from '../components/hitl/ApprovalCard.js';
import { ReportArea } from '../components/research/ReportArea.js';
import { PaymentLedger } from '../components/payments/PaymentLedger.js';
import { FinalReport } from '../components/report/FinalReport.js';
import { CitationPanel } from '../components/report/CitationPanel.js';
import { ExpenseSummary } from '../components/payments/ExpenseSummary.js';
import { ResearchSession, Citation, PaymentRecord } from '../types/research.js';
import { Button } from '../components/ui/index.js';
import { AlertCircle } from 'lucide-react';

export const Workspace = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [initialHydrationComplete, setInitialHydrationComplete] = useState(false);
  const [session, setSession] = useState<ResearchSession | null>(null);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Hydrate initial state
  useEffect(() => {
    if (!id) return;

    let mounted = true;

    const hydrate = async () => {
      try {
        const [sessionRes, citationsRes, paymentsRes] = await Promise.all([
          fetch(`/api/v1/research/${id}`),
          fetch(`/api/v1/research/${id}/citations`),
          fetch(`/api/v1/research/${id}/payments`)
        ]);

        if (!sessionRes.ok) {
          if (sessionRes.status === 404) {
            throw new Error('NOT_FOUND');
          }
          throw new Error('Failed to load this research session.');
        }

        const sessionData = await sessionRes.json();
        const citationsData = citationsRes.ok ? await citationsRes.json() : [];
        const paymentsData = paymentsRes.ok ? await paymentsRes.json() : [];

        if (mounted) {
          setSession(sessionData);
          setCitations(citationsData);
          setPayments(paymentsData);
          setInitialHydrationComplete(true);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    };

    hydrate();

    return () => { mounted = false; };
  }, [id]);

  // Only connect to SSE stream once hydration is complete
  const { events, connectionStatus } = useResearchStream(initialHydrationComplete ? id : undefined);

  // --- Error state ---
  if (error) {
    const isNotFound = error === 'NOT_FOUND';
    return (
      <main className="flex flex-col h-full p-8 justify-center items-center">
        <div className="bg-white border border-red-200 rounded-xl p-8 max-w-sm w-full text-center shadow-sm">
          <AlertCircle size={36} className="text-red-400 mx-auto mb-4" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            {isNotFound ? 'Research session not found' : 'Something went wrong'}
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            {isNotFound
              ? 'This research session may have been deleted or the link is incorrect.'
              : error}
          </p>
          <Button onClick={() => navigate('/history')}>Go to History</Button>
        </div>
      </main>
    );
  }

  // --- Loading state ---
  if (!initialHydrationComplete || !session) {
    return (
      <main className="flex flex-col h-full justify-center items-center" aria-busy="true">
        <div className="w-10 h-10 rounded-full border-4 border-gray-200 border-t-blue-600 animate-spin" aria-hidden="true" />
        <p className="mt-4 text-gray-500 text-sm font-medium">Loading research…</p>
      </main>
    );
  }

  // --- Derive current state from initial session + live SSE events ---
  const latestStateEvent = events.filter(e => e.type === 'session_state').pop();
  const currentState = latestStateEvent ? latestStateEvent.data.status : session.status;
  const failureReason = latestStateEvent?.data.error || session.failureReason;

  const additionalSpent = events
    .filter(e => e.type === 'resource_acquired')
    .reduce((acc, e) => acc + (e.data.amount || 0), 0);
  const totalSpent = session.spent + additionalSpent;

  // Track citations: deduplicate by URL
  const liveCitations = events
    .filter(e => e.type === 'citation_added')
    .map(e => ({
      id: e.data.citation?.id || Math.random().toString(),
      title: e.data.citation?.title,
      url: e.data.citation?.url,
      provider: e.data.citation?.provider,
      providerName: e.data.citation?.providerName,
      isPaid: e.data.citation?.isPaid,
      costBaseUnits: e.data.citation?.costBaseUnits,
      retrievedAt: e.timestamp
    }));

  const allCitationsMap = new Map();
  [...citations, ...liveCitations].forEach(c => { if (c.url) allCitationsMap.set(c.url, c); });
  const allCitations = Array.from(allCitationsMap.values());

  // Pending approval event
  const approvalEvent = events.filter(e => e.type === 'approval_required').pop();
  const approvalId = approvalEvent?.data?.approvalId || null;

  // Procurement context
  const evalEvent = events.filter(e => e.type === 'service_evaluated').pop() || null;

  const isCompleted = currentState === 'COMPLETED';

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <WorkspaceHeader
        goal={session.goal}
        state={currentState}
        createdAt={session.createdAt}
        spent={totalSpent}
        totalBudget={session.researchBudget}
        connectionStatus={connectionStatus}
      />

      <div className="flex-1 overflow-hidden p-4 md:p-6">
        <div className="max-w-[1600px] mx-auto h-full grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* ── Main content ── */}
          <main className="lg:col-span-8 flex flex-col h-full space-y-6 overflow-y-auto pb-6">

            {/* Approval card — always first when active */}
            {currentState === 'PENDING_APPROVAL' && approvalId && (
              <ApprovalCard approvalId={approvalId} session={session} />
            )}

            {/* Report area — dominates main column */}
            {isCompleted ? (
              <FinalReport session={session} />
            ) : (
              <ReportArea
                state={currentState}
                failureReason={failureReason}
                reportContent={session.report}
              />
            )}
          </main>

          {/* ── Sidebar ── */}
          <aside className="lg:col-span-4 flex flex-col h-full space-y-4 overflow-y-auto pb-6">

            {/* Budget summary */}
            <ExpenseSummary budget={session.researchBudget} spent={totalSpent} />

            {/* Procurement context (service evaluation detail) */}
            <ProcurementContext event={evalEvent} />

            {/* Sources / citations */}
            {isCompleted ? (
              <CitationPanel citations={allCitations} payments={payments} />
            ) : (
              <CitationList citations={allCitations} />
            )}

            {/* Agent activity timeline */}
            {!isCompleted && <LiveTimeline events={events} />}

            {/* Payment ledger — moved to sidebar */}
            <PaymentLedger sessionId={id} />

          </aside>
        </div>
      </div>
    </div>
  );
};
