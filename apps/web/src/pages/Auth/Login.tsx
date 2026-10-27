import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../lib/api';
import { GoogleLoginButton } from '../../components/auth/GoogleLoginButton';
import '../../marketing.css';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to sign in');
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
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 2L21 7V17L12 22L3 17V7L12 2Z" stroke="url(#g3)" strokeWidth="1.6" strokeLinejoin="round"/><defs><linearGradient id="g3" x1="3" y1="2" x2="21" y2="22"><stop stopColor="#8B7CFF"/><stop offset="1" stopColor="#5FA8FF"/></linearGradient></defs></svg>
          </span>
          <span className="mk-brand-name">AgentFlow</span>
        </Link>

        <div className="mk-auth-card">
          <h1>Welcome back to AgentFlow</h1>
          <p className="mk-auth-sub">Continue your research with your AI agent.</p>

          <form onSubmit={handleSubmit} noValidate>
            <div className="mk-field">
              <label htmlFor="si-email">Email</label>
              <input 
                type="email" 
                id="si-email" 
                placeholder="you@company.com" 
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div className="mk-field">
              <label htmlFor="si-password">Password</label>
              <input 
                type="password" 
                id="si-password" 
                placeholder="••••••••" 
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
            <div className="mk-field-row">
              <label className="mk-checkbox">
                <input type="checkbox" id="si-remember" />
                <span>Remember me</span>
              </label>
            </div>

            {error && (
              <div className="mk-form-alert">
                {error}
              </div>
            )}

            <button type="submit" className="mk-btn mk-btn-primary mk-btn-block mk-btn-lg" disabled={loading}>
              <span className="mk-btn-label">{loading ? 'Signing in...' : 'Sign In'}</span>
              {loading && <span className="mk-btn-spinner"></span>}
            </button>
          </form>

          <div className="mk-divider"><span>OR</span></div>

          <GoogleLoginButton />

          <p className="mk-auth-bottom">Don't have an account? <Link to="/signup">Sign up</Link></p>
        </div>
      </main>
    </div>
  );
};
