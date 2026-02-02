'use client';

import { useState, useEffect } from 'react';
import { useConfig, useWriteContract, useAccount } from 'wagmi';
import { readContract } from 'wagmi/actions';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlayCircle, Search, Disc, AlertCircle, Flame, Trash2 } from 'lucide-react';
import { useToast } from '@/components/Toast';

// Contract address - make sure this matches page.tsx
const CONTRACT_ADDRESS = '0x9EfB4ecDE9dafe50f8B9a04ADDA75B6C93Fc4c69';

const MELO_SEED_ABI = [
  {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'uri', // ERC1155 uses 'uri', not 'tokenURI'
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
        { internalType: 'address', name: 'account', type: 'address' },
        { internalType: 'uint256', name: 'id', type: 'uint256' },
        { internalType: 'uint256', name: 'value', type: 'uint256' }
    ],
    name: 'burn',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  }
] as const;

export function NFTPlayer() {
  const config = useConfig();
  const { address } = useAccount();
  const [tokenId, setTokenId] = useState<string>('');
  const [queryState, setQueryState] = useState<{ id: bigint | null, attempts: number }>({ id: null, attempts: 0 });
  const [displayError, setDisplayError] = useState<string | null>(null);
  
  const { writeContract, isPending: isBurning, isSuccess: isBurnSuccess, error: burnError } = useWriteContract();
  const { showToast } = useToast();

  useEffect(() => {
    if (isBurnSuccess) {
        showToast("NFT Burned Successfully!", "success");
        // Optional: Clear the view
        // setQueryState({ id: null, attempts: 0 });
    }
    if (burnError) {
        showToast("Failed to burn NFT: " + burnError.message, "error");
    }
  }, [isBurnSuccess, burnError, showToast]);

  // Custom fetcher with timeout logic
  const fetchTokenURI = async (id: bigint, attempt: number) => {
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
    
    // Now fetch the metadata from IPFS if it's a URL
    if (typeof uri === 'string' && (uri.startsWith('http') || uri.startsWith('ipfs://'))) {
        let fetchUrl = uri;
        if (uri.startsWith('ipfs://')) {
            fetchUrl = uri.replace('ipfs://', 'https://ipfs.io/ipfs/');
        }
        const res = await fetch(fetchUrl);
        if (!res.ok) throw new Error('Failed to fetch metadata from IPFS');
        const json = await res.json();
        
        // Process IPFS URLs in metadata
        if (json.animation_url?.startsWith('ipfs://')) {
            json.animation_url = json.animation_url.replace('ipfs://', 'https://ipfs.io/ipfs/');
        }
        if (json.image?.startsWith('ipfs://')) {
            json.image = json.image.replace('ipfs://', 'https://ipfs.io/ipfs/');
        }
        return json; // Return the parsed JSON object
    }
    
    // Fallback for base64 data URIs (old legacy)
    if (typeof uri === 'string' && uri.startsWith('data:')) {
         const base64Json = uri.split(',')[1];
         const jsonString = atob(base64Json);
         return JSON.parse(jsonString);
    }
    
    return null;
  };

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

  const handleSearch = () => {
    if (tokenId === '') return;
    try {
        const id = BigInt(tokenId);
        if (queryState.id === id) {
             setQueryState(prev => ({ ...prev, attempts: prev.attempts + 1 }));
        } else {
             setQueryState({ id, attempts: 0 });
        }
        setDisplayError(null);
    } catch (e) {
        setDisplayError("Invalid Token ID");
    }
  };

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

  // Removed manual tokenURI parsing logic since it is now in fetchTokenURI
  // let audioSrc = null;
  // let metadata = null;
  // let coverImage = null;
  // The useQuery 'data' is now the parsed metadata object
  const nftData = metadata as any; // Quick fix for type
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
          Enter a Token ID to load and play music directly from the blockchain.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="Token ID (e.g. 0)"
            value={tokenId}
            onChange={(e) => {
                setTokenId(e.target.value);
                if (displayError) setDisplayError(null);
            }}
            className="flex-1"
          />
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
