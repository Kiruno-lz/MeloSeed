'use client';

import { useState } from 'react';
import { useConfig } from 'wagmi';
import { readContract } from 'wagmi/actions';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlayCircle, Search, Disc, AlertCircle } from 'lucide-react';

const CONTRACT_ADDRESS = '0x721Be852Eaa529daFe9845eC1B8e150Df1aBBe95';

const MELO_SEED_ABI = [
  {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'tokenURI',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export function NFTPlayer() {
  const config = useConfig();
  const [tokenId, setTokenId] = useState<string>('');
  // We need to trigger the query with a specific ID and track attempts
  const [queryState, setQueryState] = useState<{ id: bigint | null, attempts: number }>({ id: null, attempts: 0 });
  const [displayError, setDisplayError] = useState<string | null>(null);

  // Custom fetcher with timeout logic
  const fetchTokenURI = async (id: bigint, attempt: number) => {
    // Timeout logic:
    // Attempts 0 & 1 (1st and 2nd try): Short timeout (e.g., 5 seconds)
    // Attempts >= 2 (3rd try+): Longer/Default timeout (let network decide, or e.g. 30s)
    
    const timeoutDuration = attempt < 2 ? 5000 : 60000; 
    console.log(`Fetching Token ${id} (Attempt ${attempt + 1}), Timeout: ${timeoutDuration}ms`);

    const fetchPromise = readContract(config, {
        address: CONTRACT_ADDRESS,
        abi: MELO_SEED_ABI,
        functionName: 'tokenURI',
        args: [id],
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
            reject(new Error('Request timed out. The token might not exist or the network is congested.'));
        }, timeoutDuration);
    });

    return Promise.race([fetchPromise, timeoutPromise]);
  };

  const { data: tokenURI, isFetching, error } = useQuery({
    queryKey: ['tokenURI', queryState.id?.toString(), queryState.attempts], // Include attempts in key to force re-fetch on retry
    queryFn: () => {
        if (queryState.id === null) return null;
        return fetchTokenURI(queryState.id, queryState.attempts);
    },
    enabled: queryState.id !== null,
    retry: false, // We handle retries manually via UI
  });

  const handleSearch = () => {
    if (tokenId === '') return;
    try {
        const id = BigInt(tokenId);
        // If searching for the same ID, increment attempts
        // If new ID, reset attempts to 0
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

  let audioSrc = null;
  let metadata = null;

  if (tokenURI && typeof tokenURI === 'string') {
    try {
      // tokenURI is "data:application/json;base64,eyJ..."
      const base64Json = tokenURI.split(',')[1];
      const jsonString = atob(base64Json);
      metadata = JSON.parse(jsonString);
      // animation_url is "data:audio/mp3;base64,..."
      audioSrc = metadata.animation_url;
    } catch (e) {
      console.error("Failed to parse tokenURI", e);
    }
  }

  // Effect to update display error when query fails
  if (error && !displayError) {
      // We don't set state during render, but we can derive it or useEffect
      // Simplified: Just render error directly below
  }

  const effectiveError = displayError || (error ? (error instanceof Error ? error.message : "Failed to load NFT") : null);

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
                // Optional: Reset error on input change
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

        {metadata && audioSrc && (
          <div className="flex flex-col gap-3 mt-4 p-4 bg-muted/50 rounded-xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
                <span className="font-bold text-foreground">{metadata.name}</span>
                <span className="text-xs text-muted-foreground bg-background px-2 py-1 rounded-full border">
                    Seed: {metadata.attributes?.[0]?.value}
                </span>
            </div>
            <audio controls src={audioSrc} className="w-full mt-2 rounded-lg" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
