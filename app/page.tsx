'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAccount, useWriteContract } from 'wagmi';
import { Header } from '@/components/Header';
import { Generator } from '@/components/features/Generator';
import { StreamingPlayer } from '@/components/features/StreamingPlayer';
import { BackgroundVisualizer } from '@/components/features/BackgroundVisualizer';
import { MintingCard } from '@/components/features/MintingCard';
import { NFTPlayer } from '@/components/features/NFTPlayer';
import { useToast } from '@/components/Toast';
import { uploadFileToIPFS, uploadJSONToIPFS } from '@/lib/ipfs-client';
import { useMyCollection } from '@/lib/hooks/useMyCollection';
import { CONTRACT_ADDRESS, MELO_SEED_ABI } from '@/lib/constants';
import { ConnectButton } from '@rainbow-me/rainbowkit';

interface CompleteMusicData {
  seed: number;
  audioBase64?: string;
  title: string;
  description: string;
  tags: string[];
  mood: string;
  genre: string;
  coverUrl: string | null;
  styleMix?: { name: string; weight: number; color: string }[];
  seedHash?: string;
}

export default function Home() {
  const { address, isConnected } = useAccount();
  const [view, setView] = useState<'create' | 'collection'>('create');
  
  // Streaming State
  const [isStreaming, setIsStreaming] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const isPlayingRef = useRef(false);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const gainNodeRef = useRef<GainNode | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Generation State
  const [generatedData, setGeneratedData] = useState<CompleteMusicData | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const { writeContract, isPending: isTxPending, error, isSuccess } = useWriteContract();
  const { showToast } = useToast();

  // Collection Hook
  const { tokenIds, isLoading: isCollectionLoading, refetch: refetchCollection } = useMyCollection(CONTRACT_ADDRESS);

  const isPending = isUploading || isTxPending;

  // Audio decoding and playback functions
  const initAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext({ sampleRate: 48000 });
      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.gain.setValueAtTime(isPlayingRef.current ? 1 : 0, audioContextRef.current.currentTime);
      gainNodeRef.current.connect(audioContextRef.current.destination);
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  };

  const decodeAudioChunk = (base64Data: string): Float32Array => {
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
  };

  const playChunk = (base64Audio: string) => {
    if (!isPlayingRef.current) return;
    
    const ctx = initAudioContext();
    const floatData = decodeAudioChunk(base64Audio);
    
    const audioBuffer = ctx.createBuffer(2, floatData.length, 48000);
    audioBuffer.copyToChannel(floatData, 0);
    audioBuffer.copyToChannel(floatData, 1);
    
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    
    if (gainNodeRef.current) {
      source.connect(gainNodeRef.current);
    } else {
      source.connect(ctx.destination);
    }
    
    const currentTime = ctx.currentTime;
    if (nextStartTimeRef.current < currentTime) {
      nextStartTimeRef.current = currentTime + 0.1;
    }
    
    source.start(nextStartTimeRef.current);
    nextStartTimeRef.current += audioBuffer.duration;
    
    activeSourcesRef.current.push(source);
    
    source.onended = () => {
      const index = activeSourcesRef.current.indexOf(source);
      if (index > -1) {
        activeSourcesRef.current.splice(index, 1);
      }
    };
  };

  const togglePlayPause = useCallback(() => {
    const willPause = isPlayingRef.current;
    isPlayingRef.current = !isPlayingRef.current;
    setIsPlaying(isPlayingRef.current);
    
    if (!willPause) {
      const ctx = initAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      if (gainNodeRef.current) {
        gainNodeRef.current.gain.cancelScheduledValues(ctx.currentTime);
        gainNodeRef.current.gain.setValueAtTime(0, ctx.currentTime);
        gainNodeRef.current.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.1);
      }
    }
    
    if (willPause && audioContextRef.current && gainNodeRef.current) {
      const ctx = audioContextRef.current;
      gainNodeRef.current.gain.cancelScheduledValues(ctx.currentTime);
      gainNodeRef.current.gain.setValueAtTime(1, ctx.currentTime);
      gainNodeRef.current.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.05);
      
      activeSourcesRef.current.forEach(source => {
        try {
          source.stop();
        } catch (e) {}
      });
      activeSourcesRef.current = [];
      nextStartTimeRef.current = 0;
      
      gainNodeRef.current.disconnect();
      gainNodeRef.current = ctx.createGain();
      gainNodeRef.current.gain.setValueAtTime(0, ctx.currentTime);
      gainNodeRef.current.connect(ctx.destination);
    }
  }, []);

  // Start streaming function
  const startStreaming = async (prompt: string, seed: number, style: string, duration: number, bpm: number) => {
    console.log('startStreaming called with seed:', seed);
    
    // Abort any previous stream request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Clear all previous audio state before starting new stream
    if (audioContextRef.current) {
      activeSourcesRef.current.forEach(source => {
        try {
          source.stop();
        } catch (e) {}
      });
      activeSourcesRef.current = [];
      
      if (gainNodeRef.current) {
        gainNodeRef.current.disconnect();
      }
      audioContextRef.current.close();
      audioContextRef.current = null;
      gainNodeRef.current = null;
    }
    
    // Create new AbortController for this stream
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    nextStartTimeRef.current = 0;
    setIsStreaming(true);
    setIsPlaying(true);
    isPlayingRef.current = true;

    try {
      console.log('Fetching stream...');
      const response = await fetch('/api/generate-music/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, seed, style, duration, bpm }),
        signal: abortController.signal
      });

      console.log('Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', errorText);
        throw new Error(`Failed to start stream: ${response.status} ${response.statusText}`);
      }
      
      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let hasReceivedInit = false;

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('Stream reading done, hasReceivedInit:', hasReceivedInit);
          break;
        }
        
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        
        // Parse SSE format: each event ends with double newline
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';
        
        for (const event of events) {
          if (!event.trim()) continue;
          
          const lines = event.split('\n');
          let eventType = '';
          let eventData = '';
          
          for (const line of lines) {
            if (line.startsWith('event:')) {
              eventType = line.slice(6).trim();
            } else if (line.startsWith('data:')) {
              eventData = line.slice(5).trim();
            }
          }
          
          console.log('Received event:', eventType, 'data length:', eventData.length);
          
          if (eventType && eventData) {
            try {
              const parsed = JSON.parse(eventData);
              
              if (eventType === 'init') {
                hasReceivedInit = true;
                console.log('Stream init received, setting generatedData, seed:', parsed.seed);
                setGeneratedData({
                  seed: parsed.seed,
                  title: `MeloSeed #${parsed.seed}`,
                  description: '',
                  tags: [],
                  mood: 'unknown',
                  genre: 'unknown',
                  coverUrl: null,
                  styleMix: parsed.styleMix,
                  seedHash: parsed.seedHash
                });
                console.log('generatedData set successfully');
                
                // Start background title/cover generation
                if (parsed.styleMix && parsed.styleMix.length > 0) {
                  Promise.all([
                    fetch('/api/generate-title', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ styleMix: parsed.styleMix })
                    }).then(res => res.json()).catch(console.error),
                    
                    fetch('/api/generate-cover-gemini', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        title: `MeloSeed #${parsed.seed}`,
                        description: '',
                        tags: [],
                        mood: 'unknown',
                        genre: 'unknown'
                      })
                    }).then(res => res.json()).catch(console.error)
                  ]).then(([titleData, coverData]) => {
                    setGeneratedData(prev => prev ? {
                      ...prev,
                      title: titleData?.title || prev.title,
                      description: titleData?.description || '',
                      tags: titleData?.tags || [],
                      mood: titleData?.mood || 'unknown',
                      genre: titleData?.genre || 'unknown',
                      coverUrl: coverData?.coverUrl || null
                    } : null);
                  }).catch(err => {
                    console.error('Background generation error:', err);
                  });
                }
              } else if (eventType === 'chunk') {
                if (parsed.audio) {
                  playChunk(parsed.audio);
                }
              } else if (eventType === 'playing') {
                console.log('Music started playing');
              } else if (eventType === 'complete') {
                console.log('Stream complete');
              } else if (eventType === 'error') {
                console.error('Stream error:', parsed.error);
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }
      }
      
      setIsStreaming(false);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('Stream aborted');
      } else {
        console.error('Stream error:', err);
      }
      setIsStreaming(false);
    } finally {
      abortControllerRef.current = null;
    }
  };

  const stopAllAudio = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    isPlayingRef.current = false;
    setIsPlaying(false);
    
    if (audioContextRef.current && gainNodeRef.current) {
      gainNodeRef.current.gain.cancelScheduledValues(audioContextRef.current.currentTime);
      gainNodeRef.current.gain.setValueAtTime(0, audioContextRef.current.currentTime);
    }
    
    activeSourcesRef.current.forEach(source => {
      try {
        source.stop();
      } catch (e) {}
    });
    activeSourcesRef.current = [];
    nextStartTimeRef.current = 0;
    
    if (audioContextRef.current) {
      if (gainNodeRef.current) {
        gainNodeRef.current.disconnect();
      }
      audioContextRef.current.close();
      audioContextRef.current = null;
      gainNodeRef.current = null;
    }
  }, []);

  const resetState = useCallback(() => {
    stopAllAudio();
    setIsStreaming(false);
    setGeneratedData(null);
    setCoverUrl(null);
    setTitle('');
    setDescription('');
  }, [stopAllAudio]);

  // Handle restart - stop streaming and reset
  const handleRestart = () => {
    resetState();
  };

  // Effect: Handle view changes - reset when leaving create view
  useEffect(() => {
    if (view !== 'create') {
      resetState();
    }
  }, [view, resetState]);

  // Effect: Set metadata when new music is generated
  useEffect(() => {
    if (generatedData) {
      setTitle(generatedData.title);
      setDescription(generatedData.description);
      setCoverUrl(generatedData.coverUrl);
    }
  }, [generatedData]);

  // Effect: Handle Mint Errors
  useEffect(() => {
    if (error) {
      console.error("Mint Error:", error);
      showToast(error.message.substring(0, 100) + '...', 'error');
    }
  }, [error, showToast]);

  // Effect: Handle Mint Success
  useEffect(() => {
    if (isSuccess) {
      showToast('NFT Minted Successfully!', 'success');
      resetState();
      setTimeout(() => {
          refetchCollection();
          setView('collection');
      }, 2000);
    }
  }, [isSuccess, showToast, refetchCollection, resetState]);

  // Handle Mint - returns empty blob for audio since it's streaming
  const handleMint = async () => {
    if (!generatedData) return;
    
    if (!isConnected || !address) {
        showToast("Please connect your wallet to mint.", "error");
        return;
    }

    if (!coverUrl) {
        showToast("Cover image is not ready yet. Please wait...", "error");
        return;
    }
    
    setIsUploading(true);
    try {
        let imageURI = "";
        const coverRes = await fetch(coverUrl);
        const coverBlob = await coverRes.blob();
        imageURI = await uploadFileToIPFS(coverBlob);

        const metadata = {
            name: title,
            description: description, 
            image: imageURI,
            animation_url: "",
            attributes: [
                { trait_type: "Seed", value: generatedData.seed.toString() },
                { trait_type: "SeedHash", value: generatedData.seedHash || '' },
                { trait_type: "Mood", value: generatedData.mood },
                { trait_type: "Genre", value: generatedData.genre },
                { trait_type: "Tags", value: generatedData.tags.join(', ') },
                { trait_type: "StyleMix", value: (generatedData.styleMix || []).map(s => `${s.name}:${Math.round(s.weight*100)}%`).join('; ') }
            ]
        };
        const tokenURI = await uploadJSONToIPFS(metadata);

        writeContract({
            address: CONTRACT_ADDRESS,
            abi: MELO_SEED_ABI,
            functionName: 'mint',
            args: [address, BigInt(1), tokenURI, "0x"],
        });
    } catch (e) {
        console.error(e);
        showToast("Upload failed: " + (e as Error).message, 'error');
    } finally {
        setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen pb-20 pt-24 px-4 relative overflow-x-hidden flex flex-col">
        <BackgroundVisualizer 
          audioContextRef={audioContextRef}
          isPlaying={isPlaying && isStreaming}
          styleMix={generatedData?.styleMix}
        />
        <Header currentView={view} setView={setView} />
        
        <main className="container max-w-6xl mx-auto flex-1 flex flex-col justify-center">
            
            {/* VIEW: CREATE */}
            {view === 'create' && (
                <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                    
                    {!generatedData ? (
                        /* State 0: Generator Input */
                        <div className="flex flex-col items-center justify-center min-h-[60vh]">
                            <Generator onGenerate={startStreaming} />
                        </div>
                    ) : (
                        /* State 1: Preview & Mint */
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start mt-8">
                            {/* Left: Streaming Player */}
                            <div className="order-1 lg:col-start-1 lg:row-start-1 w-full">
                                {generatedData && (
                                    <StreamingPlayer 
                                        audioBase64={generatedData.audioBase64}
                                        coverUrl={coverUrl}
                                        title={title || `MeloSeed #${generatedData.seed}`}
                                        description={description}
                                        seed={generatedData.seed}
                                        seedHash={generatedData.seedHash}
                                        styleMix={generatedData.styleMix}
                                        onRestart={handleRestart}
                                        className="sticky top-24"
                                        isStreaming={isStreaming}
                                        isPlaying={isPlaying}
                                        onPlayPause={togglePlayPause}
                                    />
                                )}
                            </div>

                            {/* Right: Mint Form */}
                            <div className="order-2 lg:col-start-2 lg:row-start-1 w-full h-full">
                                <MintingCard 
                                    onMint={handleMint}
                                    isPending={isPending}
                                    isUploading={isUploading}
                                    title={title}
                                    setTitle={setTitle}
                                    description={description}
                                    setDescription={setDescription}
                                    onRegenerate={handleRestart}
                                    isAssetsReady={!!coverUrl}
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* VIEW: COLLECTION */}
            {view === 'collection' && (
                <div className="animate-in fade-in zoom-in-95 duration-500">
                    <div className="text-center mb-12 space-y-2">
                        <h2 className="text-3xl font-bold tracking-tight">Your Sonic Garden</h2>
                        <p className="text-muted-foreground">
                            {isCollectionLoading ? "Syncing with blockchain..." : 
                             isConnected ? `You have harvested ${tokenIds.length} unique seeds.` : "Connect wallet to view your garden."}
                        </p>
                    </div>
                    
                    {isConnected ? (
                        <div className="flex justify-center">
                            <NFTPlayer 
                                collectionIds={tokenIds} 
                                onBurn={() => {
                                    setTimeout(() => refetchCollection(), 2000);
                                }}
                            />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 gap-6 opacity-80">
                            <p className="text-xl font-medium">Please connect your wallet to enter the garden</p>
                            <ConnectButton.Custom>
                                {({ openConnectModal, mounted }) => {
                                  if (!mounted) return null;
                                  return (
                                    <button
                                      onClick={openConnectModal}
                                      className="
                                        relative px-8 py-3 rounded-full text-base font-bold text-white
                                        bg-gradient-to-r from-primary to-purple-500
                                        shadow-lg shadow-primary/20
                                        hover:shadow-primary/40 hover:scale-105 transition-all duration-300
                                      "
                                    >
                                      Connect Wallet
                                    </button>
                                  );
                                }}
                            </ConnectButton.Custom>
                        </div>
                    )}
                </div>
            )}

        </main>
    </div>
  );
}
