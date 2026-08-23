import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Plus, History, ShieldAlert, CreditCard } from 'lucide-react';

const PRIMARY = [
  { name: 'Dashboard',    path: '/dashboard',             icon: LayoutDashboard, end: true },
  { name: 'New Research', path: '/research/new', icon: Plus,            end: false },
];

const SECONDARY = [
  { name: 'History',   path: '/history',   icon: History },
  { name: 'Approvals', path: '/approvals', icon: ShieldAlert },
  { name: 'Payments',  path: '/payments',  icon: CreditCard },
];

export const Sidebar = () => {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M4 18 L12 5 L20 18" stroke="#1a1408" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="brand-name">AgentFlow</div>
      </div>
      
      <div className="nav-group">
        {PRIMARY.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <item.icon />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </div>

      <div className="nav-group">
        <div className="nav-label">Records</div>
        {SECONDARY.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-item secondary ${isActive ? 'active' : ''}`}
          >
            <item.icon />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </div>

      <div className="sidebar-spacer"></div>



      <div className="env-badge">
        <span className="env-dot"></span>
        <div>
          <span className="env-label">Environment</span>
          <span className="env-value">Algorand TestNet</span>
        </div>
      </div>
    </aside>
  );
};
