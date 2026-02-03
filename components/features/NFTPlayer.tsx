'use client';

import { useState, useEffect } from 'react';
import { useConfig, useWriteContract, useAccount } from 'wagmi';
import { readContract } from 'wagmi/actions';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlayCircle, Search, Disc, AlertCircle, Flame, ChevronDown, RefreshCw, Save, Music } from 'lucide-react';
import { useToast } from '@/components/Toast';
import * as Popover from '@radix-ui/react-popover';
import { CONTRACT_ADDRESS, MELO_SEED_ABI } from '@/lib/constants';
import { resolveIpfsUrl } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface NFTPlayerProps {
    // Collection Mode Props
    collectionIds?: bigint[];
    
    // Preview Mode Props
    previewData?: {
        audioSrc: string;
        coverImage: string | null;
        title: string;
        description: string;
        seed: number;
    } | null;
    
    // Actions
    onBurn?: () => void; // Optional override
    className?: string;
}

/**
 * Universal NFT Player Component
 * Handles both "On-Chain Playback" and "Generation Preview"
 */
export function NFTPlayer({ collectionIds = [], previewData, className }: NFTPlayerProps) {
  const config = useConfig();
  const { address } = useAccount();
  
  // Mode: 'preview' if previewData is provided, otherwise 'collection'
  const isPreview = !!previewData;

  // State
  const [tokenId, setTokenId] = useState<string>('');
  const [queryState, setQueryState] = useState<{ id: bigint | null, attempts: number }>({ id: null, attempts: 0 });
  const [displayError, setDisplayError] = useState<string | null>(null);
  const [openCombobox, setOpenCombobox] = useState(false);
  
  // Contract Write (Burn)
  const { writeContract, isPending: isBurning, isSuccess: isBurnSuccess, error: burnError } = useWriteContract();
  const { showToast } = useToast();

  useEffect(() => {
    if (isBurnSuccess) showToast("NFT Burned Successfully!", "success");
    if (burnError) showToast("Failed to burn NFT: " + burnError.message, "error");
  }, [isBurnSuccess, burnError, showToast]);

  // --- Collection Logic ---
  const fetchTokenURI = async (id: bigint, attempt: number) => {
    const timeoutDuration = attempt < 2 ? 5000 : 60000; 
    const fetchPromise = readContract(config, {
        address: CONTRACT_ADDRESS,
        abi: MELO_SEED_ABI,
        functionName: 'uri', 
        args: [id],
    });
    const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), timeoutDuration);
    });

    const uri = await Promise.race([fetchPromise, timeoutPromise]);
    
    if (typeof uri === 'string' && (uri.startsWith('http') || uri.startsWith('ipfs://'))) {
        const fetchUrl = resolveIpfsUrl(uri);
        const res = await fetch(fetchUrl);
        if (!res.ok) throw new Error('Failed to fetch metadata');
        const json = await res.json();
        if (json.animation_url) json.animation_url = resolveIpfsUrl(json.animation_url);
        if (json.image) json.image = resolveIpfsUrl(json.image);
        return json;
    }
    return null;
  };

  const { data: metadata, isFetching, error } = useQuery({
    queryKey: ['uri', queryState.id?.toString(), queryState.attempts],
    queryFn: () => queryState.id === null ? null : fetchTokenURI(queryState.id, queryState.attempts),
    enabled: !isPreview && queryState.id !== null,
    retry: false,
  });

  const effectiveError = displayError || (error ? (error instanceof Error ? error.message : "Failed to load NFT") : null);

  const handleSearch = () => {
    if (tokenId === '') return;
    try {
        const id = BigInt(tokenId);
        if (queryState.id === id) setQueryState(prev => ({ ...prev, attempts: prev.attempts + 1 }));
        else setQueryState({ id, attempts: 0 });
        setDisplayError(null);
    } catch (e) { setDisplayError("Invalid Token ID"); }
  };

  const handleBurn = () => {
    if (queryState.id === null || !address) return;
    if (!confirm("Permanently destroy this NFT?")) return;
    writeContract({
        address: CONTRACT_ADDRESS,
        abi: MELO_SEED_ABI,
        functionName: 'burn',
        args: [address, queryState.id, BigInt(1)],
    });
  };

  // --- Derived Data ---
  const finalData = isPreview ? previewData : (metadata as any);
  const audioSrc = isPreview ? previewData?.audioSrc : finalData?.animation_url;
  const coverImage = isPreview ? previewData?.coverImage : finalData?.image;
  const title = isPreview ? previewData?.title : (finalData?.name || "Select an NFT");
  const desc = isPreview ? previewData?.description : finalData?.description;

  // Safe check for collection mode
  if (!isPreview && collectionIds.length > 0 && queryState.id === null && tokenId === '' && !queryState.id) {
     // Optional: Select first item automatically? Or just wait for user.
     // Current behavior: shows "Select an NFT" placeholder.
  }

  return (
    <div className={cn("w-full max-w-lg mx-auto transition-all duration-500", className)}>
      <div className="relative glass-card rounded-3xl overflow-hidden p-1">
        
        {/* Header Section (Collection Mode Only) */}
        {!isPreview && (
            <div className="p-6 pb-2">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold flex items-center gap-2 text-foreground/80">
                        <Disc className="w-5 h-5 text-primary" />
                        Sonic Garden
                    </h3>
                    <div className="flex items-center gap-2">
                         {/* Combobox */}
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
                                                    onClick={() => {
                                                        setTokenId(id.toString());
                                                        setOpenCombobox(false);
                                                        setQueryState({ id, attempts: 0 });
                                                    }}
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

                {/* Search Bar */}
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

        {/* Player Visualization Area */}
        <div className="relative aspect-square md:aspect-[4/3] w-full bg-gradient-to-br from-secondary/50 to-background rounded-[1.2rem] overflow-hidden group mt-2">
            
            {/* Cover Image */}
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

            {/* Glass Overlay (Always visible on mobile, hover on desktop) */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-100 flex flex-col justify-end p-6">
                
                {/* Text Info */}
                <div className="mb-4 transform translate-y-0 transition-transform duration-300 text-shadow-sm">
                    <h2 className="text-2xl font-bold text-white mb-1 drop-shadow-md" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{title}</h2>
                    <p className="text-white/90 text-sm line-clamp-2 font-medium" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>{desc}</p>
                    {finalData?.attributes && (
                        <div className="flex gap-2 mt-2">
                            {finalData.attributes.map((attr: any, i: number) => (
                                <span key={i} className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[10px] text-white border border-white/20 font-bold shadow-sm">
                                    {attr.trait_type}: {attr.value}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Controls */}
                <div className="space-y-3">
                    {audioSrc ? (
                        <div className="relative rounded-lg overflow-hidden bg-white/10 backdrop-blur-md border border-white/20 p-1">
                            <audio 
                                controls 
                                src={audioSrc} 
                                className="w-full h-8 opacity-80 hover:opacity-100 transition-opacity [&::-webkit-media-controls-panel]:bg-transparent [&::-webkit-media-controls-enclosure]:bg-transparent"
                            />
                        </div>
                    ) : (
                        <div className="h-10 flex items-center justify-center text-white/50 text-sm italic bg-white/5 rounded-lg backdrop-blur-sm border border-white/5">
                            {isFetching ? "Loading Audio..." : "No Audio Source"}
                        </div>
                    )}

                    {/* Actions (Burn) - Only in Collection Mode */}
                    {!isPreview && audioSrc && (
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
            
            {/* Loading Overlay */}
            {isFetching && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-white text-xs font-medium tracking-widest">LOADING</span>
                    </div>
                </div>
            )}
        </div>
        
        {/* Error Message */}
        {effectiveError && (
             <div className="p-4 bg-red-500/10 text-red-600 text-sm text-center font-medium border-t border-red-500/20">
                {effectiveError}
             </div>
        )}
      </div>
    </div>
  );
}
