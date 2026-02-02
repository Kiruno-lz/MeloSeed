'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useReadContract } from 'wagmi';
import { Generator } from '@/components/Generator';
import { NFTPlayer } from '@/components/NFTPlayer';
import { useToast } from '@/components/Toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Music, Wallet, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';

const CONTRACT_ADDRESS = '0x721Be852Eaa529daFe9845eC1B8e150Df1aBBe95';

const MELO_SEED_ABI = [
  {
    inputs: [
      { internalType: 'uint256', name: 'seed', type: 'uint256' },
      { internalType: 'string', name: '_audioBase64', type: 'string' },
    ],
    name: 'mint',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  }
] as const;

export default function Home() {
  const { address, isConnected } = useAccount();
  const [generatedData, setGeneratedData] = useState<{ seed: number; audioBase64: string } | null>(null);
  const { writeContract, isPending, error, isSuccess } = useWriteContract();
  const { showToast } = useToast();

  // Check if user has NFTs
  const { data: balance } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: MELO_SEED_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
        enabled: !!address,
    }
  });

  const hasNFTs = balance ? Number(balance) > 0 : false;

  useEffect(() => {
    if (error) {
      console.error("Mint Error:", error);
      const msg = error.message.length > 100 ? error.message.substring(0, 100) + '...' : error.message;
      showToast(msg, 'error');
    }
  }, [error, showToast]);

  useEffect(() => {
    if (isSuccess) {
      showToast('NFT Minted Successfully!', 'success');
      setGeneratedData(null); // Reset after success
    }
  }, [isSuccess, showToast]);

  const handleMint = () => {
    if (!generatedData) return;

    const sizeInBytes = (generatedData.audioBase64.length * 3) / 4;
    const sizeInKB = sizeInBytes / 1024;
    
    if (sizeInKB > 90) {
      showToast(`Audio file too large (${sizeInKB.toFixed(2)} KB). Limit ~90KB.`, 'error');
      return;
    }

    writeContract({
      address: CONTRACT_ADDRESS,
      abi: MELO_SEED_ABI,
      functionName: 'mint',
      args: [BigInt(generatedData.seed), generatedData.audioBase64],
    });
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
        <div className="relative">
          <div className="absolute -inset-4 bg-primary/20 rounded-full blur-xl animate-pulse"></div>
          <Music className="w-24 h-24 text-primary relative z-10" />
        </div>
        <div className="space-y-4 max-w-lg">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight lg:text-7xl bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple-500 to-pink-500">
            MeloSeed
          </h1>
          <p className="text-xl text-muted-foreground">
            Generate unique AI melodies and mint them as permanent on-chain NFTs on Monad.
          </p>
        </div>
        
        <div className="p-1 bg-gradient-to-r from-primary/50 to-purple-500/50 rounded-full">
             <ConnectButton />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 w-full max-w-4xl text-left">
            {[
                { title: "AI Generation", desc: "Create unique chiptune/lo-fi melodies from random seeds." },
                { title: "On-Chain Storage", desc: "Music is stored 100% on the blockchain, not IPFS." },
                { title: "NFT Ownership", desc: "Trade and collect your generated musical seeds." }
            ].map((feature, i) => (
                <Card key={i} className="bg-card/50 border-border/50 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-lg">{feature.title}</CardTitle>
                        <CardDescription>{feature.desc}</CardDescription>
                    </CardHeader>
                </Card>
            ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
      
      {/* Header / Status */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Studio</h2>
        <p className="text-muted-foreground">
            Create, Mint, and Listen
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-5xl items-start">
        {/* Left Column: Generator */}
        <div className="flex flex-col gap-6 items-center lg:items-end w-full">
            <Generator onGenerated={setGeneratedData} />
        </div>

        {/* Right Column: Preview & Mint OR Placeholder */}
        <div className="flex flex-col gap-6 items-center lg:items-start w-full">
            {generatedData ? (
                <Card className="w-full max-w-md border-primary/50 shadow-xl shadow-primary/10 animate-in fade-in slide-in-from-left-4">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                            Ready to Mint
                        </CardTitle>
                        <CardDescription>
                            Your melody is ready. Preview it and mint it to the blockchain.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="bg-muted p-4 rounded-xl text-center">
                            <audio controls src={`data:audio/mp3;base64,${generatedData.audioBase64}`} className="w-full" />
                            <p className="text-xs text-muted-foreground mt-2">
                                Size: {((generatedData.audioBase64.length * 3) / 4 / 1024).toFixed(2)} KB
                            </p>
                        </div>
                        <Button 
                            onClick={handleMint} 
                            disabled={isPending} 
                            className="w-full" 
                            size="lg"
                        >
                            {isPending ? (
                                <>Processing Transaction...</>
                            ) : (
                                <>Mint NFT (On-Chain)</>
                            )}
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="hidden lg:flex w-full h-full min-h-[300px] items-center justify-center border-2 border-dashed border-border/50 rounded-3xl p-8 text-muted-foreground bg-card/30">
                    <div className="text-center space-y-2">
                        <ArrowRight className="w-8 h-8 mx-auto opacity-50" />
                        <p>Generate music to enable minting</p>
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* Collection Section - Only visible if user owns NFTs as per requirements */}
      {hasNFTs && (
        <div className="w-full max-w-2xl mt-12 pt-12 border-t border-border/50 animate-in fade-in">
             <div className="flex flex-col items-center gap-6">
                <div className="text-center space-y-1">
                    <h3 className="text-2xl font-bold">Your Collection</h3>
                    <p className="text-sm text-muted-foreground">You own {String(balance)} MeloSeed NFTs. Play them below.</p>
                </div>
                <NFTPlayer />
             </div>
        </div>
      )}
    </div>
  );
}
