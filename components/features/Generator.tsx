'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Dice5, SlidersHorizontal, Music, FileText, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStreamingMusic } from '@/lib/hooks/useStreamingMusic';

interface StyleMixItem {
  name: string;
  weight: number;
  color: string;
}

interface CompleteMusicData {
  seed: number;
  audioBase64?: string;
  title: string;
  description: string;
  tags: string[];
  mood: string;
  genre: string;
  coverUrl: string | null;
  styleMix?: StyleMixItem[];
  seedHash?: string;
}

interface GeneratorProps {
  onGenerated: (data: CompleteMusicData) => void;
  onMusicReady?: (data: { seed: number; seedHash: string; styleMix: StyleMixItem[] }) => void;
}

type GenerationStage = 'idle' | 'generating' | 'analyzing' | 'cover' | 'complete';

export function Generator({ onGenerated, onMusicReady }: GeneratorProps) {
  const [prompt, setPrompt] = useState('');
  const [seed, setSeed] = useState(Math.floor(Math.random() * 1000000));
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<GenerationStage>('idle');
  const [error, setError] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { isStreaming, initData, startStream, stopStream } = useStreamingMusic();

  useEffect(() => {
    if (initData && !loading) {
      setLoading(true);
      setStage('generating');
      onMusicReady?.({
        seed: initData.seed,
        seedHash: initData.seedHash,
        styleMix: initData.styleMix
      });
      onGenerated({
        seed: initData.seed,
        title: `MeloSeed #${initData.seed}`,
        description: '',
        tags: [],
        mood: 'unknown',
        genre: 'unknown',
        coverUrl: null,
        styleMix: initData.styleMix,
        seedHash: initData.seedHash
      });

      if (initData.styleMix && initData.styleMix.length > 0) {
        setStage('analyzing');
        Promise.all([
          fetch('/api/generate-title', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ styleMix: initData.styleMix })
          }).then(res => res.json()).catch(console.error),
          
          fetch('/api/generate-cover-gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: `MeloSeed #${initData.seed}`,
              description: '',
              tags: [],
              mood: 'unknown',
              genre: 'unknown'
            })
          }).then(res => res.json()).catch(console.error)
        ]).then(([titleData, coverData]) => {
          const currentData = {
            seed: initData.seed,
            title: `MeloSeed #${initData.seed}`,
            description: '',
            tags: [],
            mood: 'unknown',
            genre: 'unknown',
            coverUrl: null as string | null,
            styleMix: initData.styleMix,
            seedHash: initData.seedHash
          };
          const updatedData = {
            ...currentData,
            title: titleData?.title || currentData.title,
            description: titleData?.description || '',
            tags: titleData?.tags || [],
            mood: titleData?.mood || 'unknown',
            genre: titleData?.genre || 'unknown',
            coverUrl: coverData?.coverUrl || null
          };
          setStage('cover');
          onGenerated(updatedData);
        }).catch(err => {
          console.error('Background generation error:', err);
        });
      }
    }
  }, [initData, loading, onMusicReady, onGenerated]);

  useEffect(() => {
    if (!isStreaming && loading) {
      setLoading(false);
      setStage('complete');
      setSeed(Math.floor(Math.random() * 1000000));
      setTimeout(() => setStage('idle'), 2000);
    }
  }, [isStreaming, loading]);

  const getStageText = () => {
    switch (stage) {
      case 'generating':
        return 'SYNTHESIZING...';
      case 'analyzing':
        return 'ANALYZING...';
      case 'cover':
        return 'CREATING COVER...';
      case 'complete':
        return 'COMPLETE!';
      default:
        return 'SYNTHESIZING...';
    }
  };

  const getStageProgress = () => {
    switch (stage) {
      case 'generating':
        return 25;
      case 'analyzing':
        return 50;
      case 'cover':
        return 75;
      case 'complete':
        return 100;
      default:
        return 0;
    }
  };

  const handleGenerate = () => {
    setLoading(true);
    setError('');
    setStage('generating');
    
    try {
      startStream(
        prompt,
        seed,
        'calm, soothing, gentle, relaxing, soft melody, ambient, peaceful, dreamy',
        15,
        80
      );
    } catch (err) {
      setError('Failed to start streaming. Please try again.');
      console.error(err);
      setLoading(false);
      setStage('idle');
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
                                className="h-full bg-gradient-to-r from-primary to-purple-500 transition-all duration-500"
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
