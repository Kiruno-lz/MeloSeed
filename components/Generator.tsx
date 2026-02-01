'use client';

import { useState } from 'react';

interface GeneratorProps {
  onGenerated: (data: { seed: number; audioBase64: string }) => void;
}

export function Generator({ onGenerated }: GeneratorProps) {
  const [prompt, setPrompt] = useState('');
  const [seed, setSeed] = useState(Math.floor(Math.random() * 1000000));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, seed }),
      });

      if (!res.ok) throw new Error('Generation failed');

      const data = await res.json();
      onGenerated({ seed: Number(data.seed), audioBase64: data.audioBase64 });
    } catch (err) {
      setError('Failed to generate music. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-6 bg-white/5 rounded-xl border border-white/10 w-full max-w-md">
      <h2 className="text-xl font-bold text-white">Create Melody</h2>
      
      <div className="flex flex-col gap-2">
        <label className="text-sm text-gray-400">Prompt (Optional)</label>
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. Happy vibes"
          className="p-2 rounded bg-black/20 border border-white/10 text-white"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm text-gray-400">Seed</label>
        <div className="flex gap-2">
          <input
            type="number"
            value={seed}
            onChange={(e) => setSeed(Number(e.target.value))}
            className="p-2 rounded bg-black/20 border border-white/10 text-white flex-1"
          />
          <button
            onClick={() => setSeed(Math.floor(Math.random() * 1000000))}
            className="px-3 py-2 bg-white/10 rounded hover:bg-white/20 text-white"
          >
            Random
          </button>
        </div>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        onClick={handleGenerate}
        disabled={loading}
        className="mt-2 py-3 px-4 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-bold text-white transition-colors"
      >
        {loading ? 'Generating...' : 'Generate Music'}
      </button>
    </div>
  );
}
