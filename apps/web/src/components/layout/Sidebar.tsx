import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, History, ShieldAlert, CreditCard, Box } from 'lucide-react';
import clsx from 'clsx';
import { Badge } from '../ui/Primitives';

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'New Research', path: '/research/new', icon: PlusCircle },
  { name: 'History', path: '/history', icon: History },
  { name: 'Approvals', path: '/approvals', icon: ShieldAlert },
  { name: 'Payments', path: '/payments', icon: CreditCard },
];

export const Sidebar = () => {
  return (
    <aside className="w-64 flex flex-col bg-[var(--color-bg-surface)] border-r border-[var(--color-border-subtle)] h-full overflow-y-auto">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 rounded-md bg-gradient-to-br from-[var(--color-accent-primary)] to-[var(--color-text-secondary)] flex items-center justify-center text-white">
          <Box size={18} />
        </div>
        <span className="font-semibold text-lg text-[var(--color-text-primary)] tracking-tight">AgentFlow</span>
      </div>

      <nav aria-label="Main navigation" className="flex-1 px-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2 rounded-md font-medium text-sm transition-colors',
                isActive
                  ? 'bg-[var(--color-bg-surface-hover)] text-[var(--color-text-primary)]'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-surface-hover)] hover:text-[var(--color-text-primary)]'
              )
            }
          >
            <item.icon size={18} aria-hidden="true" />
            {item.name}
          </NavLink>
        ))}
      </nav>

      <div className="p-6">
        <div className="bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] rounded-lg p-4 flex flex-col gap-2">
          <span className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Environment</span>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Algorand</span>
            <Badge variant="warning">TestNet</Badge>
          </div>
        </div>
      </div>
    </aside>
  );
};
