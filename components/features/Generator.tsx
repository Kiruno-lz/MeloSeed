'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Dice5, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GeneratorProps {
  onGenerated: (data: { seed: number; audioBase64: string }) => void;
}

export function Generator({ onGenerated }: GeneratorProps) {
  const [prompt, setPrompt] = useState('');
  const [seed, setSeed] = useState(Math.floor(Math.random() * 1000000));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

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
      
      // Randomize next seed for convenience
      setSeed(Math.floor(Math.random() * 1000000));
    } catch (err) {
      setError('Failed to generate music. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto">
        <div className="text-center space-y-4 mb-8">
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400 animate-in fade-in slide-in-from-bottom-4 duration-700">
                Plant a Melody
            </h1>
            <p className="text-xl text-muted-foreground max-w-lg mx-auto animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-100">
                Plant a digital seed and watch a unique musical organism grow on the Monad blockchain.
            </p>
        </div>

        <Card className="glass-card border-0 overflow-hidden relative group max-w-lg mx-auto">
             {/* Background Glow */}
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-purple-500/20 opacity-0 group-hover:opacity-100 blur-2xl transition-opacity duration-1000" />
            
            <CardContent className="p-6 relative z-10 space-y-6">
                
                {/* Main Action Button */}
                <div className="flex-1" />
                <Button
                    onClick={handleGenerate}
                    disabled={loading}
                    className={cn(
                        "w-full h-24 text-2xl font-bold rounded-2xl shadow-xl transition-all duration-500 relative overflow-hidden group/btn",
                        loading ? "bg-secondary text-muted-foreground" : "bg-gradient-to-r from-primary to-purple-500 hover:scale-[1.02] hover:shadow-primary/40 text-white"
                    )}
                >
                    {loading ? (
                        <div className="flex flex-col items-center gap-2">
                            <span className="animate-spin text-3xl">✺</span>
                            <span className="text-sm font-medium tracking-widest opacity-80">SYNTHESIZING...</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3">
                            <Sparkles className="w-8 h-8 animate-pulse" />
                            <span>Germinate Seed</span>
                        </div>
                    )}
                    
                    {/* Button Shine Effect */}
                    {!loading && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite]" />}
                </Button>

                {/* Error Feedback */}
                {error && (
                    <div className="text-destructive text-sm font-medium text-center animate-pulse bg-destructive/10 p-2 rounded-lg">
                        {error}
                    </div>
                )}

                {/* Advanced Options Toggle */}
                <div className="space-y-4">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="w-full text-muted-foreground hover:text-foreground"
                    >
                        <SlidersHorizontal className="w-4 h-4 mr-2" />
                        {showAdvanced ? "Hide Advanced" : "Advanced Options"}
                    </Button>
                    
                    {/* Collapsible Content */}
                    <div className={cn(
                        "grid gap-4 overflow-hidden transition-all duration-300 ease-in-out",
                        showAdvanced ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                    )}>
                        <div className="min-h-0 space-y-4 p-4 bg-secondary/30 rounded-xl border border-white/10 overflow-hidden">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Prompt (Optional)</label>
                                <Input
                                    type="text"
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder="e.g. Cyberpunk rain, Lo-fi chill..."
                                    className="bg-background/50 border-transparent focus:bg-background transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Seed</label>
                                <div className="flex gap-2">
                                    <Input
                                        type="number"
                                        value={seed}
                                        onChange={(e) => setSeed(Number(e.target.value))}
                                        className="flex-1 font-mono bg-background/50 border-transparent focus:bg-background transition-all"
                                    />
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => setSeed(Math.floor(Math.random() * 1000000))}
                                        title="Randomize Seed"
                                        className="bg-background/50 border-transparent hover:bg-background"
                                    >
                                        <Dice5 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </CardContent>
        </Card>
    </div>
  );
}
