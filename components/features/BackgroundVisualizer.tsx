'use client';

import { useEffect, useRef } from 'react';

interface BackgroundVisualizerProps {
  audioContextRef: React.RefObject<AudioContext | null>;
  isPlaying: boolean;
  styleMix?: { name: string; weight: number; color: string }[];
}

export function BackgroundVisualizer({
  audioContextRef,
  isPlaying,
  styleMix = []
}: BackgroundVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !audioContextRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    if (!analyserRef.current) {
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      analyserRef.current.smoothingTimeConstant = 0.8;
      
      try {
        const source = audioContextRef.current.createMediaStreamDestination();
        analyserRef.current.connect(source);
      } catch (e) {
        console.log('Could not connect analyser to audio');
      }
      
      dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);
    }

    const colors = styleMix.length > 0 
      ? styleMix.map(s => s.color)
      : ['#8b5cf6', '#a855f7', '#c084fc', '#c026d3'];

    const draw = () => {
      if (!ctx || !canvas) return;
      
      animationRef.current = requestAnimationFrame(draw);

      if (analyserRef.current && dataArrayRef.current && isPlaying) {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!isPlaying) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        return;
      }

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const maxRadius = Math.min(canvas.width, canvas.height) * 0.4;

      const avgFrequency = dataArrayRef.current 
        ? dataArrayRef.current.reduce((a, b) => a + b, 0) / dataArrayRef.current.length / 255
        : 0.5;

      const baseRadius = maxRadius * 0.3;
      const pulseRadius = baseRadius + avgFrequency * maxRadius * 0.5;

      for (let i = 0; i < 3; i++) {
        const layerRadius = pulseRadius * (1 + i * 0.3);
        const alpha = 0.15 - i * 0.04;
        
        const gradient = ctx.createRadialGradient(
          centerX, centerY, layerRadius * 0.5,
          centerX, centerY, layerRadius
        );

        const colorIndex = i % colors.length;
        const color = colors[colorIndex];
        
        gradient.addColorStop(0, color + Math.floor(alpha * 255).toString(16).padStart(2, '0'));
        gradient.addColorStop(0.5, color + Math.floor(alpha * 0.5 * 255).toString(16).padStart(2, '0'));
        gradient.addColorStop(1, color + '00');

        ctx.beginPath();
        ctx.arc(centerX, centerY, layerRadius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      const bars = 64;
      const barWidth = Math.min(canvas.width, canvas.height) * 0.015;
      
      for (let i = 0; i < bars; i++) {
        const angle = (i / bars) * Math.PI * 2;
        const frequencyIndex = Math.floor((i / bars) * (dataArrayRef.current?.length || 64));
        const frequencyValue = dataArrayRef.current ? dataArrayRef.current[frequencyIndex] / 255 : 0.5;
        
        const barLength = frequencyValue * maxRadius * 0.8;
        const x1 = centerX + Math.cos(angle) * pulseRadius;
        const y1 = centerY + Math.sin(angle) * pulseRadius;
        const x2 = centerX + Math.cos(angle) * (pulseRadius + barLength);
        const y2 = centerY + Math.sin(angle) * (pulseRadius + barLength);

        const colorIndex = Math.floor((i / bars) * colors.length);
        const color = colors[colorIndex];

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = color + 'aa';
        ctx.lineWidth = barWidth;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
    };

    draw();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [audioContextRef, isPlaying, styleMix]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
      style={{
        filter: 'blur(60px)',
        opacity: 0.8,
      }}
    />
  );
}
