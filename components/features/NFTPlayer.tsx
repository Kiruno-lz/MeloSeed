'use client';

import { useState, useEffect } from 'react';
import { useConfig, useWriteContract, useAccount } from 'wagmi';
import { readContract } from 'wagmi/actions';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlayCircle, Search, Disc, AlertCircle, Flame, ChevronDown } from 'lucide-react';
import { useToast } from '@/components/Toast';
import * as Popover from '@radix-ui/react-popover';
import { CONTRACT_ADDRESS, MELO_SEED_ABI } from '@/lib/constants';
import { resolveIpfsUrl } from '@/lib/utils';

interface NFTPlayerProps {
    collectionIds?: bigint[];
}

/**
 * NFTPlayer Component
 * 
 * Allows users to:
 * 1. Browse their owned NFTs (collectionIds).
 * 2. Manually search for any NFT by Token ID.
 * 3. Play the music associated with the NFT.
 * 4. Burn (destroy) the NFT.
 */
export function NFTPlayer({ collectionIds = [] }: NFTPlayerProps) {
  const config = useConfig();
  const { address } = useAccount();
  
  // State
  const [tokenId, setTokenId] = useState<string>('');
  const [queryState, setQueryState] = useState<{ id: bigint | null, attempts: number }>({ id: null, attempts: 0 });
  const [displayError, setDisplayError] = useState<string | null>(null);
  const [openCombobox, setOpenCombobox] = useState(false);
  
  // Contract Write (Burn)
  const { writeContract, isPending: isBurning, isSuccess: isBurnSuccess, error: burnError } = useWriteContract();
  const { showToast } = useToast();

  // Effect: Handle Burn Success/Error
  useEffect(() => {
    if (isBurnSuccess) {
        showToast("NFT Burned Successfully!", "success");
    }
    if (burnError) {
        showToast("Failed to burn NFT: " + burnError.message, "error");
    }
  }, [isBurnSuccess, burnError, showToast]);

  // Function: Fetch Token URI and Metadata
  const fetchTokenURI = async (id: bigint, attempt: number) => {
    // Timeout logic: 5s for first attempts, then 60s
    const timeoutDuration = attempt < 2 ? 5000 : 60000; 
    console.log(`Fetching Token ${id} (Attempt ${attempt + 1}), Timeout: ${timeoutDuration}ms`);

    const fetchPromise = readContract(config, {
        address: CONTRACT_ADDRESS,
        abi: MELO_SEED_ABI,
        functionName: 'uri', 
        args: [id],
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
            reject(new Error('Request timed out. The token might not exist or the network is congested.'));
        }, timeoutDuration);
    });

    const uri = await Promise.race([fetchPromise, timeoutPromise]);
    
    // Process URI (IPFS or HTTP)
    if (typeof uri === 'string' && (uri.startsWith('http') || uri.startsWith('ipfs://'))) {
        const fetchUrl = resolveIpfsUrl(uri);
        const res = await fetch(fetchUrl);
        if (!res.ok) throw new Error('Failed to fetch metadata from IPFS');
        const json = await res.json();
        
        // Resolve nested IPFS URLs
        if (json.animation_url) json.animation_url = resolveIpfsUrl(json.animation_url);
        if (json.image) json.image = resolveIpfsUrl(json.image);
        
        return json;
    }
    
    // Fallback for legacy base64 data URIs
    if (typeof uri === 'string' && uri.startsWith('data:')) {
         const base64Json = uri.split(',')[1];
         const jsonString = atob(base64Json);
         return JSON.parse(jsonString);
    }
    
    return null;
  };

  // Query: Fetch Metadata
  const { data: metadata, isFetching, error } = useQuery({
    queryKey: ['uri', queryState.id?.toString(), queryState.attempts],
    queryFn: () => {
        if (queryState.id === null) return null;
        return fetchTokenURI(queryState.id, queryState.attempts);
    },
    enabled: queryState.id !== null,
    retry: false,
  });

  const effectiveError = displayError || (error ? (error instanceof Error ? error.message : "Failed to load NFT") : null);

  // Handler: Search/Select ID
  const handleSearch = () => {
    if (tokenId === '') return;
    try {
        const id = BigInt(tokenId);
        
        // Force update if searching for the same ID (retry)
        if (queryState.id === id) {
             setQueryState(prev => ({ ...prev, attempts: prev.attempts + 1 }));
        } else {
             // Reset attempts for new ID
             setQueryState({ id, attempts: 0 });
        }
        setDisplayError(null);
    } catch (e) {
        setDisplayError("Invalid Token ID");
    }
  };

  // Handler: Burn NFT
  const handleBurn = () => {
    if (queryState.id === null || !address) return;
    if (!confirm("Are you sure you want to burn (destroy) this NFT? This action cannot be undone.")) return;

    writeContract({
        address: CONTRACT_ADDRESS,
        abi: MELO_SEED_ABI,
        functionName: 'burn',
        args: [address, queryState.id, BigInt(1)], // Burn 1 copy
    });
  };

  const nftData = metadata as any;
  const audioSrc = nftData?.animation_url;
  const coverImage = nftData?.image;

  return (
    <Card className="w-full max-w-md border-border/50 shadow-lg backdrop-blur-sm bg-card/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <Disc className="w-5 h-5" />
          Play On-Chain NFT
        </CardTitle>
        <CardDescription>
          Select from your collection or enter a Token ID manually.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Search / Select Control */}
        <div className="flex gap-2 relative">
            <div className="flex-1 relative">
                <Input
                    type="number"
                    placeholder="Token ID (e.g. 0)"
                    value={tokenId}
                    onChange={(e) => {
                        setTokenId(e.target.value);
                        if (displayError) setDisplayError(null);
                    }}
                    className="w-full pr-8"
                />
                
                {/* Dropdown Trigger for Collection */}
                <Popover.Root open={openCombobox} onOpenChange={setOpenCombobox}>
                    <Popover.Trigger asChild>
                        <button 
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground z-10"
                            onClick={(e) => {
                                e.stopPropagation();
                            }}
                            aria-label="Select from collection"
                        >
                            <ChevronDown className="w-4 h-4" />
                        </button>
                    </Popover.Trigger>
                    
                    <Popover.Portal>
                        <Popover.Content 
                            className="w-[var(--radix-popover-trigger-width)] min-w-[200px] p-1 bg-popover border rounded-md shadow-md z-50 max-h-[200px] overflow-y-auto animate-in fade-in zoom-in-95" 
                            align="end"
                            sideOffset={5}
                        >
                            <div className="text-xs font-semibold px-2 py-1.5 text-muted-foreground bg-muted/50 mb-1">
                                Your Collection ({collectionIds.length})
                            </div>
                            
                            {collectionIds.length === 0 ? (
                                <div className="text-sm text-center py-4 text-muted-foreground">
                                    No NFTs found. <br/>
                                    <span className="text-xs opacity-70">Mint one to see it here!</span>
                                </div>
                            ) : (
                                collectionIds.map(id => (
                                    <button
                                        key={id.toString()}
                                        className="w-full text-left px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground rounded-sm cursor-pointer transition-colors flex items-center justify-between group"
                                        onClick={() => {
                                            const idStr = id.toString();
                                            setTokenId(idStr);
                                            setOpenCombobox(false);
                                            setQueryState({ id, attempts: 0 });
                                            setDisplayError(null);
                                        }}
                                    >
                                        <span>Token #{id.toString()}</span>
                                        <PlayCircle className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </button>
                                ))
                            )}
                        </Popover.Content>
                    </Popover.Portal>
                </Popover.Root>
            </div>

          <Button
            onClick={handleSearch}
            disabled={isFetching}
            variant="secondary"
          >
            {isFetching ? <span className="animate-spin">⏳</span> : <Search className="w-4 h-4" />}
          </Button>
        </div>

        {effectiveError && (
          <div className="flex flex-col gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span className="font-semibold">Error Loading NFT</span>
            </div>
            <p className="opacity-90">{effectiveError}</p>
            {queryState.attempts < 2 && effectiveError.includes("timed out") && (
                <p className="text-xs opacity-75 italic">
                    Tip: Try clicking search again to extend the timeout.
                </p>
            )}
          </div>
        )}

        {nftData && audioSrc && (
          <div className="flex flex-col gap-3 mt-4 p-4 bg-muted/50 rounded-xl animate-in fade-in zoom-in-95 relative overflow-hidden group">
             {/* Cover Background Blur */}
             {coverImage && (
                 <div className="absolute inset-0 z-0 opacity-10 blur-xl">
                     <img src={coverImage} alt="bg" className="w-full h-full object-cover" />
                 </div>
             )}
             
             <div className="relative z-10 flex items-start justify-between">
                <div className="flex items-center gap-3">
                    {coverImage ? (
                        <img src={coverImage} alt="Cover" className="w-16 h-16 rounded-md object-cover shadow-sm" />
                    ) : (
                        <div className="w-16 h-16 bg-primary/20 rounded-md flex items-center justify-center">
                            <Disc className="w-8 h-8 text-primary/50" />
                        </div>
                    )}
                    <div>
                        <h4 className="font-bold text-foreground text-lg">{nftData.name || "Untitled"}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-1">{nftData.description}</p>
                        <span className="text-[10px] text-muted-foreground bg-background/80 px-2 py-0.5 rounded-full border mt-1 inline-block">
                            Seed: {nftData.attributes?.[0]?.value}
                        </span>
                    </div>
                </div>
             </div>
             
            <audio controls src={audioSrc} className="w-full mt-2 rounded-lg relative z-10" />

            <div className="pt-2 border-t border-border/20 flex justify-end relative z-10">
                 <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={handleBurn}
                    disabled={isBurning}
                    className="flex items-center gap-1.5 h-8 text-xs opacity-80 hover:opacity-100 transition-opacity"
                 >
                    {isBurning ? <span className="animate-spin">⏳</span> : <Flame className="w-3 h-3" />}
                    Burn (Destroy)
                 </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
