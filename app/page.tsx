'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract } from 'wagmi';
import { Header } from '@/components/Header';
import { Generator } from '@/components/features/Generator';
import { StreamingPlayer } from '@/components/features/StreamingPlayer';
import { MintingCard } from '@/components/features/MintingCard';
import { useToast } from '@/components/Toast';
import { uploadFileToIPFS, uploadJSONToIPFS } from '@/lib/ipfs-client';
import { useMyCollection } from '@/lib/hooks/useMyCollection';
import { CONTRACT_ADDRESS, MELO_SEED_ABI } from '@/lib/constants';
import { ConnectButton } from '@rainbow-me/rainbowkit';

interface CompleteMusicData {
  seed: number;
  audioBase64: string;
  title: string;
  description: string;
  tags: string[];
  mood: string;
  genre: string;
  coverUrl: string | null;
  styleMix?: { name: string; weight: number; color: string }[];
  seedHash?: string;
}

interface MusicOnlyData {
  seed: number;
  audioBase64: string;
  styleMix?: { name: string; weight: number; color: string }[];
  seedHash?: string;
}

export default function Home() {
  const { address, isConnected } = useAccount();
  const [view, setView] = useState<'create' | 'collection'>('create');
  
  // Generation State
  const [generatedData, setGeneratedData] = useState<CompleteMusicData | null>(null);
  const [musicData, setMusicData] = useState<MusicOnlyData | null>(null);
  const [shouldAutoPlay, setShouldAutoPlay] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const { writeContract, isPending: isTxPending, error, isSuccess } = useWriteContract();
  const { showToast } = useToast();

  // Collection Hook
  const { tokenIds, isLoading: isCollectionLoading, refetch: refetchCollection } = useMyCollection(CONTRACT_ADDRESS);

  const isPending = isUploading || isTxPending;

  // Effect: Set metadata when new music is generated (all data from API)
  useEffect(() => {
    if (generatedData) {
      setTitle(generatedData.title);
      setDescription(generatedData.description);
      setCoverUrl(generatedData.coverUrl);
    }
  }, [generatedData]);

  // Handle music ready - trigger auto-play
  const handleMusicReady = (data: MusicOnlyData) => {
    setMusicData(data);
    setShouldAutoPlay(true);
  };

  // Handle generation complete - update data and trigger auto-play on first call
  const handleGenerated = (data: CompleteMusicData) => {
    if (!generatedData) {
      setShouldAutoPlay(true);
    }
    setGeneratedData(data);
  };

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
      setGeneratedData(null);
      setMusicData(null);
      setShouldAutoPlay(false);
      setCoverUrl(null);
      setTitle('');
      setDescription('');
      setTimeout(() => {
          refetchCollection();
          setView('collection');
      }, 2000);
    }
  }, [isSuccess, showToast, refetchCollection]);

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
        <Header currentView={view} setView={setView} />
        
        <main className="container max-w-6xl mx-auto flex-1 flex flex-col justify-center">
            
            {/* VIEW: CREATE */}
            {view === 'create' && (
                <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                    
                    {!generatedData ? (
                        /* State 0: Generator Input */
                        <div className="flex flex-col items-center justify-center min-h-[60vh]">
                            <Generator onGenerated={handleGenerated} onMusicReady={handleMusicReady} />
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
                                        onRestart={() => {
                                          setGeneratedData(null);
                                          setMusicData(null);
                                          setShouldAutoPlay(false);
                                        }}
                                        autoPlay={shouldAutoPlay}
                                        className="sticky top-24"
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
                                    onRegenerate={() => {
                                      setGeneratedData(null);
                                      setMusicData(null);
                                      setShouldAutoPlay(false);
                                    }}
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
