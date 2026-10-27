import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api, API_BASE } from '../../lib/api';

interface GoogleLoginButtonProps {
  className?: string;
  label?: string;
}

type WakeupStatus = 'idle' | 'connecting' | 'waking' | 'ready' | 'error';

export const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = ({
  className = '',
  label = 'Continue with Google',
}) => {
  const [isWakingUp, setIsWakingUp] = useState(false);
  const [status, setStatus] = useState<WakeupStatus>('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  const abortControllerRef = useRef<AbortController | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isExecutingRef = useRef(false);

  // Clean up timer and abort controller on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  // Listen for Escape key to close modal if in error or waiting state
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isWakingUp && status !== 'ready') {
        handleCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isWakingUp, status]);

  const handleCancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    isExecutingRef.current = false;
    setIsWakingUp(false);
    setStatus('idle');
    setElapsedSeconds(0);
    setErrorMessage('');
  }, []);

  const startWakeupFlow = useCallback(async () => {
    // Prevent duplicate clicks & parallel execution
    if (isExecutingRef.current) return;
    isExecutingRef.current = true;

    // Reset previous states
    if (timerRef.current) clearInterval(timerRef.current);
    if (abortControllerRef.current) abortControllerRef.current.abort();

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsWakingUp(true);
    setStatus('connecting');
    setElapsedSeconds(0);
    setErrorMessage('');

    const startTime = Date.now();
    timerRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    const maxWaitSeconds = 90; // Render cold starts take ~30-60s
    let backendReady = false;

    try {
      while (!backendReady && !controller.signal.aborted) {
        const currentElapsed = Math.floor((Date.now() - startTime) / 1000);
        if (currentElapsed >= maxWaitSeconds) {
          throw new Error('TIMEOUT');
        }

        if (currentElapsed >= 6 && status !== 'waking') {
          setStatus('waking');
        }

        // Send a lightweight health check ping to wake up the Render instance
        try {
          const isHealthy = await api.checkHealth(controller.signal);
          if (isHealthy) {
            backendReady = true;
            break;
          }
        } catch (err: unknown) {
          // If aborted by user, exit cleanly
          if (err instanceof Error && err.name === 'AbortError') {
            return;
          }
          // Network errors during container spin-up are expected; loop will retry
        }

        // Wait 2.5 seconds between pings if not yet awake
        await new Promise((resolve) => {
          const timeout = setTimeout(resolve, 2500);
          controller.signal.addEventListener(
            'abort',
            () => {
              clearTimeout(timeout);
              resolve(null);
            },
            { once: true }
          );
        });
      }

      if (backendReady && !controller.signal.aborted) {
        setStatus('ready');
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        // Short visual feedback confirmation, then redirect to Google OAuth
        setTimeout(() => {
          if (!controller.signal.aborted) {
            // Preserve exact existing Google OAuth route and query parameters
            const query = window.location.search || '';
            const targetOAuthUrl = `${API_BASE}/auth/google${query}`;
            window.location.href = targetOAuthUrl;
          }
        }, 400);
      }
    } catch (err: unknown) {
      if (controller.signal.aborted) return;

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      isExecutingRef.current = false;
      setStatus('error');
      setErrorMessage(
        err instanceof Error && err.message === 'TIMEOUT'
          ? 'The backend server took longer than 90 seconds to wake up. Please retry or try again shortly.'
          : 'Unable to establish a secure connection to the backend. Please check your internet connection and try again.'
      );
    }
  }, [status]);

  // Dynamic text based on current phase and elapsed time
  const getStatusContent = () => {
    if (status === 'ready') {
      return {
        title: 'Backend is Ready!',
        desc: 'Connecting you to Google secure sign-in...',
      };
    }

    if (status === 'error') {
      return {
        title: 'Connection Timed Out',
        desc: errorMessage || 'Failed to reach the authentication service. Please try again.',
      };
    }

    if (elapsedSeconds < 6) {
      return {
        title: 'Connecting Securely',
        desc: 'Checking server status and preparing Google sign-in...',
      };
    }

    if (elapsedSeconds < 25) {
      return {
        title: 'Waking Up Cloud Server',
        desc: 'Render free tier instances spin down during periods of inactivity and take 30–60 seconds to boot. Please keep this tab open.',
      };
    }

    return {
      title: 'Still Initializing Backend',
      desc: 'The server is finalizing startup and database connections. You will be redirected the moment it is ready.',
    };
  };

  const { title, desc } = getStatusContent();

  return (
    <>
      <button
        type="button"
        id="google-login-button"
        className={`mk-btn mk-btn-google mk-btn-block ${isWakingUp ? 'loading' : ''} ${className}`.trim()}
        onClick={startWakeupFlow}
        disabled={isWakingUp}
        aria-busy={isWakingUp}
        aria-label={isWakingUp ? 'Connecting to Google...' : label}
      >
        {isWakingUp ? (
          <>
            <span className="mk-btn-spinner" aria-hidden="true"></span>
            <span>Connecting...</span>
          </>
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 01-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z"
              />
              <path
                fill="#34A853"
                d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.97v2.33A9 9 0 009 18z"
              />
              <path
                fill="#FBBC05"
                d="M3.95 10.7A5.4 5.4 0 013.68 9c0-.59.1-1.17.27-1.7V4.97H.97A9 9 0 000 9c0 1.45.35 2.83.97 4.03l2.98-2.33z"
              />
              <path
                fill="#EA4335"
                d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 00.97 4.97l2.98 2.33C4.66 5.17 6.65 3.58 9 3.58z"
              />
            </svg>
            <span>{label}</span>
          </>
        )}
      </button>

      {/* Branded Loading Modal */}
      {isWakingUp && (
        <div
          className="oauth-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="oauth-modal-title"
          aria-describedby="oauth-modal-desc"
        >
          <div className="oauth-modal-card">
            {/* Close / Dismiss button */}
            {status !== 'ready' && (
              <button
                type="button"
                className="oauth-modal-close"
                onClick={handleCancel}
                aria-label="Cancel and close"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}

            {/* Glowing Brand Mark */}
            <div className="oauth-brand-wrapper">
              <div
                className={`oauth-brand-aura ${
                  status === 'ready'
                    ? 'aura-ready'
                    : status === 'error'
                    ? 'aura-error'
                    : 'aura-pulse'
                }`}
              ></div>
              <div className="oauth-brand-badge">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2L21 7V17L12 22L3 17V7L12 2Z"
                    stroke="url(#g-oauth-badge)"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                  <defs>
                    <linearGradient id="g-oauth-badge" x1="3" y1="2" x2="21" y2="22">
                      <stop stopColor="#8B7CFF" />
                      <stop offset="1" stopColor="#5FA8FF" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>

            {/* Status indicator icon or spinner */}
            {status === 'ready' ? (
              <div className="oauth-status-icon ready" aria-hidden="true">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#5FE0A8"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            ) : status === 'error' ? (
              <div className="oauth-status-icon error" aria-hidden="true">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#ff8080"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
            ) : (
              <div className="oauth-spinner-container" aria-hidden="true">
                <div className="oauth-ring-loader"></div>
                <div className="oauth-inner-loader"></div>
              </div>
            )}

            {/* Status Text Block (Polite live region for accessibility) */}
            <div aria-live="polite" className="oauth-text-block">
              <h2 id="oauth-modal-title" className="oauth-modal-title">
                {title}
              </h2>
              <p id="oauth-modal-desc" className="oauth-modal-desc">
                {desc}
              </p>
            </div>

            {/* Subtle Elapsed Time Pill */}
            {status !== 'error' && status !== 'ready' && elapsedSeconds >= 3 && (
              <div className="oauth-elapsed-badge">
                <span className="oauth-elapsed-dot"></span>
                <span>
                  {elapsedSeconds < 10
                    ? `Connecting (${elapsedSeconds}s)`
                    : elapsedSeconds < 25
                    ? `Waking instance (${elapsedSeconds}s)`
                    : `Cold start in progress (${elapsedSeconds}s)`}
                </span>
              </div>
            )}

            {/* Error Actions */}
            {status === 'error' && (
              <div className="oauth-actions">
                <button
                  type="button"
                  className="mk-btn mk-btn-primary mk-btn-block"
                  onClick={startWakeupFlow}
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="23 4 23 10 17 10" />
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                  </svg>
                  Retry Connection
                </button>
                <button
                  type="button"
                  className="mk-btn mk-btn-ghost mk-btn-block"
                  onClick={handleCancel}
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Security Handshake Footer */}
            <div className="oauth-modal-footer">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>Verified AgentFlow SSL Handshake</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
