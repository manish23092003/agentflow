import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { Wallet } from 'lucide-react';
import { useWallet } from '../context/WalletContext';

const EXAMPLE_PROMPTS = [
  'Research the impact of AI on hiring in the Indian IT industry in 2026',
  'Analyse the current state of electric vehicle adoption in Southeast Asia',
  'Summarise recent advances in quantum computing and enterprise applications',
];

export const NewResearch = () => {
  const navigate = useNavigate();
  const [goal, setGoal] = useState('');
  const [budgetUsdc, setBudgetUsdc] = useState('5.00');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { isConnected, address, connect, isConnecting } = useWallet();

  const handleStart = async () => {
    if (!isConnected || !address) {
      setError('Please connect your Pera Wallet first.');
      return;
    }

    const trimmedGoal = goal.trim();
    if (!trimmedGoal) {
      setError('Please describe what you want to research.');
      return;
    }

    const budgetFloat = parseFloat(budgetUsdc);
    if (isNaN(budgetFloat) || budgetFloat <= 0) {
      setError('Please enter a valid budget greater than 0.');
      return;
    }

    const budgetBaseUnits = Math.round(budgetFloat * 1_000_000);

    setLoading(true);
    setError(null);

    try {
      const session = await api.startResearch(trimmedGoal, budgetBaseUnits, address);
      navigate(`/research/${session.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start research session. Please try again.');
      setLoading(false);
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBudgetUsdc(parseFloat(e.target.value).toFixed(2));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBudgetUsdc(e.target.value);
  };

  const handleInputBlur = () => {
    const v = parseFloat(budgetUsdc);
    if (!isNaN(v)) {
      setBudgetUsdc(Math.min(Math.max(v, 0.5), 100).toFixed(2));
    }
  };

  return (
    <div className="page">
      <div className="compose-wrap">
        <div className="eyebrow">New Research</div>
        <div className="compose-head">
          <h1 className="page-title">What would you like to learn?</h1>
        </div>

        <div className="compose-box">
          <textarea
            className="compose-textarea"
            placeholder="Research the impact of AI on hiring in the Indian IT industry in 2026..."
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            disabled={loading}
          />
          <div className="compose-footer">
            <button className="btn btn-ghost" onClick={() => setGoal('')}>Clear</button>
          </div>
        </div>

        <div className="try-one">
          <div className="try-label">Try one</div>
          {EXAMPLE_PROMPTS.map((p, i) => (
            <button key={i} className="example-chip" onClick={() => setGoal(p)}>
              {p}
            </button>
          ))}
        </div>

        <div className="budget-block">
          <div className="section-title" style={{ marginBottom: 14 }}>Research budget</div>
          <div className="budget-row">
            <div className="budget-amount-input">
              <span style={{ fontSize: 30, fontWeight: 600, color: 'var(--text-0)' }}>$</span>
              <input
                type="text"
                value={budgetUsdc}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                disabled={loading}
              />
              <span className="budget-unit">USDC</span>
            </div>
          </div>
          <div className="budget-slider">
            <input
              type="range"
              min="0.5"
              max="20"
              step="0.5"
              value={parseFloat(budgetUsdc) || 5}
              onChange={handleSliderChange}
              disabled={loading}
            />
          </div>
          <div className="budget-help">Free sources are always searched first. You'll be asked before anything is purchased.</div>
        </div>

        <div className="compose-cta flex flex-row items-center">
          {error && <div role="alert" style={{ color: 'var(--red)', marginRight: 16, alignSelf: 'center', fontSize: 14 }}>{error}</div>}
          {!isConnected ? (
            <button className="btn btn-primary bg-yellow-500 text-black hover:bg-yellow-600" onClick={connect} disabled={isConnecting}>
              <Wallet size={16} className="inline mr-2" />
              Connect Pera Wallet to start paid research
            </button>
          ) : (
            <button className="btn btn-primary" onClick={handleStart} disabled={loading}>
              {loading ? 'Starting...' : 'Start Research →'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
