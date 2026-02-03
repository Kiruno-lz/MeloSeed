'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Music, ArrowRight, CheckCircle2 } from 'lucide-react';

interface GeneratedData {
  seed: number;
  audioBase64: string;
}

interface MintingCardProps {
  generatedData: GeneratedData | null;
  coverUrl: string | null;
  onMint: () => void;
  isPending: boolean;
  isUploading: boolean;
  title: string;
  setTitle: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
}

/**
 * MintingCard Component
 * 
 * Displays the interface for minting a generated melody.
 * Shows preview player, cover image, and metadata input fields.
 * Handles the "Ready to Mint" state and the "Empty" state.
 */
export function MintingCard({
  generatedData,
  coverUrl,
  onMint,
  isPending,
  isUploading,
  title,
  setTitle,
  description,
  setDescription
}: MintingCardProps) {

  if (!generatedData) {
    return (
      <div className="hidden lg:flex w-full h-full min-h-[300px] items-center justify-center border-2 border-dashed border-border/50 rounded-3xl p-8 text-muted-foreground bg-card/30">
        <div className="text-center space-y-2">
          <ArrowRight className="w-8 h-8 mx-auto opacity-50" />
          <p>Generate music to enable minting</p>
        </div>
      </div>
    );
  }

  return (
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
        {/* Preview Section */}
        <div className="bg-muted p-4 rounded-xl text-center relative overflow-hidden group">
          {/* Background Blur */}
          {coverUrl && (
            <div className="absolute inset-0 z-0 opacity-20">
              <img src={coverUrl} alt="Cover" className="w-full h-full object-cover blur-sm" />
            </div>
          )}
          
          <div className="relative z-10">
            {coverUrl ? (
              <img src={coverUrl} alt="Cover" className="w-32 h-32 mx-auto rounded-lg mb-4 shadow-lg object-cover" />
            ) : (
              <div className="w-32 h-32 mx-auto rounded-lg mb-4 bg-primary/20 flex items-center justify-center">
                <Music className="w-12 h-12 text-primary/50 animate-pulse" />
              </div>
            )}
            <audio controls src={`data:audio/mp3;base64,${generatedData.audioBase64}`} className="w-full" />
            <p className="text-xs text-muted-foreground mt-2">
              Size: {((generatedData.audioBase64.length * 3) / 4 / 1024).toFixed(2)} KB
            </p>
          </div>
        </div>
        
        {/* Metadata Inputs */}
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

        {/* Mint Button */}
        <Button 
          onClick={onMint} 
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
  );
}
