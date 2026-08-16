import { useState, useEffect, useCallback } from "react";
import "./App.css";

interface HealthData {
  status: string;
  version: string;
  uptime: number;
  timestamp: string;
  environment: string;
}

interface HealthApiResponse {
  success: boolean;
  data?: HealthData;
  requestId?: string;
}

const ARCHITECTURE_LAYERS = [
  { label: "User Task", icon: "📋" },
  { label: "LLM Research", icon: "🧠" },
  { label: "Procurement", icon: "🔍" },
  { label: "Policy Engine", icon: "🛡️" },
  { label: "Human Approval", icon: "👤" },
  { label: "x402 Payment", icon: "💳" },
  { label: "Algorand", icon: "⛓️" },
  { label: "Result", icon: "✅" },
];

const PHASES = [
  { name: "Foundation", status: "complete" as const },
  { name: "AI Agent Core", status: "planned" as const },
  { name: "Service Discovery", status: "planned" as const },
  { name: "Policy Engine", status: "planned" as const },
  { name: "x402 + Algorand", status: "planned" as const },
  { name: "Production", status: "planned" as const },
];

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function App() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/health");
      const data = (await res.json()) as HealthApiResponse;
      if (data.success && data.data) {
        setHealth(data.data);
        setHealthError(null);
      } else {
        setHealthError("Unexpected response format");
      }
    } catch {
      setHealthError("API unavailable");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  return (
    <div className="app">
      <header className="header" id="header">
        <div className="header-brand">
          <div className="logo">◆</div>
          <h1 className="header-title">AgentFlow</h1>
        </div>
        <div className="header-badge">Phase 1 — Foundation</div>
      </header>

      <main className="main">
        <section className="hero" id="hero">
          <h2 className="hero-title">
            Autonomous Procurement Layer
            <br />
            <span className="hero-accent">for AI Agents</span>
          </h2>
          <p className="hero-subtitle">
            Task-aware service discovery, evaluation, and micropayment via x402
            on Algorand. AI agents research freely, then procure paid resources
            through deterministic policy enforcement and transparent human
            oversight.
          </p>
        </section>

        <div className="grid-2col">
          <section className="card" id="system-status">
            <div className="card-header">
              <h3>System Status</h3>
              {loading ? (
                <span className="badge badge-loading">checking…</span>
              ) : health ? (
                <span className="badge badge-online">
                  <span className="pulse" />
                  {health.status}
                </span>
              ) : (
                <span className="badge badge-offline">offline</span>
              )}
            </div>
            <div className="card-body">
              {health ? (
                <div className="status-grid">
                  <div className="status-row">
                    <span className="status-label">Version</span>
                    <span className="status-value mono">{health.version}</span>
                  </div>
                  <div className="status-row">
                    <span className="status-label">Uptime</span>
                    <span className="status-value mono">
                      {formatUptime(health.uptime)}
                    </span>
                  </div>
                  <div className="status-row">
                    <span className="status-label">Environment</span>
                    <span className="status-value mono">
                      {health.environment}
                    </span>
                  </div>
                  <div className="status-row">
                    <span className="status-label">Last Check</span>
                    <span className="status-value mono">
                      {new Date(health.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="status-error">
                  <p className="error-message">{healthError}</p>
                  <p className="error-hint">
                    Start the API server with <code>npm run dev</code>
                  </p>
                </div>
              )}
            </div>
          </section>

          <section className="card" id="architecture">
            <div className="card-header">
              <h3>Architecture Flow</h3>
            </div>
            <div className="card-body">
              <div className="flow">
                {ARCHITECTURE_LAYERS.map((layer, i) => (
                  <div key={layer.label} className="flow-step">
                    <div className="flow-node">
                      <span className="flow-icon">{layer.icon}</span>
                      <span className="flow-label">{layer.label}</span>
                    </div>
                    {i < ARCHITECTURE_LAYERS.length - 1 && (
                      <div className="flow-connector">
                        <svg width="12" height="16" viewBox="0 0 12 16">
                          <path
                            d="M6 0 L6 12 L2 8 M6 12 L10 8"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        <section className="card" id="roadmap">
          <div className="card-header">
            <h3>Development Roadmap</h3>
          </div>
          <div className="card-body">
            <div className="phases">
              {PHASES.map((phase, i) => (
                <div
                  key={phase.name}
                  className={`phase phase-${phase.status}`}
                >
                  <div className="phase-marker">
                    {phase.status === "complete" ? "✓" : i + 1}
                  </div>
                  <div className="phase-info">
                    <span className="phase-name">{phase.name}</span>
                    <span className="phase-status-label">
                      {phase.status === "complete" ? "Complete" : "Planned"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="card" id="security">
          <div className="card-header">
            <h3>Security Architecture</h3>
          </div>
          <div className="card-body">
            <div className="rules">
              <div className="rule">
                <span className="rule-icon">🔒</span>
                <div className="rule-content">
                  <strong>LLM cannot authorize payments</strong>
                  <p>
                    Only deterministic application logic controls payment
                    execution
                  </p>
                </div>
              </div>
              <div className="rule">
                <span className="rule-icon">🛡️</span>
                <div className="rule-content">
                  <strong>Policy engine enforces spending limits</strong>
                  <p>
                    User-defined rules determine auto-approve,
                    require-approval, or reject
                  </p>
                </div>
              </div>
              <div className="rule">
                <span className="rule-icon">⚠️</span>
                <div className="rule-content">
                  <strong>External content is untrusted</strong>
                  <p>
                    Web content, API responses, and tool outputs never directly
                    trigger payments
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <p>AgentFlow — x402 on Algorand — MIT License</p>
      </footer>
    </div>
  );
}

export default App;
