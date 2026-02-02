'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useReadContract } from 'wagmi';
import { Generator } from '@/components/Generator';
import { NFTPlayer } from '@/components/NFTPlayer';
import { useToast } from '@/components/Toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Music, Wallet, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { uploadFileToIPFS, uploadJSONToIPFS, base64ToBlob } from '@/lib/ipfs-client';

const CONTRACT_ADDRESS = '0x9EfB4ecDE9dafe50f8B9a04ADDA75B6C93Fc4c69';

const MELO_SEED_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'account', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'string', name: 'tokenURI', type: 'string' },
      { internalType: 'bytes', name: 'data', type: 'bytes' },
    ],
    name: 'mint',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }, { internalType: 'uint256', name: 'id', type: 'uint256' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  }
] as const;

export default function Home() {
  const { address, isConnected } = useAccount();
  const [generatedData, setGeneratedData] = useState<{ seed: number; audioBase64: string } | null>(null);
  
  // New state for custom metadata
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  // Update title when seed changes
  useEffect(() => {
    if (generatedData) {
        // We set a default title "MeloSeed #{seed}" but allow user to change it.
        // We only set it if the title is empty or looks like a default title from another seed (simple heuristic)
        // Or simpler: just always reset it when generatedData changes.
        setTitle(`MeloSeed #${generatedData.seed}`);
        setDescription(`A unique AI-generated melody seeded by ${generatedData.seed}.`);
        
        // Trigger cover generation
        generateCover();
    }
  }, [generatedData]);

  const generateCover = async () => {
      try {
          // Call our new API
          const res = await fetch('/api/generate-cover', { method: 'POST' });
          if (res.ok) {
              const data = await res.json();
              // In a real app, we might display this image to the user
              // For now, we just know it's available at data.url
              // We'll use it during minting
          }
      } catch (e) {
          console.error("Cover generation failed", e);
      }
  };
  
  const { writeContract, isPending: isTxPending, error, isSuccess } = useWriteContract();
  const { showToast } = useToast();

  const isPending = isUploading || isTxPending;

  // Since ERC1155 balanceOf requires an ID, and we don't know the ID ahead of time (it's incremental),
  // we can't easily check "balanceOf" for a general "has NFTs" check without an indexer or knowing IDs.
  // For now, we will skip the "hasNFTs" check or use a simpler assumption (e.g. check ID 0, 1, 2 if feasible, or just remove the check).
  // Or better, we can read the `_nextTokenId` from contract if we made it public, but it's private.
  // We'll skip the collection display for this refactor as it requires an indexer (The Graph) for dynamic ERC1155 tokens.
   // const hasNFTs = false; 

   useEffect(() => {
     if (generatedData) {
         setTitle(`MeloSeed #${generatedData.seed}`);
         setDescription(`A unique AI-generated melody seeded by ${generatedData.seed}.`);
         
         // Trigger cover generation
         generateCover();
     }
   }, [generatedData]);


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

  const handleMint = async () => {
    if (!generatedData || !address) return;
    
    setIsUploading(true);
    try {
        // 1. Upload Audio
        const audioBlob = base64ToBlob(generatedData.audioBase64);
        const audioURI = await uploadFileToIPFS(audioBlob);

        // 2. Upload Cover Image (Placeholder for now)
         // We call the API again or just use the known path. 
         // Since the API returns a local path "/test.png", we need to decide:
         // Do we upload "test.png" to IPFS? Or do we use the public URL?
         // For a "permanent" NFT, we should upload it.
         
         // Let's fetch the file from our own API/public folder and upload it to IPFS.
         const coverRes = await fetch('/test.png');
         const coverBlob = await coverRes.blob();
         const imageURI = await uploadFileToIPFS(coverBlob); // Upload local test.png to IPFS

         // 3. Upload Metadata
        const metadata = {
            name: title,
            description: description, 
            image: imageURI,
            animation_url: audioURI,
            attributes: [{ trait_type: "Seed", value: generatedData.seed.toString() }]
        };
        const tokenURI = await uploadJSONToIPFS(metadata);

        // 4. Mint (ERC1155)
        writeContract({
            address: CONTRACT_ADDRESS,
            abi: MELO_SEED_ABI,
            functionName: 'mint',
            args: [
                address,            // account
                BigInt(1),          // amount
                tokenURI,           // tokenURI
                "0x"                // data
            ],
        });
    } catch (e) {
        console.error(e);
        showToast("Upload failed: " + (e as Error).message, 'error');
    } finally {
        setIsUploading(false);
    }
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
        
        <ConnectButton.Custom>
          {({
            account,
            chain,
            openAccountModal,
            openChainModal,
            openConnectModal,
            authenticationStatus,
            mounted,
          }) => {
            const ready = mounted && authenticationStatus !== 'loading';
            const connected =
              ready &&
              account &&
              chain &&
              (!authenticationStatus ||
                authenticationStatus === 'authenticated');

            return (
              <div
                {...(!ready && {
                  'aria-hidden': true,
                  'style': {
                    opacity: 0,
                    pointerEvents: 'none',
                    userSelect: 'none',
                  },
                })}
              >
                {(() => {
                  if (!connected) {
                    return (
                      <button
                        onClick={openConnectModal}
                        type="button"
                        className="
                          relative inline-flex items-center justify-center px-6 py-3 rounded-full
                          text-white font-semibold
                          bg-gradient-to-b from-[#4dabff] to-[#2f6df6]
                          overflow-hidden transition duration-180 ease-out
                          hover:scale-[1.05] hover:bg-gradient-to-r hover:from-[#60a5fa] hover:to-[#3b82f6]
                          hover:shadow-[0_10px_24px_rgba(59,130,246,0.45)]
                          focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#6366f1]/50
                        "
                      >
                        <span className="relative z-[1]">连接钱包</span>
                        <span className="absolute inset-0 rounded-full z-0
                          [background:radial-gradient(120%_120%_at_50%_0%,rgba(168,85,247,.35)_0%,rgba(168,85,247,.15)_50%,rgba(168,85,247,0)_100%)]
                        "></span>
                      </button>
                    );
                  }

                  if (chain.unsupported) {
                    return (
                      <button onClick={openChainModal} type="button" className="px-4 py-2 bg-red-500 text-white rounded-lg font-bold">
                        Wrong network
                      </button>
                    );
                  }

                  return (
                    <div style={{ display: 'flex', gap: 12 }}>
                      <button
                        onClick={openChainModal}
                        style={{ display: 'flex', alignItems: 'center' }}
                        type="button"
                        className="px-4 py-2 bg-gray-100 rounded-lg font-bold text-black"
                      >
                        {chain.hasIcon && (
                          <div
                            style={{
                              background: chain.iconBackground,
                              width: 12,
                              height: 12,
                              borderRadius: 999,
                              overflow: 'hidden',
                              marginRight: 4,
                            }}
                          >
                            {chain.iconUrl && (
                              <img
                                alt={chain.name ?? 'Chain icon'}
                                src={chain.iconUrl}
                                style={{ width: 12, height: 12 }}
                              />
                            )}
                          </div>
                        )}
                        {chain.name}
                      </button>

                      <button onClick={openAccountModal} type="button" className="px-4 py-2 bg-gray-100 rounded-lg font-bold text-black">
                        {account.displayName}
                        {account.displayBalance
                          ? ` (${account.displayBalance})`
                          : ''}
                      </button>
                    </div>
                  );
                })()}
              </div>
            );
          }}
        </ConnectButton.Custom>

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
                        
                        <div className="space-y-3">
                            <div className="space-y-1">
                                <Label htmlFor="title">Title</Label>
                                <Input 
                                    id="title" 
                                    value={title} 
                                    onChange={(e) => setTitle(e.target.value)} 
                                    placeholder="Name your melody"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="description">Description</Label>
                                <Textarea 
                                    id="description" 
                                    value={description} 
                                    onChange={(e) => setDescription(e.target.value)} 
                                    placeholder="Describe the vibe..."
                                />
                            </div>
                        </div>

                        <Button 
                            onClick={handleMint} 
                            disabled={isPending || !title} 
                            className="w-full" 
                            size="lg"
                        >
                            {isPending ? (
                                <>{isUploading ? 'Uploading to IPFS...' : 'Processing Transaction...'}</>
                            ) : (
                                <>Mint NFT</>
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
        <div className="w-full max-w-2xl mt-12 pt-12 border-t border-border/50 animate-in fade-in">
             <div className="flex flex-col items-center gap-6">
                <div className="text-center space-y-1">
                    <h3 className="text-2xl font-bold">NFT Player & Burner</h3>
                    <p className="text-sm text-muted-foreground">Play your minted music or burn tokens.</p>
                </div>
                <NFTPlayer />
             </div>
        </div>
    </div>
  );
}
