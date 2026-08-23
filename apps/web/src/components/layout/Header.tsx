import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useWallet } from '../../context/WalletContext';
import { useAuth } from '../../context/AuthContext';
import { Wallet, ChevronDown, LogOut, Copy, Check, ExternalLink, Loader2, ShieldCheck } from 'lucide-react';

export const Header: React.FC = () => {
  const location = useLocation();
  const { isConnected, shortAddress, address, networkDisplay, formattedBalance, isConnecting, connect, disconnect } = useWallet();
  const { wallets } = useAuth();

  const [walletDropdownOpen, setWalletDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const walletDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (walletDropdownRef.current && !walletDropdownRef.current.contains(e.target as Node)) {
        setWalletDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Compute page context title for breadcrumb
  const getBreadcrumb = () => {
    const p = location.pathname;
    if (p === '/' || p === '/dashboard') return 'Dashboard';
    if (p === '/research/new') return 'New Research';
    if (p.startsWith('/research/')) return 'Workspace';
    if (p === '/history') return 'History';
    if (p === '/approvals') return 'Approvals';
    if (p === '/payments') return 'Payments';
    if (p.startsWith('/settings')) return 'Settings';
    return '';
  };
  const breadcrumb = getBreadcrumb();

  const isWalletLinked = !!(address && wallets.some(w => w.address === address));

  return (
    <header className="top-header" role="banner">
      <div className="header-breadcrumb">
        <NavLink to="/dashboard" className="header-brand-link">
          <span className="brand-dot" />
          AgentFlow
        </NavLink>
        {breadcrumb && (
          <>
            <span className="nav-divider">/</span>
            <span className="header-page-title">{breadcrumb}</span>
          </>
        )}
      </div>

      <div className="header-right-controls flex items-center gap-2.5">
        {/* 1. Pera Wallet Pill / Connect */}
        <div className="header-wallet-section" ref={walletDropdownRef}>
          {!isConnected ? (
            <button
              type="button"
              id="wallet-connect-btn"
              className="wallet-connect-btn"
              onClick={connect}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <Wallet size={13} />
                  <span>Connect Pera</span>
                </>
              )}
            </button>
          ) : (
            <div className="wallet-connected-wrapper relative">
              <button
                type="button"
                id="wallet-connected-pill"
                className="wallet-connected-pill"
                onClick={() => setWalletDropdownOpen(!walletDropdownOpen)}
                aria-expanded={walletDropdownOpen}
                aria-haspopup="true"
              >
                <span className="status-dot-green" />
                <span className="wallet-pill-net">TestNet</span>
                <span className="wallet-pill-dot">·</span>
                <span className="wallet-pill-address font-mono">{shortAddress}</span>
                <ChevronDown size={13} className={`chevron-icon ${walletDropdownOpen ? 'open' : ''}`} />
              </button>

              {walletDropdownOpen && (
                <div className="wallet-dropdown-menu" role="menu">
                  <div className="dropdown-header">
                    <div className="dropdown-network-row">
                      <span className="status-dot-green" />
                      <span className="dropdown-network-name">{networkDisplay}</span>
                      {isWalletLinked && (
                        <span className="ml-auto text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono flex items-center gap-1">
                          <ShieldCheck size={10} /> Verified
                        </span>
                      )}
                    </div>
                    <div className="dropdown-balance-row">
                      <span className="dropdown-balance-label">USDC Balance:</span>
                      <span className="dropdown-balance-val font-mono">{formattedBalance}</span>
                    </div>
                  </div>

                  <div className="dropdown-actions">
                    <button
                      type="button"
                      className="dropdown-action-btn"
                      onClick={handleCopyAddress}
                    >
                      {copied ? <Check size={13} className="text-green" /> : <Copy size={13} />}
                      {copied ? 'Address Copied!' : 'Copy Full Address'}
                    </button>

                    <a
                      href={`https://testnet.explorer.perawallet.app/accounts/${address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="dropdown-action-btn"
                    >
                      <ExternalLink size={13} />
                      View on Pera Explorer
                    </a>

                    <div className="dropdown-divider" />

                    <button
                      type="button"
                      id="wallet-disconnect-btn"
                      className="dropdown-action-btn disconnect"
                      onClick={() => {
                        disconnect();
                        setWalletDropdownOpen(false);
                      }}
                    >
                      <LogOut size={13} />
                      Disconnect
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

