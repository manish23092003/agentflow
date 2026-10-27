import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api, API_BASE } from '../../lib/api';

interface GoogleLoginButtonProps {
  className?: string;
  label?: string;
}

type WakeupStatus = 'idle' | 'connecting' | 'ready' | 'error';

export const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = ({
  className = '',
  label = 'Continue with Google',
}) => {
  const [isWakingUp, setIsWakingUp] = useState(false);
  const [status, setStatus] = useState<WakeupStatus>('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

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

  // Escape key cancels and dismisses modal
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
  }, []);

  const startWakeupFlow = useCallback(async () => {
    // Prevent duplicate clicks & parallel execution
    if (isExecutingRef.current) return;
    isExecutingRef.current = true;

    if (timerRef.current) clearInterval(timerRef.current);
    if (abortControllerRef.current) abortControllerRef.current.abort();

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsWakingUp(true);
    setStatus('connecting');
    setElapsedSeconds(0);

    const startTime = Date.now();
    timerRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    const maxWaitSeconds = 90;
    let backendReady = false;

    try {
      while (!backendReady && !controller.signal.aborted) {
        const currentElapsed = Math.floor((Date.now() - startTime) / 1000);
        if (currentElapsed >= maxWaitSeconds) {
          throw new Error('TIMEOUT');
        }

        try {
          const isHealthy = await api.checkHealth(controller.signal);
          if (isHealthy) {
            backendReady = true;
            break;
          }
        } catch (err: unknown) {
          if (err instanceof Error && err.name === 'AbortError') {
            return;
          }
        }

        // Wait between pings if not yet awake
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

        // Redirect directly to existing Google OAuth route preserving query parameters
        setTimeout(() => {
          if (!controller.signal.aborted) {
            const query = window.location.search || '';
            const targetOAuthUrl = `${API_BASE}/auth/google${query}`;
            window.location.href = targetOAuthUrl;
          }
        }, 300);
      }
    } catch {
      if (controller.signal.aborted) return;

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      isExecutingRef.current = false;
      setStatus('error');
    }
  }, []);

  return (
    <>
      <button
        type="button"
        id="google-login-button"
        className={`mk-btn mk-btn-google mk-btn-block ${isWakingUp ? 'loading' : ''} ${className}`.trim()}
        onClick={startWakeupFlow}
        disabled={isWakingUp}
        aria-busy={isWakingUp}
        aria-label={isWakingUp ? 'Connecting...' : label}
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

      {/* Clean, understated SaaS loading modal */}
      {isWakingUp && (
        <div
          className="oauth-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="oauth-modal-title"
          aria-describedby="oauth-modal-desc"
        >
          <div className="oauth-modal-card">
            {status !== 'ready' && (
              <button
                type="button"
                className="oauth-modal-close"
                onClick={handleCancel}
                aria-label="Close dialog"
              >
                <svg
                  width="16"
                  height="16"
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

            {/* AgentFlow minimal mark */}
            <div className="oauth-brand-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2L21 7V17L12 22L3 17V7L12 2Z"
                  stroke="#4f46e5"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            {status === 'error' ? (
              <>
                <div className="oauth-text-block" aria-live="polite">
                  <h2 id="oauth-modal-title" className="oauth-modal-title">
                    We couldn't connect
                  </h2>
                  <p id="oauth-modal-desc" className="oauth-modal-desc">
                    Please check your connection and try again.
                  </p>
                </div>

                <div className="oauth-actions">
                  <button
                    type="button"
                    className="oauth-btn oauth-btn-primary"
                    onClick={startWakeupFlow}
                  >
                    Try again
                  </button>
                  <button
                    type="button"
                    className="oauth-btn oauth-btn-secondary"
                    onClick={handleCancel}
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="oauth-text-block" aria-live="polite">
                  <h2 id="oauth-modal-title" className="oauth-modal-title">
                    {status === 'ready' ? 'Redirecting to Google...' : 'Getting things ready'}
                  </h2>
                  <p id="oauth-modal-desc" className="oauth-modal-desc">
                    This may take a moment. Thanks for your patience.
                  </p>
                </div>

                <div className="oauth-status-row">
                  <span className="oauth-simple-spinner" aria-hidden="true" />
                  <span className="oauth-status-text">
                    Signing in securely with Google
                    {elapsedSeconds >= 4 && (
                      <span className="oauth-elapsed-text"> ({elapsedSeconds}s)</span>
                    )}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};
