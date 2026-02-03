'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract } from 'wagmi';
import { Generator } from '@/components/features/Generator';
import { NFTPlayer } from '@/components/features/NFTPlayer';
import { ConnectWalletView } from '@/components/features/ConnectWalletView';
import { MintingCard } from '@/components/features/MintingCard';
import { useToast } from '@/components/Toast';
import { uploadFileToIPFS, uploadJSONToIPFS, base64ToBlob } from '@/lib/ipfs-client';
import { useMyCollection } from '@/lib/hooks/useMyCollection';
import { CONTRACT_ADDRESS, MELO_SEED_ABI } from '@/lib/constants';

/**
 * Home Page Component
 * 
 * Orchestrates the main application flow:
 * 1. Wallet Connection (via ConnectWalletView)
 * 2. Music Generation (via Generator)
 * 3. NFT Minting (via MintingCard)
 * 4. Collection Viewing (via NFTPlayer)
 */
export default function Home() {
  const { address, isConnected } = useAccount();
  const [generatedData, setGeneratedData] = useState<{ seed: number; audioBase64: string } | null>(null);
  
  // Metadata State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const { writeContract, isPending: isTxPending, error, isSuccess } = useWriteContract();
  const { showToast } = useToast();

  // My Collection Hook
  const { tokenIds, isLoading: isCollectionLoading, refetch: refetchCollection } = useMyCollection(CONTRACT_ADDRESS);

  const isPending = isUploading || isTxPending;

  // Effect: Reset/Default metadata when new music is generated
  useEffect(() => {
    if (generatedData) {
        setTitle(`MeloSeed #${generatedData.seed}`);
        setDescription(`A unique AI-generated melody seeded by ${generatedData.seed}.`);
        setCoverUrl(null); // Reset cover
        
        // Trigger cover generation
        generateCover();
    }
  }, [generatedData]);

  // Effect: Handle Contract Write Error
  useEffect(() => {
    if (error) {
      console.error("Mint Error:", error);
      const msg = error.message.length > 100 ? error.message.substring(0, 100) + '...' : error.message;
      showToast(msg, 'error');
    }
  }, [error, showToast]);

  // Effect: Handle Contract Write Success
  useEffect(() => {
    if (isSuccess) {
      showToast('NFT Minted Successfully!', 'success');
      setGeneratedData(null); // Reset after success
      setCoverUrl(null);
      // Wait a bit for indexing? Event listeners are usually fast on devnet
      setTimeout(() => refetchCollection(), 2000);
    }
  }, [isSuccess, showToast, refetchCollection]);

  // Function: Generate AI Cover
  const generateCover = async () => {
      try {
          const res = await fetch('/api/generate-cover', { 
            method: 'POST',
            body: JSON.stringify({ prompt: `Abstract visualization of music seed ${generatedData?.seed}` })
          });
          if (res.ok) {
              const data = await res.json();
              setCoverUrl(data.url);
          }
      } catch (e) {
          console.error("Cover generation failed", e);
      }
  };

  // Function: Handle Mint Process
  const handleMint = async () => {
    if (!generatedData || !address) return;
    
    setIsUploading(true);
    try {
        // 1. Upload Audio
        const audioBlob = base64ToBlob(generatedData.audioBase64);
        const audioURI = await uploadFileToIPFS(audioBlob);

        // 2. Upload Cover Image
        let imageURI = "";
        if (coverUrl) {
            const coverRes = await fetch(coverUrl);
            const coverBlob = await coverRes.blob();
            imageURI = await uploadFileToIPFS(coverBlob);
        } else {
             // Fallback to local test image
            const coverRes = await fetch('/test.png');
            const coverBlob = await coverRes.blob();
            imageURI = await uploadFileToIPFS(coverBlob); 
        }

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
    return <ConnectWalletView />;
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
            <MintingCard 
              generatedData={generatedData}
              coverUrl={coverUrl}
              onMint={handleMint}
              isPending={isPending}
              isUploading={isUploading}
              title={title}
              setTitle={setTitle}
              description={description}
              setDescription={setDescription}
            />
        </div>
      </div>

      {/* Collection Section */}
      <div className="w-full max-w-2xl mt-12 pt-12 border-t border-border/50 animate-in fade-in">
           <div className="flex flex-col items-center gap-6">
              <div className="text-center space-y-1">
                  <h3 className="text-2xl font-bold">Your Collection</h3>
                  <p className="text-sm text-muted-foreground">
                      {isCollectionLoading ? 'Loading collection...' : 
                       tokenIds.length > 0 ? `You own ${tokenIds.length} MeloSeeds.` : 'No MeloSeeds found.'}
                  </p>
              </div>
              
              <NFTPlayer collectionIds={tokenIds} />
           </div>
      </div>
    </div>
  );
}
