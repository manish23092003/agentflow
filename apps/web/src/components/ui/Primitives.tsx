import React from 'react';
import clsx from 'clsx';
import './ui.css';

// --- Card ---
export const Card = ({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) => (
  <div className={clsx('ui-card', className)} onClick={onClick}>{children}</div>
);

// --- Badge ---
export const Badge = ({ children, variant = 'neutral', className }: { children: React.ReactNode; variant?: 'neutral'|'success'|'warning'|'danger'|'info'; className?: string }) => (
  <span className={clsx('ui-badge', `ui-badge-${variant}`, className)}>{children}</span>
);

// --- Divider ---
export const Divider = ({ className }: { className?: string }) => (
  <div className={clsx('ui-divider', className)} />
);

// --- Progress Bar ---
export const ProgressBar = ({ progress, className }: { progress: number; className?: string }) => (
  <div className={clsx('ui-progress', className)}>
    <div className="ui-progress-fill" style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
  </div>
);

// --- Data Row ---
export const DataRow = ({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) => (
  <div className={clsx('ui-data-row', className)}>
    <span className="ui-data-label">{label}</span>
    <span className="ui-data-value">{value}</span>
  </div>
);

// --- Empty State ---
export const EmptyState = ({ icon, title, description, action, className }: { icon: React.ReactNode; title: string; description: string; action?: React.ReactNode; className?: string }) => (
  <div className={clsx('ui-empty', className)}>
    <div className="ui-empty-icon">{icon}</div>
    <div className="ui-empty-title">{title}</div>
    <div className="ui-empty-desc mb-4">{description}</div>
    {action && <div>{action}</div>}
  </div>
);

// --- Page Header ---
export const PageHeader = ({ title, description, action, className }: { title: string; description?: string; action?: React.ReactNode; className?: string }) => (
  <div className={clsx('flex justify-between items-center mb-6', className)}>
    <div>
      <h1 className="text-xl font-semibold text-primary">{title}</h1>
      {description && <p className="text-sm text-secondary mt-1">{description}</p>}
    </div>
    {action && <div>{action}</div>}
  </div>
);

// --- Status Indicator ---
export const StatusIndicator = ({ status, label, className }: { status: 'neutral'|'success'|'warning'|'danger'|'info'; label: string; className?: string }) => {
  const bgClass = {
    neutral: 'bg-[var(--color-text-muted)]',
    success: 'bg-[var(--color-success)]',
    warning: 'bg-[var(--color-warning)]',
    danger: 'bg-[var(--color-danger)]',
    info: 'bg-[var(--color-info)]'
  }[status];

  return (
    <div className={clsx('flex items-center gap-2', className)}>
      <span className={clsx('w-2 h-2 rounded-full', bgClass)} />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
};

// --- IconButton ---
export const IconButton = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, ...props }, ref) => (
    <button
      ref={ref}
      className={clsx(
        'p-2 rounded-md hover:bg-[var(--color-bg-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        className
      )}
      {...props}
    />
  )
);
IconButton.displayName = 'IconButton';
