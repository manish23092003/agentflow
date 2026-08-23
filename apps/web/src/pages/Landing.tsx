import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../marketing.css';

export const Landing: React.FC = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMenu = () => setMobileMenuOpen(!mobileMenuOpen);

  return (
    <div className="marketing-page">
      <div className="bg-glow bg-glow-1"></div>
      <div className="bg-glow bg-glow-2"></div>

      <nav className="mk-navbar" id="navbar">
        <a href="#" className="mk-brand" onClick={(e) => { e.preventDefault(); navigate('/'); }}>
          <span className="mk-brand-mark">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 2L21 7V17L12 22L3 17V7L12 2Z" stroke="url(#g1)" strokeWidth="1.6" strokeLinejoin="round"/><path d="M12 2V22M3 7L12 12L21 7M3 17L12 12" stroke="url(#g1)" strokeWidth="1.2" strokeLinejoin="round" opacity="0.6"/><defs><linearGradient id="g1" x1="3" y1="2" x2="21" y2="22"><stop stopColor="#8B7CFF"/><stop offset="1" stopColor="#5FA8FF"/></linearGradient></defs></svg>
          </span>
          <span className="mk-brand-name">AgentFlow</span>
        </a>

        <div className="mk-nav-links" id="navLinks">
          <a href="#how-it-works">How It Works</a>
          <a href="#features">Features</a>
          <a href="#payments">Payments</a>
          <a href="#why">Why AgentFlow</a>
        </div>

        <div className="mk-nav-actions">
          <a href="#" className="mk-btn mk-btn-ghost" onClick={(e) => { e.preventDefault(); navigate('/login'); }}>Sign In</a>
          <a href="#" className="mk-btn mk-btn-primary mk-btn-sm" onClick={(e) => { e.preventDefault(); navigate('/signup'); }}>Get Started</a>
        </div>

        <button className="mk-hamburger" id="hamburger" aria-label="Menu" onClick={toggleMenu}>
          <span></span><span></span><span></span>
        </button>
      </nav>

      <div className={`mk-mobile-menu ${mobileMenuOpen ? 'open' : ''}`} id="mobileMenu">
        <a href="#how-it-works" onClick={toggleMenu}>How It Works</a>
        <a href="#features" onClick={toggleMenu}>Features</a>
        <a href="#payments" onClick={toggleMenu}>Payments</a>
        <a href="#why" onClick={toggleMenu}>Why AgentFlow</a>
        <div className="mk-mobile-menu-actions">
          <a href="#" className="mk-btn mk-btn-ghost" onClick={(e) => { e.preventDefault(); navigate('/login'); }}>Sign In</a>
          <a href="#" className="mk-btn mk-btn-primary" onClick={(e) => { e.preventDefault(); navigate('/signup'); }}>Get Started</a>
        </div>
      </div>

      <main id="page-landing">
        <section className="mk-hero">
          <div className="mk-hero-inner">
            <div className="mk-hero-copy">
              <div className="mk-badge">
                <span className="mk-badge-dot"></span>
                AI Research × Autonomous Payments
              </div>
              <h1>Your AI Agent for<br/>Research and <span className="mk-grad-text">Autonomous Payments.</span></h1>
              <p className="mk-hero-sub">AgentFlow researches the web, discovers valuable resources, evaluates paid content, and securely pays for access when you approve.</p>
              <div className="mk-hero-actions">
                <a href="#" className="mk-btn mk-btn-primary mk-btn-lg" onClick={(e) => { e.preventDefault(); navigate('/signup'); }}>Start Researching</a>
                <a href="#how-it-works" className="mk-btn mk-btn-outline mk-btn-lg">See How It Works</a>
              </div>
            </div>

            <div className="mk-hero-visual">
              <div className="mk-flow-card">
                <div className="mk-flow-step" style={{ animationDelay: '0s' }}>
                  <div className="mk-flow-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 3V21M3 12H21" stroke="#8B7CFF" strokeWidth="2" strokeLinecap="round"/></svg>
                  </div>
                  <span>Ask</span>
                </div>
                <div className="mk-flow-line" style={{ animationDelay: '0.15s' }}></div>

                <div className="mk-flow-step" style={{ animationDelay: '0.3s' }}>
                  <div className="mk-flow-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="#8B7CFF" strokeWidth="2"/><path d="M21 21L16.65 16.65" stroke="#8B7CFF" strokeWidth="2" strokeLinecap="round"/></svg>
                  </div>
                  <span>Research</span>
                </div>
                <div className="mk-flow-line" style={{ animationDelay: '0.45s' }}></div>

                <div className="mk-flow-step" style={{ animationDelay: '0.6s' }}>
                  <div className="mk-flow-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 12L9 18L21 6" stroke="#5FA8FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <span>Analyze</span>
                </div>
                <div className="mk-flow-line" style={{ animationDelay: '0.75s' }}></div>

                <div className="mk-flow-step highlight" style={{ animationDelay: '0.9s' }}>
                  <div className="mk-flow-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="10" rx="2" stroke="#FFB84D" strokeWidth="2"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="#FFB84D" strokeWidth="2"/></svg>
                  </div>
                  <span>Payment Required</span>
                </div>
                <div className="mk-flow-line" style={{ animationDelay: '1.05s' }}></div>

                <div className="mk-flow-step" style={{ animationDelay: '1.2s' }}>
                  <div className="mk-flow-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9 12L11 14L15 10" stroke="#5FE0A8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="9" stroke="#5FE0A8" strokeWidth="2"/></svg>
                  </div>
                  <span>Approve</span>
                </div>
                <div className="mk-flow-line" style={{ animationDelay: '1.35s' }}></div>

                <div className="mk-flow-step" style={{ animationDelay: '1.5s' }}>
                  <div className="mk-flow-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2L21 7V17L12 22L3 17V7L12 2Z" stroke="#8B7CFF" strokeWidth="1.6"/></svg>
                  </div>
                  <span>x402 Payment</span>
                </div>
                <div className="mk-flow-line" style={{ animationDelay: '1.65s' }}></div>

                <div className="mk-flow-step final" style={{ animationDelay: '1.8s' }}>
                  <div className="mk-flow-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 3L14.5 9.5L21 12L14.5 14.5L12 21L9.5 14.5L3 12L9.5 9.5L12 3Z" stroke="#5FA8FF" strokeWidth="1.6" strokeLinejoin="round"/></svg>
                  </div>
                  <span>Discover</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mk-tech-strip">
          <div className="mk-tech-strip-inner">
            <span className="mk-tech-label">Built with</span>
            <div className="mk-tech-items">
              <span>AI Agents</span>
              <span className="dot">•</span>
              <span>x402</span>
              <span className="dot">•</span>
              <span>Algorand</span>
              <span className="dot">•</span>
              <span>Secure Payments</span>
            </div>
          </div>
        </section>

        <section className="mk-section" id="how-it-works">
          <div className="mk-section-head">
            <span className="mk-eyebrow">How It Works</span>
            <h2>From Question to Answer — Automatically</h2>
          </div>
          <div className="mk-steps-grid">
            <div className="mk-step-card">
              <span className="mk-step-num">01</span>
              <h3>Ask</h3>
              <p>The user gives AgentFlow a research question or topic.</p>
            </div>
            <div className="mk-step-connector"></div>
            <div className="mk-step-card">
              <span className="mk-step-num">02</span>
              <h3>Research</h3>
              <p>The AI agent searches available resources and evaluates their relevance.</p>
            </div>
            <div className="mk-step-connector"></div>
            <div className="mk-step-card">
              <span className="mk-step-num">03</span>
              <h3>Approve & Pay</h3>
              <p>If a valuable resource requires payment, AgentFlow shows the price and asks the user for approval.</p>
            </div>
            <div className="mk-step-connector"></div>
            <div className="mk-step-card">
              <span className="mk-step-num">04</span>
              <h3>Discover</h3>
              <p>After the x402 payment succeeds, AgentFlow accesses the resource and uses the information in the final research.</p>
            </div>
          </div>
        </section>

        <section className="mk-section" id="features">
          <div className="mk-section-head">
            <span className="mk-eyebrow">Features</span>
            <h2>Built for Agentic Research</h2>
          </div>
          <div className="mk-feature-grid">
            <div className="mk-feature-card">
              <div className="mk-feature-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2a5 5 0 015 5c0 2-1 3-1 5v2a4 4 0 01-8 0v-2c0-2-1-3-1-5a5 5 0 015-5z" stroke="#8B7CFF" strokeWidth="1.6"/><path d="M9 21h6" stroke="#8B7CFF" strokeWidth="1.6" strokeLinecap="round"/></svg></div>
              <h3>Autonomous Research</h3>
              <p>Let AI agents search and evaluate information automatically.</p>
            </div>
            <div className="mk-feature-card">
              <div className="mk-feature-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="#5FA8FF" strokeWidth="1.6"/><path d="M21 21L16.65 16.65" stroke="#5FA8FF" strokeWidth="1.6" strokeLinecap="round"/></svg></div>
              <h3>Smart Resource Discovery</h3>
              <p>Find valuable resources instead of simply returning search results.</p>
            </div>
            <div className="mk-feature-card">
              <div className="mk-feature-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M9 12L11 14L15 10" stroke="#5FE0A8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="9" stroke="#5FE0A8" strokeWidth="1.6"/></svg></div>
              <h3>Human-in-the-Loop Payments</h3>
              <p>The AI can request payment, while the user remains in control.</p>
            </div>
            <div className="mk-feature-card">
              <div className="mk-feature-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2L21 7V17L12 22L3 17V7L12 2Z" stroke="#FFB84D" strokeWidth="1.6"/></svg></div>
              <h3>x402 Payments</h3>
              <p>Enable machine-to-machine payments for paid digital resources.</p>
            </div>
            <div className="mk-feature-card">
              <div className="mk-feature-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M13 2L4 14H12L11 22L20 10H12L13 2Z" stroke="#8B7CFF" strokeWidth="1.6" strokeLinejoin="round"/></svg></div>
              <h3>Algorand Settlement</h3>
              <p>Fast and efficient blockchain settlement.</p>
            </div>
            <div className="mk-feature-card">
              <div className="mk-feature-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" stroke="#5FA8FF" strokeWidth="1.6"/><circle cx="12" cy="12" r="3" stroke="#5FA8FF" strokeWidth="1.6"/></svg></div>
              <h3>Transparent Spending</h3>
              <p>Users can see what the agent wants to purchase, why it needs it, and how much it costs.</p>
            </div>
          </div>
        </section>

        <section className="mk-section" id="payments">
          <div className="mk-section-head">
            <span className="mk-eyebrow">Payments</span>
            <h2>When AI Needs to Pay,<br/>AgentFlow Handles the Flow.</h2>
          </div>

          <div className="mk-payment-layout">
            <div className="mk-payment-flow">
              <div className="mk-pflow-item"><span className="mk-pflow-tag">AI Agent</span></div>
              <div className="mk-pflow-arrow">→</div>
              <div className="mk-pflow-item"><span className="mk-pflow-tag">Paid Resource</span></div>
              <div className="mk-pflow-arrow">→</div>
              <div className="mk-pflow-item"><span className="mk-pflow-tag">HTTP 402</span></div>
              <div className="mk-pflow-arrow">→</div>
              <div className="mk-pflow-item"><span className="mk-pflow-tag">Payment Request</span></div>
              <div className="mk-pflow-arrow">→</div>
              <div className="mk-pflow-item"><span className="mk-pflow-tag">User Approval</span></div>
              <div className="mk-pflow-arrow">→</div>
              <div className="mk-pflow-item"><span className="mk-pflow-tag">x402 Payment</span></div>
              <div className="mk-pflow-arrow">→</div>
              <div className="mk-pflow-item"><span className="mk-pflow-tag">Algorand</span></div>
              <div className="mk-pflow-arrow">→</div>
              <div className="mk-pflow-item"><span className="mk-pflow-tag">Resource Access</span></div>
            </div>

            <div className="mk-approval-card">
              <div className="mk-approval-card-head">
                <div className="mk-approval-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="10" rx="2" stroke="#FFB84D" strokeWidth="1.8"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="#FFB84D" strokeWidth="1.8"/></svg>
                </div>
                <div>
                  <h4>Premium Research Report</h4>
                  <span className="mk-approval-sub">AI Agent found a paid resource</span>
                </div>
              </div>
              <div className="mk-approval-body">
                <div className="mk-approval-row">
                  <span className="mk-approval-label">Resource</span>
                  <span className="mk-approval-value">AI Payments Market Report 2026</span>
                </div>
                <div className="mk-approval-row">
                  <span className="mk-approval-label">Price</span>
                  <span className="mk-approval-value price">1.00 USDC</span>
                </div>
                <div className="mk-approval-row reason">
                  <span className="mk-approval-label">Reason</span>
                  <span className="mk-approval-value">This report contains data relevant to your research question.</span>
                </div>
              </div>
              <div className="mk-approval-actions">
                <button className="mk-btn mk-btn-primary mk-btn-block" type="button">Approve Payment</button>
                <button className="mk-btn mk-btn-outline mk-btn-block" type="button">Reject</button>
              </div>
              <span className="mk-approval-note">Marketing visualization — not a live transaction</span>
            </div>
          </div>
        </section>

        <section className="mk-section" id="why">
          <div className="mk-section-head">
            <span className="mk-eyebrow">Why AgentFlow</span>
            <h2>AI Shouldn't Stop at a Paywall.</h2>
            <p className="mk-section-desc">Traditional AI agents can discover information but often stop when useful information requires payment. AgentFlow connects research, decision making, user approval, and autonomous payments into one continuous workflow.</p>
          </div>

          <div className="mk-compare-grid">
            <div className="mk-compare-card">
              <span className="mk-compare-tag muted">Traditional AI</span>
              <ul className="mk-compare-list">
                <li><span className="mk-ico x">✕</span>Finds free information</li>
                <li><span className="mk-ico x">✕</span>Stops at paid resources</li>
                <li><span className="mk-ico x">✕</span>Requires manual purchasing</li>
                <li><span className="mk-ico x">✕</span>Breaks the workflow</li>
              </ul>
            </div>
            <div className="mk-compare-card highlighted">
              <span className="mk-compare-tag">AgentFlow</span>
              <ul className="mk-compare-list">
                <li><span className="mk-ico check">✓</span>Finds relevant resources</li>
                <li><span className="mk-ico check">✓</span>Detects paid resources</li>
                <li><span className="mk-ico check">✓</span>Requests approval</li>
                <li><span className="mk-ico check">✓</span>Pays through x402</li>
                <li><span className="mk-ico check">✓</span>Continues the research</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="mk-section" id="security">
          <div className="mk-section-head">
            <span className="mk-eyebrow">Security & Control</span>
            <h2>Autonomous Doesn't Mean Uncontrolled.</h2>
            <p className="mk-section-desc">AgentFlow keeps you in the loop for every purchase decision the agent makes.</p>
          </div>
          <div className="mk-security-grid">
            <div className="mk-security-card">
              <div className="mk-feature-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M9 12L11 14L15 10" stroke="#5FE0A8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="9" stroke="#5FE0A8" strokeWidth="1.6"/></svg></div>
              <h3>User Approval</h3>
              <p>Every payment requires your explicit confirmation before it executes.</p>
            </div>
            <div className="mk-security-card">
              <div className="mk-feature-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 12h16M4 6h16M4 18h10" stroke="#5FA8FF" strokeWidth="1.6" strokeLinecap="round"/></svg></div>
              <h3>Spending Limits</h3>
              <p>Set thresholds so the agent never exceeds what you're comfortable with.</p>
            </div>
            <div className="mk-security-card">
              <div className="mk-feature-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" stroke="#8B7CFF" strokeWidth="1.6"/><circle cx="12" cy="12" r="3" stroke="#8B7CFF" strokeWidth="1.6"/></svg></div>
              <h3>Payment Transparency</h3>
              <p>See exactly what's being purchased and why, before it happens.</p>
            </div>
            <div className="mk-security-card">
              <div className="mk-feature-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="16" rx="2" stroke="#FFB84D" strokeWidth="1.6"/><path d="M3 10h18" stroke="#FFB84D" strokeWidth="1.6"/></svg></div>
              <h3>Transaction History</h3>
              <p>A complete, auditable record of every payment made on your behalf.</p>
            </div>
            <div className="mk-security-card">
              <div className="mk-feature-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2L21 7V17L12 22L3 17V7L12 2Z" stroke="#5FA8FF" strokeWidth="1.6"/></svg></div>
              <h3>Wallet-Based Identity</h3>
              <p>Your Algorand wallet secures identity and authorization end-to-end.</p>
            </div>
          </div>
        </section>

        <section className="mk-final-cta">
          <div className="mk-final-cta-inner">
            <h2>Give Your AI Agent the Ability to Pay.</h2>
            <p>Research beyond paywalls while keeping every payment transparent and under your control.</p>
            <div className="mk-hero-actions center">
              <a href="#" className="mk-btn mk-btn-primary mk-btn-lg" onClick={(e) => { e.preventDefault(); navigate('/signup'); }}>Get Started</a>
              <a href="#" className="mk-btn mk-btn-outline mk-btn-lg" onClick={(e) => { e.preventDefault(); navigate('/login'); }}>Sign In</a>
            </div>
          </div>
        </section>

        <footer className="mk-footer">
          <div className="mk-footer-inner">
            <div className="mk-footer-top">
              <a href="#" className="mk-brand" onClick={(e) => { e.preventDefault(); window.scrollTo(0, 0); }}>
                <span className="mk-brand-mark">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2L21 7V17L12 22L3 17V7L12 2Z" stroke="url(#g2)" strokeWidth="1.6" strokeLinejoin="round"/><defs><linearGradient id="g2" x1="3" y1="2" x2="21" y2="22"><stop stopColor="#8B7CFF"/><stop offset="1" stopColor="#5FA8FF"/></linearGradient></defs></svg>
                </span>
                <span className="mk-brand-name">AgentFlow</span>
              </a>
              <div className="mk-footer-links">
                <a href="#">Product</a>
                <a href="#how-it-works">How It Works</a>
                <a href="#features">Features</a>
                <a href="#">Documentation</a>
                <a href="#">GitHub</a>
              </div>
            </div>
            <div className="mk-footer-bottom">
              <span>Built for the x402 ecosystem on Algorand.</span>
              <span>© 2026 AgentFlow</span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
};
