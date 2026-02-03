'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Feather, UploadCloud, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MintingCardProps {
  onMint: () => void;
  isPending: boolean;
  isUploading: boolean;
  title: string;
  setTitle: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  onRegenerate: () => void; // Allow user to go back
}

export function MintingCard({
  onMint,
  isPending,
  isUploading,
  title,
  setTitle,
  description,
  setDescription,
  onRegenerate
}: MintingCardProps) {

  return (
    <Card className="w-full h-full glass-card border-0 animate-in fade-in slide-in-from-right-8 duration-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl">
          <Feather className="w-6 h-6 text-primary" />
          Harvest & Preserve
        </CardTitle>
        <CardDescription>
          Immortalize this frequency. Mint your sonic seed as a permanent NFT artifact.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Metadata Inputs */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Title</Label>
            <Input 
              id="title" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="Name your melody..."
              className="bg-secondary/50 border-transparent focus:bg-background transition-all text-lg font-semibold"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description</Label>
            <Textarea 
              id="description" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="What's the story behind this sound?"
              className="bg-secondary/50 border-transparent focus:bg-background transition-all resize-none h-32"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-4">
            <Button 
                onClick={onMint} 
                disabled={isPending || !title} 
                className={cn(
                    "w-full h-14 text-lg font-bold rounded-xl shadow-lg transition-all hover:scale-[1.02]",
                    isPending ? "bg-muted text-muted-foreground" : "bg-gradient-to-r from-primary to-orange-500 text-white hover:shadow-primary/40"
                )}
            >
                {isPending ? (
                    <div className="flex items-center gap-2">
                        <span className="animate-spin">⏳</span>
                        <span>{isUploading ? 'Uploading Assets...' : 'Confirming on Wallet...'}</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <UploadCloud className="w-5 h-5" />
                        <span>Mint NFT</span>
                    </div>
                )}
            </Button>
            
            <Button 
                variant="ghost" 
                onClick={onRegenerate}
                disabled={isPending}
                className="w-full text-muted-foreground hover:text-foreground"
            >
                <RefreshCw className="w-4 h-4 mr-2" />
                Discard & Create New
            </Button>
        </div>

      </CardContent>
    </Card>
  );
}
