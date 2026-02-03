'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Dice5, Music } from 'lucide-react';

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
    <Card className="w-full max-w-md border-border/50 shadow-lg backdrop-blur-sm bg-card/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <Sparkles className="w-5 h-5" />
          Create Melody
        </CardTitle>
        <CardDescription>
          Enter a prompt or use a random seed to generate unique AI music.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Prompt (Optional)
          </label>
          <Input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. Happy vibes, lo-fi chill"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Seed
          </label>
          <div className="flex gap-2">
            <Input
              type="number"
              value={seed}
              onChange={(e) => setSeed(Number(e.target.value))}
              className="flex-1 font-mono"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSeed(Math.floor(Math.random() * 1000000))}
              title="Randomize Seed"
            >
              <Dice5 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {error && <p className="text-destructive text-sm font-medium animate-pulse">{error}</p>}
      </CardContent>
      <CardFooter>
        <Button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full font-bold shadow-md hover:shadow-lg transition-all"
          size="lg"
        >
          {loading ? (
            <>
              <span className="mr-2 animate-spin">⏳</span> Generating...
            </>
          ) : (
            <>
              <Music className="mr-2 w-4 h-4" /> Generate Music
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
