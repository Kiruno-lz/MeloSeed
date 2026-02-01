
'use client';

import { useState } from 'react';
import { useReadContract } from 'wagmi';

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
  const [tokenId, setTokenId] = useState<string>('');
  const [queryId, setQueryId] = useState<bigint | null>(null);

  const { data: tokenURI, isError, isLoading, error } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: MELO_SEED_ABI,
    functionName: 'tokenURI',
    args: queryId !== null ? [queryId] : undefined,
    query: {
      enabled: queryId !== null,
    }
  });

  const handleSearch = () => {
    if (tokenId === '') return;
    try {
        const id = BigInt(tokenId);
        setQueryId(id);
    } catch (e) {
        alert("Invalid Token ID");
    }
  };

  let audioSrc = null;
  let metadata = null;

  if (tokenURI) {
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

  return (
    <div className="w-full max-w-md p-6 bg-white/5 rounded-xl border border-white/10 flex flex-col gap-4">
      <h3 className="text-lg font-bold">Play On-Chain NFT</h3>
      
      <div className="flex gap-2">
        <input
          type="number"
          placeholder="Token ID (e.g. 0)"
          value={tokenId}
          onChange={(e) => setTokenId(e.target.value)}
          className="flex-1 p-2 bg-black/20 border border-white/10 rounded-lg text-white"
        />
        <button
          onClick={handleSearch}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold text-white transition-colors"
        >
          Load
        </button>
      </div>

      {isLoading && <p className="text-sm text-gray-400">Loading from blockchain...</p>}
      
      {isError && (
        <p className="text-sm text-red-400">
          Error: Token not found or invalid ID.
        </p>
      )}

      {metadata && audioSrc && (
        <div className="flex flex-col gap-2 mt-2 animate-in fade-in">
          <p className="text-sm font-bold">{metadata.name}</p>
          <p className="text-xs text-gray-400">Seed: {metadata.attributes?.[0]?.value}</p>
          <audio controls src={audioSrc} className="w-full mt-2" />
        </div>
      )}
    </div>
  );
}
