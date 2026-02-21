'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Hash, Sparkles, Radio } from 'lucide-react';
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
  autoPlay?: boolean;
  isStreaming?: boolean;
  isPlaying?: boolean;
  onPlayPause?: () => void;
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
  className,
  autoPlay = false,
  isStreaming = false,
  isPlaying: externalIsPlaying,
  onPlayPause
}: StreamingPlayerProps) {
  const [internalIsPlaying, setInternalIsPlaying] = useState(false);
  const isPlaying = externalIsPlaying !== undefined ? externalIsPlaying : internalIsPlaying;
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamStartTimeRef = useRef<number>(0);
  const streamElapsedRef = useRef<number>(0);

  const audioSrc = audioBase64 ? `data:audio/mp3;base64,${audioBase64}` : null;

  useEffect(() => {
    if (!audioRef.current && audioSrc) {
      audioRef.current = new Audio(audioSrc);
      audioRef.current.loop = true;
      if (autoPlay) {
        audioRef.current.play().catch(console.error);
      }
    }
  }, [audioSrc, autoPlay]);

  useEffect(() => {
    if (!audioRef.current) return;

    const audio = audioRef.current;

    const handlePlay = () => setInternalIsPlaying(true);
    const handlePause = () => setInternalIsPlaying(false);
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
    if (isStreaming && isPlaying) {
      if (streamStartTimeRef.current === 0) {
        streamStartTimeRef.current = Date.now() - (streamElapsedRef.current * 1000);
      }
      
      const interval = setInterval(() => {
        streamElapsedRef.current = (Date.now() - streamStartTimeRef.current) / 1000;
        setCurrentTime(streamElapsedRef.current);
      }, 100);
      
      return () => clearInterval(interval);
    } else if (!isPlaying) {
      streamStartTimeRef.current = 0;
    }
  }, [isStreaming, isPlaying]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const bars = 48;
    const barWidth = width / bars;

    const colors = styleMix.length > 0 
      ? styleMix.map(() => '#a1a1aa')
      : ['#a1a1aa', '#d4d4d8', '#a1a1aa'];

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < bars; i++) {
        const phase = (i / bars) * Math.PI * 2;
        const wave = Math.sin(phase + currentTime * 0.5);
        const amplitude = isPlaying ? 0.5 : 0.08;
        const heightRatio = (wave * 0.5 + 0.5) * amplitude;
        const barHeight = Math.max(4, height * heightRatio);
        
        const colorIndex = Math.floor((i / bars) * colors.length);
        const color = colors[colorIndex];
        
        const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
        gradient.addColorStop(0, color + '30');
        gradient.addColorStop(1, color + '10');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(
          i * barWidth + 1,
          height - barHeight,
          barWidth - 2,
          barHeight,
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
  }, [isPlaying, currentTime, styleMix]);

  const togglePlay = useCallback(() => {
    if (onPlayPause) {
      onPlayPause();
    } else if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
    }
  }, [isPlaying, onPlayPause]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn("w-full max-w-sm mx-auto", className)}>
      <div className="relative">
        <div className="absolute -inset-4 bg-gradient-to-r from-primary/10 via-purple-500/10 to-fuchsia-500/10 opacity-0 group-hover:opacity-100 blur-2xl transition-all duration-700" />
        
        <div className="relative glass-card rounded-3xl overflow-hidden shadow-2xl">
          <div className="relative aspect-square overflow-hidden rounded-full p-6">
            {coverUrl ? (
              <img 
                src={coverUrl} 
                alt={title}
                className={cn(
                  "w-full h-full object-cover rounded-full album-spin",
                  !isPlaying && "album-spin-paused"
                )}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/40 via-purple-500/30 to-secondary dark:from-primary/40 dark:via-purple-500/30 dark:to-secondary">
                <div className={cn(
                  "relative w-40 h-40 album-spin",
                  !isPlaying && "album-spin-paused"
                )}>
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary to-purple-900 shadow-2xl" />
                  <div className="absolute inset-4 rounded-full bg-secondary flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-fuchsia-500" />
                  </div>
                  <div className="absolute inset-0 rounded-full border-2 border-white/20 dark:border-white/10" style={{ padding: '8px' }}>
                    <div className="w-full h-full rounded-full border border-white/20 dark:border-white/5 border-dashed" />
                  </div>
                </div>
              </div>
            )}

            <div className="absolute inset-6 bg-gradient-to-t from-black/60 to-transparent rounded-full" />
          </div>

          <div className="px-5 pt-2 pb-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary/50 dark:bg-secondary/30 rounded-full border border-primary/20">
                <Radio className="w-3 h-3 text-primary animate-pulse" />
                <span className="text-xs font-medium text-primary">LIVE</span>
              </div>
              
              {seed !== undefined && (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-secondary/50 dark:bg-secondary/30 rounded-full border border-border">
                  <Hash className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs font-mono text-foreground">{seed}</span>
                </div>
              )}
            </div>

            <div>
              <h2 className="text-lg font-bold text-foreground truncate leading-tight">{title}</h2>
              {seedHash && (
                <code className="text-xs font-mono text-primary/60 mt-1 block truncate">
                  {seedHash}
                </code>
              )}
            </div>

            <div className="h-10 w-full rounded-lg overflow-hidden bg-secondary/30 dark:bg-secondary/20 border border-border/50 relative">
              <canvas 
                ref={canvasRef}
                width={320}
                height={40}
                className="w-full h-full opacity-40"
              />
            </div>

            {styleMix.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {styleMix.slice(0, 3).map((style, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium"
                    style={{ 
                      backgroundColor: style.color + '15',
                      color: style.color,
                      border: `1px solid ${style.color}30`
                    }}
                  >
                    <Sparkles className="w-2.5 h-2.5" />
                    <span>{style.name}</span>
                  </div>
                ))}
                {styleMix.length > 3 && (
                  <span className="text-[10px] text-muted-foreground self-center">
                    +{styleMix.length - 3}
                  </span>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <Button 
                onClick={togglePlay}
                className={cn(
                  "flex-1 h-12 rounded-xl font-semibold transition-all duration-300",
                  isPlaying 
                    ? "bg-secondary hover:bg-secondary/80 text-foreground border border-border"
                    : "bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90 text-white shadow-lg shadow-primary/25"
                )}
              >
                {isPlaying ? (
                  <div className="flex items-center gap-2">
                    <Pause className="w-5 h-5" />
                    <span>Pause</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Play className="w-5 h-5" />
                    <span>Resume</span>
                  </div>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
