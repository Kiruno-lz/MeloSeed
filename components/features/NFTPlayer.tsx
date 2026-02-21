'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useConfig, useWriteContract, useAccount } from 'wagmi';
import { readContract } from 'wagmi/actions';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlayCircle, Search, Disc, AlertCircle, Flame, ChevronDown, RefreshCw, Save, Music, Pause, Radio, Sparkles } from 'lucide-react';
import { useToast } from '@/components/Toast';
import * as Popover from '@radix-ui/react-popover';
import { CONTRACT_ADDRESS, MELO_SEED_ABI } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { SeedToStyleMapper, DEFAULT_STYLES, seedToHash } from '@/lib/seed-mapper';

interface StyleMixItem {
    name: string;
    weight: number;
    color: string;
}

interface NFTData {
    seed: number;
    imageUrl: string;
    title: string;
}

interface NFTPlayerProps {
    collectionIds?: bigint[];
    previewData?: {
        audioSrc: string;
        coverImage: string | null;
        title: string;
        description: string;
        seed: number;
    } | null;
    onBurn?: () => void;
    className?: string;
}

export function NFTPlayer({ collectionIds = [], previewData, className, onBurn }: NFTPlayerProps) {
    const config = useConfig();
    const { address } = useAccount();
    
    const isPreview = !!previewData;

    const [tokenId, setTokenId] = useState<string>('');
    const [queryState, setQueryState] = useState<{ id: bigint | null, attempts: number }>({ id: null, attempts: 0 });
    const [displayError, setDisplayError] = useState<string | null>(null);
    const [openCombobox, setOpenCombobox] = useState(false);
    
    const [isStreaming, setIsStreaming] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [styleMix, setStyleMix] = useState<StyleMixItem[]>([]);
    
    const audioContextRef = useRef<AudioContext | null>(null);
    const nextStartTimeRef = useRef<number>(0);
    const isPlayingRef = useRef(false);
    const abortControllerRef = useRef<AbortController | null>(null);
    const currentSeedRef = useRef<number | null>(null);
    
    const { writeContract, isPending: isBurning, isSuccess: isBurnSuccess, error: burnError } = useWriteContract();
    const { showToast } = useToast();

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
        if (!audioContextRef.current) {
            audioContextRef.current = new AudioContext({ sampleRate: 48000 });
        }
        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') {
            ctx.resume();
        }
        
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
        audioBuffer.copyToChannel(leftChannel as Float32Array<ArrayBuffer>, 0);
        audioBuffer.copyToChannel(rightChannel as Float32Array<ArrayBuffer>, 1);
        
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
    }, [decodeAudioChunk]);

    const startStream = useCallback(async (seed: number, style: string, duration: number, bpm: number) => {
        if (currentSeedRef.current === seed && isStreaming) return;
        
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        
        setIsStreaming(true);
        setIsPlaying(false);
        nextStartTimeRef.current = 0;
        isPlayingRef.current = false;
        currentSeedRef.current = seed;

        abortControllerRef.current = new AbortController();

        try {
            const response = await fetch('/api/generate-music/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: '', seed, style, duration, bpm }),
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
                                } else if (eventType === 'chunk') {
                                    if (parsed.audio) {
                                        playChunk(parsed.audio);
                                    }
                                } else if (eventType === 'playing') {
                                    console.log('Music started playing');
                                } else if (eventType === 'complete') {
                                    console.log('Stream complete');
                                    setIsStreaming(false);
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
                setDisplayError(String(err));
            }
            setIsStreaming(false);
            setIsPlaying(false);
        }
    }, [isStreaming, playChunk]);

    const stopStream = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        setIsStreaming(false);
        setIsPlaying(false);
        currentSeedRef.current = null;
    }, []);

    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isBurnSuccess) {
            showToast("NFT Burned Successfully!", "success");
            setTokenId('');
            setQueryState({ id: null, attempts: 0 });
            stopStream();
            if (onBurn) onBurn();
        }
        if (burnError) showToast("Failed to burn NFT: " + burnError.message, "error");
    }, [isBurnSuccess, burnError, showToast, onBurn, stopStream]);

    const fetchTokenData = async (id: bigint, attempt: number) => {
        const timeoutDuration = attempt < 2 ? 5000 : 60000; 
        const fetchPromise = readContract(config, {
            address: CONTRACT_ADDRESS,
            abi: MELO_SEED_ABI,
            functionName: 'getTokenData', 
            args: [id],
        });
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Timeout')), timeoutDuration);
        });

        const data = await Promise.race([fetchPromise, timeoutPromise]) as [bigint, string, string];
        
        return {
            seed: Number(data[0]),
            imageUrl: data[1],
            title: data[2]
        };
    };

    const { data: nftData, isFetching, error: fetchError } = useQuery({
        queryKey: ['tokenData', queryState.id?.toString(), queryState.attempts],
        queryFn: () => queryState.id === null ? null : fetchTokenData(queryState.id, queryState.attempts),
        enabled: !isPreview && queryState.id !== null,
        retry: false,
    });

    useEffect(() => {
        if (nftData) {
            const mapper = new SeedToStyleMapper(nftData.seed);
            const mix = mapper.generateWeightedPrompts(DEFAULT_STYLES).map(s => ({
                name: s.text,
                weight: s.weight,
                color: s.color
            }));
            setStyleMix(mix);
        }
    }, [nftData]);

    const effectiveError = displayError || (fetchError ? (fetchError instanceof Error ? fetchError.message : "Failed to load NFT") : null);

    const handleSearch = () => {
        if (tokenId === '') return;
        try {
            const id = BigInt(tokenId);
            if (queryState.id === id) setQueryState(prev => ({ ...prev, attempts: prev.attempts + 1 }));
            else {
                stopStream();
                setQueryState({ id, attempts: 0 });
            }
            setDisplayError(null);
        } catch (e) { setDisplayError("Invalid Token ID"); }
    };

    const handleSelectNFT = (id: bigint) => {
        stopStream();
        setTokenId(id.toString());
        setOpenCombobox(false);
        setQueryState({ id, attempts: 0 });
    };

    const { data: balance } = useQuery({
        queryKey: ['balance', address, queryState.id?.toString()],
        queryFn: async () => {
            if (!address || queryState.id === null) return null;
            return readContract(config, {
                address: CONTRACT_ADDRESS,
                abi: MELO_SEED_ABI,
                functionName: 'balanceOf',
                args: [address, queryState.id],
            });
        },
        enabled: !!address && queryState.id !== null,
    });

    const isOwner = balance ? balance > BigInt(0) : false;

    const handleBurn = () => {
        if (queryState.id === null || !address || !isOwner) return;
        if (!confirm("Permanently destroy this NFT?")) return;
        stopStream();
        writeContract({
            address: CONTRACT_ADDRESS,
            abi: MELO_SEED_ABI,
            functionName: 'burn',
            args: [address, queryState.id, BigInt(1)],
        });
    };

    const handlePlayPause = () => {
        if (!nftData) return;
        
        if (isPlaying || isStreaming) {
            stopStream();
        } else {
            startStream(
                nftData.seed,
                'calm, soothing, gentle, relaxing, soft melody, ambient, peaceful, dreamy',
                15,
                80
            );
        }
    };

    const finalData = isPreview ? previewData : nftData;
    const coverImage = isPreview ? previewData?.coverImage : (nftData?.imageUrl ?? null);
    const title = isPreview ? previewData?.title : (nftData?.title || "Select an NFT");
    const seed = isPreview ? previewData?.seed : nftData?.seed;
    const seedHash = seed !== undefined ? seedToHash(seed) : undefined;

    if (!isPreview && collectionIds.length > 0 && queryState.id === null && tokenId === '' && !queryState.id) {
    }

    return (
        <div className={cn("w-full max-w-lg mx-auto transition-all duration-500", className)}>
            <div className="relative glass-card rounded-3xl overflow-hidden p-1">
                
                {!isPreview && (
                    <div className="p-6 pb-2">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold flex items-center gap-2 text-foreground/80">
                                <Disc className="w-5 h-5 text-primary" />
                                Sonic Garden
                            </h3>
                            <div className="flex items-center gap-2">
                                <Popover.Root open={openCombobox} onOpenChange={setOpenCombobox}>
                                    <Popover.Trigger asChild>
                                        <Button variant="outline" size="sm" className="rounded-full border-primary/20 hover:bg-primary/5">
                                            {collectionIds.length > 0 ? `${collectionIds.length} Available` : "Empty"}
                                            <ChevronDown className="w-3 h-3 ml-2 opacity-50" />
                                        </Button>
                                    </Popover.Trigger>
                                    <Popover.Portal>
                                        <Popover.Content className="w-[240px] p-2 bg-popover border rounded-xl shadow-xl z-50 animate-in zoom-in-95" align="end">
                                            <div className="max-h-[200px] overflow-y-auto space-y-1">
                                                {collectionIds.length === 0 ? (
                                                    <p className="text-xs text-center py-4 text-muted-foreground">Your garden is empty.</p>
                                                ) : (
                                                    collectionIds.map(id => (
                                                        <button
                                                            key={id.toString()}
                                                            onClick={() => handleSelectNFT(id)}
                                                            className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-secondary transition-colors flex items-center justify-between"
                                                        >
                                                            <span>#{id.toString()}</span>
                                                            <PlayCircle className="w-3 h-3 text-primary" />
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        </Popover.Content>
                                    </Popover.Portal>
                                </Popover.Root>
                            </div>
                        </div>

                        <div className="relative group">
                            <Input 
                                value={tokenId}
                                onChange={(e) => setTokenId(e.target.value)}
                                placeholder="Or enter Token ID..."
                                className="rounded-full bg-secondary/30 border-transparent focus:border-primary/50 focus:bg-background transition-all pr-12"
                            />
                            <Button 
                                size="icon" 
                                variant="ghost" 
                                onClick={handleSearch}
                                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full hover:bg-primary/10 text-primary"
                                disabled={isFetching}
                            >
                                {isFetching ? <span className="animate-spin text-xs">⏳</span> : <Search className="w-4 h-4" />}
                            </Button>
                        </div>
                    </div>
                )}

                <div className="relative aspect-square md:aspect-[4/3] w-full bg-gradient-to-br from-secondary/50 to-background rounded-[1.2rem] overflow-hidden group mt-2">
                    
                    {coverImage ? (
                        <img 
                            src={coverImage} 
                            alt="Cover" 
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-secondary/20">
                            <Music className="w-24 h-24 text-muted-foreground/10" />
                        </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-100 flex flex-col justify-end p-6">
                        
                        <div className="mb-4 transform translate-y-0 transition-transform duration-300 text-shadow-sm">
                            <div className="flex items-center gap-2 mb-2">
                                {seed !== undefined && (
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
                                        <Radio className="w-3 h-3 text-primary animate-pulse" />
                                        <span className="text-xs font-medium text-primary">LIVE</span>
                                    </div>
                                )}
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-1 drop-shadow-md" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{title}</h2>
                            {seedHash && (
                                <code className="text-xs font-mono text-white/60 mt-1 block">
                                    Seed Hash: {seedHash}
                                </code>
                            )}
                            
                            {styleMix.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    {styleMix.slice(0, 3).map((style, idx) => (
                                        <div 
                                            key={idx}
                                            className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium"
                                            style={{ 
                                                backgroundColor: style.color + '20',
                                                color: style.color,
                                                border: `1px solid ${style.color}40`
                                            }}
                                        >
                                            <Sparkles className="w-2.5 h-2.5" />
                                            <span>{style.name}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="space-y-3">
                            {nftData && (
                                <Button
                                    onClick={handlePlayPause}
                                    disabled={isFetching}
                                    className={cn(
                                        "w-full h-12 rounded-xl font-semibold transition-all duration-300",
                                        isPlaying || isStreaming
                                            ? "bg-secondary hover:bg-secondary/80 text-foreground border border-border"
                                            : "bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90 text-white shadow-lg shadow-primary/25"
                                    )}
                                >
                                    {isStreaming ? (
                                        <div className="flex items-center gap-2">
                                            <span className="animate-spin text-lg">✺</span>
                                            <span>Generating...</span>
                                        </div>
                                    ) : isPlaying ? (
                                        <div className="flex items-center gap-2">
                                            <Pause className="w-5 h-5" />
                                            <span>Pause</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <PlayCircle className="w-5 h-5" />
                                            <span>Play Music</span>
                                        </div>
                                    )}
                                </Button>
                            )}

                            {!isPreview && nftData && isOwner && (
                                <div className="flex justify-end pt-2">
                                    <Button 
                                        variant="destructive" 
                                        size="sm" 
                                        onClick={handleBurn}
                                        disabled={isBurning}
                                        className="h-8 text-xs rounded-full bg-red-500/20 hover:bg-red-500/40 text-red-200 border border-red-500/30 backdrop-blur-md"
                                    >
                                        {isBurning ? <span className="animate-spin mr-1">⏳</span> : <Flame className="w-3 h-3 mr-1" />}
                                        Burn
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {isFetching && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-white text-xs font-medium tracking-widest">LOADING</span>
                            </div>
                        </div>
                    )}
                </div>
                
                {effectiveError && (
                    <div className="p-4 bg-red-500/10 text-red-600 text-sm text-center font-medium border-t border-red-500/20">
                        {effectiveError}
                    </div>
                )}
            </div>
        </div>
    );
}
