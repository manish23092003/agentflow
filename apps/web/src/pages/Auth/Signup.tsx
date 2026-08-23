import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../lib/api';
import '../../marketing.css';

export const Signup: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const getStrength = (pw: string) => {
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  };

  const strengthScore = getStrength(password);
  const colors = ['#ff5a5a', '#FFB84D', '#5FA8FF', '#5FE0A8'];
  const labels = ['Weak', 'Fair', 'Good', 'Strong'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!termsAgreed) {
      setError('You must agree to the Terms of Service.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await signup(name, email, password);
      navigate('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="marketing-page">
      <main className="mk-auth-page">
        <div className="mk-auth-bg-glow"></div>
        <Link to="/" className="mk-auth-brand">
          <span className="mk-brand-mark">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 2L21 7V17L12 22L3 17V7L12 2Z" stroke="url(#g4)" strokeWidth="1.6" strokeLinejoin="round"/><defs><linearGradient id="g4" x1="3" y1="2" x2="21" y2="22"><stop stopColor="#8B7CFF"/><stop offset="1" stopColor="#5FA8FF"/></linearGradient></defs></svg>
          </span>
          <span className="mk-brand-name">AgentFlow</span>
        </Link>

        <div className="mk-auth-card">
          <h1>Create your AgentFlow account</h1>
          <p className="mk-auth-sub">Start building autonomous research workflows.</p>

          <form onSubmit={handleSubmit} noValidate>
            <div className="mk-field">
              <label htmlFor="su-name">Full Name</label>
              <input 
                type="text" 
                id="su-name" 
                placeholder="Jordan Avery" 
                autoComplete="name"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
            <div className="mk-field">
              <label htmlFor="su-email">Email</label>
              <input 
                type="email" 
                id="su-email" 
                placeholder="you@company.com" 
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div className="mk-field">
              <label htmlFor="su-password">Password</label>
              <input 
                type="password" 
                id="su-password" 
                placeholder="••••••••" 
                autoComplete="new-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <div className="mk-strength-meter">
                {[0, 1, 2, 3].map(i => (
                  <span key={i} style={{ background: (password && i < strengthScore) ? colors[strengthScore - 1] : 'rgba(255,255,255,0.08)' }}></span>
                ))}
              </div>
              <span className="mk-strength-label">{password ? labels[Math.max(strengthScore - 1, 0)] : ''}</span>
            </div>
            <div className="mk-field">
              <label htmlFor="su-confirm">Confirm Password</label>
              <input 
                type="password" 
                id="su-confirm" 
                placeholder="••••••••" 
                autoComplete="new-password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
              />
            </div>
            <label className="mk-checkbox terms">
              <input type="checkbox" id="su-terms" checked={termsAgreed} onChange={e => setTermsAgreed(e.target.checked)} />
              <span>I agree to the Terms of Service and Privacy Policy</span>
            </label>

            {error && (
              <div className="mk-form-alert" style={{ marginTop: '18px' }}>
                {error}
              </div>
            )}

            <button type="submit" className="mk-btn mk-btn-primary mk-btn-block mk-btn-lg" disabled={loading} style={{ marginTop: error ? 0 : '18px' }}>
              <span className="mk-btn-label">{loading ? 'Creating account...' : 'Create Account'}</span>
              {loading && <span className="mk-btn-spinner"></span>}
            </button>
          </form>

          <div className="mk-divider"><span>OR</span></div>

          <button type="button" className="mk-btn mk-btn-google mk-btn-block" onClick={() => window.location.href = `${API_BASE}/auth/google`}>
            <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 01-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z"/><path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.97v2.33A9 9 0 009 18z"/><path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 013.68 9c0-.59.1-1.17.27-1.7V4.97H.97A9 9 0 000 9c0 1.45.35 2.83.97 4.03l2.98-2.33z"/><path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 00.97 4.97l2.98 2.33C4.66 5.17 6.65 3.58 9 3.58z"/></svg>
            Continue with Google
          </button>

          <p className="mk-auth-bottom">Already have an account? <Link to="/login">Sign in</Link></p>
        </div>
      </main>
    </div>
  );
};
