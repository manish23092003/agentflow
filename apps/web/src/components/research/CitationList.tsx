import React from 'react';

interface Citation {
  id: string;
  title: string;
  snippet?: string;
  url: string;
  provider: string;
  isPaid: boolean;
  costBaseUnits?: number;
  retrievedAt: string;
}

interface CitationListProps {
  citations: Citation[];
}

export const CitationList: React.FC<CitationListProps> = ({ citations }) => {
  const formatUSDC = (baseUnits: number) => {
    return (baseUnits / 1000000).toFixed(2) + ' USDC';
  };

  if (citations.length === 0) {
    return (
      <div className="py-8 border-t border-[var(--color-border-subtle)]">
        <h3 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-widest mb-4">Sources</h3>
        <p className="text-sm text-[var(--color-text-muted)] italic">No sources collected yet.</p>
      </div>
    );
  }

  return (
    <div className="py-8 border-t border-[var(--color-border-subtle)]">
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-widest">Sources ({citations.length})</h3>
      </div>
      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {citations.map((c, i) => (
          <div key={c.id} className="group flex gap-3">
            <div className="font-mono text-xs text-[var(--color-text-muted)] mt-0.5 shrink-0">
              [{i + 1}]
            </div>
            <div className="flex-1">
              <a 
                href={c.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm font-medium text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-primary)] transition-colors line-clamp-1 leading-snug"
                title={c.title}
              >
                {c.title}
              </a>
              <div className="flex items-center gap-3 mt-1 text-[11px] font-mono">
                <span className="text-[var(--color-text-muted)]">{c.provider}</span>
                <span className="text-[var(--color-border-strong)]">|</span>
                <span className="text-[var(--color-text-muted)]">{new Date(c.retrievedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                {c.isPaid && (
                  <>
                    <span className="text-[var(--color-border-strong)]">|</span>
                    <span className="text-[var(--color-accent-primary)] font-semibold">Premium</span>
                    {c.costBaseUnits && (
                      <span className="text-[var(--color-text-primary)]">{formatUSDC(c.costBaseUnits)}</span>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
