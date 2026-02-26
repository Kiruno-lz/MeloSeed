'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Dice5, Music, FileText, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GeneratorProps {
  onGenerate: (seed: string) => void;
}

type GenerationStage = 'idle' | 'generating';

export function Generator({ onGenerate }: GeneratorProps) {
  const [seed, setSeed] = useState<string | number>(Math.floor(Math.random() * 1000000));
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<GenerationStage>('idle');

  const getStageText = () => {
    switch (stage) {
      case 'generating':
        return 'SYNTHESIZING...';
      default:
        return 'SYNTHESIZING...';
    }
  };

  const getStageProgress = () => {
    switch (stage) {
      case 'generating':
        return 25;
      default:
        return 0;
    }
  };

  const handleGenerate = () => {
    setLoading(true);
    setStage('generating');
    
    onGenerate(
      String(seed)
    );
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
                
                {/* Progress Indicator */}
                {loading && (
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <Music className="w-3 h-3" />
                                Music
                            </span>
                            <span className="flex items-center gap-1">
                                <FileText className="w-3 h-3" />
                                Analysis
                            </span>
                            <span className="flex items-center gap-1">
                                <ImageIcon className="w-3 h-3" />
                                Cover
                            </span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-gradient-to-r from-primary to-purple-500 transition-all duration-500 animate-pulse"
                                style={{ width: `${getStageProgress()}%` }}
                            />
                        </div>
                    </div>
                )}
                
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
                            <span className="text-sm font-medium tracking-widest opacity-80">{getStageText()}</span>
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

                {/* Seed Input - Always Visible */}
                <div className="space-y-2 px-10">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Seed</label>
                    <div className="flex gap-2 mt-3">
                        <Input
                            type="text"
                            value={seed}
                            onChange={(e) => setSeed(e.target.value)}
                            placeholder="Enter any text or number"
                            className="flex-1 font-mono bg-background/50 border-transparent focus:bg-background transition-all"
                        />
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setSeed(Math.floor(Math.random() * 1000000))}
                            title="Randomize Seed (Number)"
                            className="bg-background/50 border-transparent hover:bg-background"
                        >
                            <Dice5 className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

            </CardContent>
        </Card>
    </div>
  );
}
