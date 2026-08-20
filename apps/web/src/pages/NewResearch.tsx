import React, { useState } from 'react';
import { Card, Button } from '../components/ui';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

const EXAMPLE_PROMPTS = [
  'Research the impact of AI on hiring in the Indian IT industry in 2026, including company-level trends and quantitative data.',
  'Analyse the current state of electric vehicle adoption in Southeast Asia, with market size and key players.',
  'Summarise recent advances in quantum computing and their potential enterprise applications by 2027.',
];

export const NewResearch = () => {
  const navigate = useNavigate();
  const [goal, setGoal] = useState('');
  const [budgetUsdc, setBudgetUsdc] = useState('5.00');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
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

    // Convert USDC display value to base units (6 decimals)
    const budgetBaseUnits = Math.round(budgetFloat * 1_000_000);

    setLoading(true);
    setError(null);

    try {
      const session = await api.startResearch(trimmedGoal, budgetBaseUnits);
      navigate(`/research/${session.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start research session. Please try again.');
      setLoading(false);
    }
  };

  return (
    <main className="flex flex-col h-full max-w-2xl mx-auto w-full pt-8 px-4">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">New Research</h1>
        <p className="mt-1 text-sm text-gray-500">
          AgentFlow searches free sources first. If extra information is needed, the agent will ask before spending anything.
        </p>
      </header>

      <Card className="p-6">
        <div className="space-y-6">

          {/* Goal input */}
          <div>
            <label htmlFor="research-goal" className="block text-sm font-medium text-gray-900 mb-2">
              What do you want to research?
            </label>
            <textarea
              id="research-goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-md p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors min-h-[120px] resize-none"
              placeholder="Describe your research topic in plain language…"
              disabled={loading}
              aria-required="true"
            />

            {/* Example prompts */}
            <div className="mt-3">
              <p className="text-xs text-gray-500 mb-2 font-medium">Examples:</p>
              <div className="space-y-1">
                {EXAMPLE_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setGoal(prompt)}
                    disabled={loading}
                    className="w-full text-left text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded transition-colors flex items-start gap-2 group"
                    aria-label={`Use example: ${prompt}`}
                  >
                    <ArrowRight size={12} className="mt-0.5 shrink-0 opacity-50 group-hover:opacity-100" />
                    <span>{prompt}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Budget input */}
          <div>
            <label htmlFor="research-budget" className="block text-sm font-medium text-gray-900 mb-2">
              Maximum budget
            </label>
            <div className="flex items-center gap-2">
              <div className="relative w-40">
                <span className="absolute left-3 top-2.5 text-gray-500 text-sm select-none">$</span>
                <input
                  id="research-budget"
                  type="number"
                  value={budgetUsdc}
                  onChange={(e) => setBudgetUsdc(e.target.value)}
                  step="0.01"
                  min="0.01"
                  className="w-full bg-white border border-gray-300 rounded-md p-2 pl-7 pr-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                  disabled={loading}
                  aria-describedby="budget-help"
                />
              </div>
              <span className="text-sm text-gray-500">USDC</span>
            </div>
            <p id="budget-help" className="text-xs text-gray-400 mt-1">
              The agent will only spend money if you approve it first. Free sources are always tried first.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div role="alert" className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md p-3">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="ghost" onClick={() => navigate('/')} disabled={loading}>
              Cancel
            </Button>
            <Button id="start-research-btn" onClick={handleStart} disabled={loading}>
              {loading ? 'Starting…' : 'Start Research'}
            </Button>
          </div>

        </div>
      </Card>
    </main>
  );
};
