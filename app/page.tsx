'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useState, useEffect } from 'react';
import { useAccount, useWriteContract } from 'wagmi';
import { Generator } from '@/components/Generator';
import { NFTPlayer } from '@/components/NFTPlayer';
import { useToast } from '@/components/Toast';

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
] as const;

export default function Home() {
  const { isConnected } = useAccount();
  const [generatedData, setGeneratedData] = useState<{ seed: number; audioBase64: string } | null>(null);
  const { writeContract, isPending, error, isSuccess } = useWriteContract();
  const { showToast } = useToast();

  useEffect(() => {
    if (error) {
      console.error("Mint Error:", error);
      // Extract short error message if possible, otherwise use full message but truncated for UI
      const msg = error.message.length > 100 ? error.message.substring(0, 100) + '...' : error.message;
      showToast(msg, 'error');
    }
  }, [error, showToast]);

  useEffect(() => {
    if (isSuccess) {
      showToast('NFT Minted Successfully!', 'success');
    }
  }, [isSuccess, showToast]);

  const handleMint = () => {
    if (!generatedData) return;

    // Check payload size (approximate)
    const sizeInBytes = (generatedData.audioBase64.length * 3) / 4;
    const sizeInKB = sizeInBytes / 1024;
    console.log(`Payload size: ${sizeInKB.toFixed(2)} KB`);

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

  return (
    <main className="min-h-screen flex flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
        <p className="fixed left-0 top-0 flex w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto  lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30">
          MeloSeed - On-Chain AI Music
        </p>
        <div className="fixed bottom-0 left-0 flex h-48 w-full items-end justify-center bg-gradient-to-t from-white via-white dark:from-black dark:via-black lg:static lg:h-auto lg:w-auto lg:bg-none">
          <ConnectButton />
        </div>
      </div>

      <div className="flex flex-col items-center gap-8 mt-10">
        {!isConnected ? (
          <div className="text-center p-10">
            <h1 className="text-4xl font-bold mb-4">Connect Wallet to Start</h1>
            <p className="text-gray-400">Generate unique AI melodies and mint them on Monad.</p>
          </div>
        ) : (
          <>
            <Generator onGenerated={setGeneratedData} />

            {generatedData && (
              <div className="w-full max-w-md p-6 bg-white/5 rounded-xl border border-white/10 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4">
                <h3 className="text-lg font-bold">Preview & Mint</h3>
                <div className="text-xs text-gray-400">
                  Size: {((generatedData.audioBase64.length * 3) / 4 / 1024).toFixed(2)} KB
                </div>
                <audio
                  controls
                  src={`data:audio/mp3;base64,${generatedData.audioBase64}`}
                  className="w-full"
                />
                
                <button
                  onClick={handleMint}
                  disabled={isPending}
                  className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg font-bold text-white transition-colors"
                >
                  {isPending ? 'Minting...' : 'Mint NFT (On-Chain Storage)'}
                </button>
              </div>
            )}
            
            <div className="w-full border-t border-white/10 my-8"></div>
            
            <NFTPlayer />
          </>
        )}
      </div>

      <div className="mb-32 grid text-center lg:max-w-5xl lg:w-full lg:mb-0 lg:grid-cols-4 lg:text-left">
        {/* Footer content */}
      </div>
    </main>
  );
}
