'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RefreshCw, Disc, Activity, Hash, Sparkles, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface StyleMixItem {
  name: string;
  weight: number;
  color: string;
}

interface StreamingPlayerProps {
  audioBase64?: string;
  coverUrl?: string | null;
  title?: string;
  description?: string;
  seed?: number;
  seedHash?: string;
  styleMix?: StyleMixItem[];
  onRestart?: () => void;
  className?: string;
}

export function StreamingPlayer({
  audioBase64,
  coverUrl,
  title = 'Untitled',
  description = '',
  seed,
  seedHash,
  styleMix = [],
  onRestart,
  className
}: StreamingPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const audioSrc = audioBase64 ? `data:audio/mp3;base64,${audioBase64}` : null;

  useEffect(() => {
    if (!audioRef.current && audioSrc) {
      audioRef.current = new Audio(audioSrc);
      audioRef.current.loop = true;
    }
  }, [audioSrc]);

  useEffect(() => {
    if (!audioRef.current) return;

    const audio = audioRef.current;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, []);

  useEffect(() => {
    if (!isPlaying || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bars = 64;
    const barWidth = canvas.width / bars;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < bars; i++) {
        const height = isPlaying 
          ? Math.random() * (canvas.height * 0.8) + canvas.height * 0.1
          : canvas.height * 0.05;
        
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - height);
        
        if (styleMix.length > 0) {
          const colorIndex = Math.floor((i / bars) * styleMix.length);
          const color = styleMix[colorIndex]?.color || '#8b5cf6';
          gradient.addColorStop(0, color);
          gradient.addColorStop(1, `${color}66`);
        } else {
          gradient.addColorStop(0, '#8b5cf6');
          gradient.addColorStop(1, '#a855f766');
        }

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(
          i * barWidth + 1,
          canvas.height - height,
          barWidth - 2,
          height,
          2
        );
        ctx.fill();
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, styleMix]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  }, [isPlaying]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn("w-full max-w-md mx-auto", className)}>
      <div className="relative group">
        <div className="absolute -inset-2 bg-gradient-to-r from-violet-500/20 via-purple-500/20 to-fuchsia-500/20 opacity-0 group-hover:opacity-100 blur-xl transition-all duration-700" />
        
        <div className="relative bg-gradient-to-b from-secondary/80 to-background rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
          <div className="relative aspect-square">
            {coverUrl ? (
              <img 
                src={coverUrl} 
                alt={title}
                className="w-full h-full object-cover transition-all duration-700"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-900/50 to-purple-900/50">
                <div className="relative">
                  <Disc className={cn(
                    "w-24 h-24 text-violet-400/50",
                    isPlaying && "animate-spin"
                  )} style={{ animationDuration: '3s' }} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-violet-500/30 backdrop-blur-sm" />
                  </div>
                </div>
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

            <div className="absolute inset-0 flex items-center justify-center">
              <button
                onClick={togglePlay}
                className={cn(
                  "w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300",
                  isPlaying 
                    ? "bg-white/10 backdrop-blur-md border border-white/20 scale-100"
                    : "bg-violet-500 hover:bg-violet-400 scale-110 shadow-lg shadow-violet-500/40"
                )}
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8 text-white" />
                ) : (
                  <Play className="w-8 h-8 text-white ml-1" />
                )}
              </button>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-white truncate">{title}</h2>
                {description && (
                  <p className="text-sm text-white/60 line-clamp-2 mt-1">{description}</p>
                )}
              </div>
              
              {seed !== undefined && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/10 ml-3">
                  <Hash className="w-3 h-3 text-violet-400" />
                  <span className="text-xs font-mono text-violet-300">{seed}</span>
                </div>
              )}
            </div>

            <div className="h-16 w-full rounded-xl overflow-hidden bg-black/20 border border-white/5">
              <canvas 
                ref={canvasRef}
                width={400}
                height={64}
                className="w-full h-full"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-white/40">
              <div className="flex items-center gap-2">
                <Activity className="w-3 h-3" />
                <span>LIVE STREAM</span>
              </div>
              <span className="font-mono">{formatTime(currentTime)}</span>
            </div>

            {styleMix.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {styleMix.slice(0, 4).map((style, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                    style={{ 
                      backgroundColor: `${style.color}20`,
                      color: style.color,
                      border: `1px solid ${style.color}40`
                    }}
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>{style.name}</span>
                    <span className="opacity-60">{Math.round(style.weight * 100)}%</span>
                  </div>
                ))}
              </div>
            )}

            {seedHash && (
              <div className="pt-2 border-t border-white/5">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/40">Signature:</span>
                  <code className="text-xs font-mono text-violet-400/80 bg-violet-500/10 px-2 py-0.5 rounded">
                    {seedHash}
                  </code>
                </div>
              </div>
            )}

            {onRestart && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onRestart}
                className="w-full border-white/10 text-white/60 hover:text-white hover:bg-white/5"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Regenerate with New Seed
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
