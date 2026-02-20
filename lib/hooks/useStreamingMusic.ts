import { useState, useRef, useCallback, useEffect } from 'react';

interface StyleMixItem {
  name: string;
  weight: number;
  color: string;
}

interface StreamInitData {
  seed: number;
  seedHash: string;
  styleMix: StyleMixItem[];
}

interface UseStreamingMusicReturn {
  isStreaming: boolean;
  isPlaying: boolean;
  initData: StreamInitData | null;
  error: string | null;
  startStream: (prompt: string, seed: number, style: string, duration: number, bpm: number) => void;
  stopStream: () => void;
}

export function useStreamingMusic(): UseStreamingMusicReturn {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [initData, setInitData] = useState<StreamInitData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const isPlayingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext({ sampleRate: 48000 });
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  const decodeAudioChunk = useCallback((base64Data: string): Float32Array => {
    const binaryString = atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const int16Array = new Int16Array(bytes.buffer, bytes.byteOffset, bytes.length / 2);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768;
    }
    
    return float32Array;
  }, []);

  const playChunk = useCallback((base64Audio: string) => {
    const ctx = initAudioContext();
    const floatData = decodeAudioChunk(base64Audio);
    
    const leftChannel = floatData;
    const rightChannel = new Float32Array(floatData.length);
    rightChannel.set(floatData);
    
    const interleaved = new Float32Array(leftChannel.length + rightChannel.length);
    for (let i = 0; i < leftChannel.length; i++) {
      interleaved[i * 2] = leftChannel[i];
      interleaved[i * 2 + 1] = rightChannel[i];
    }
    
    const audioBuffer = ctx.createBuffer(2, interleaved.length / 2, 48000);
    audioBuffer.copyToChannel(leftChannel, 0);
    audioBuffer.copyToChannel(rightChannel, 1);
    
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    
    const currentTime = ctx.currentTime;
    if (nextStartTimeRef.current < currentTime) {
      nextStartTimeRef.current = currentTime + 0.1;
    }
    
    source.start(nextStartTimeRef.current);
    nextStartTimeRef.current += audioBuffer.duration;
    
    if (!isPlayingRef.current) {
      isPlayingRef.current = true;
      setIsPlaying(true);
    }
  }, [initAudioContext, decodeAudioChunk]);

  const startStream = useCallback(async (prompt: string, seed: number, style: string, duration: number, bpm: number) => {
    setIsStreaming(true);
    setError(null);
    setInitData(null);
    nextStartTimeRef.current = 0;
    isPlayingRef.current = false;

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/generate-music/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, seed, style, duration, bpm }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('event:')) {
            const eventEnd = line.indexOf('\n');
            const eventType = line.slice(6, eventEnd > 0 ? eventEnd : line.length).trim();
            const dataStart = line.indexOf('data:');
            if (dataStart > 0) {
              const data = line.slice(dataStart + 5).trim();
              try {
                const parsed = JSON.parse(data);
                
                if (eventType === 'init') {
                  console.log('Stream init received:', parsed);
                  setInitData(parsed);
                } else if (eventType === 'chunk') {
                  if (parsed.audio) {
                    playChunk(parsed.audio);
                  }
                } else if (eventType === 'playing') {
                  console.log('Music started playing');
                } else if (eventType === 'complete') {
                  console.log('Stream complete');
                } else if (eventType === 'error') {
                  setError(parsed.error || 'Stream error');
                  setIsStreaming(false);
                }
              } catch (e) {
                console.error('Failed to parse SSE data:', e);
              }
            }
          }
        }
      }
      
      setIsStreaming(false);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Stream aborted');
      } else {
        console.error('Stream error:', err);
        setError(String(err));
      }
      setIsStreaming(false);
    }
  }, [playChunk]);

  const stopStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsStreaming(false);
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return {
    isStreaming,
    isPlaying,
    initData,
    error,
    startStream,
    stopStream
  };
}
