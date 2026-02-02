import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json().catch(() => ({ prompt: null }));
    
    // Default prompt if none provided
    const imagePrompt = prompt || "A futuristic abstract visualization of music, digital art, vibrant colors, high quality, 4k";

    // 1. Try Replicate if API Token is available
    if (process.env.REPLICATE_API_TOKEN) {
        try {
            const replicate = new Replicate({
                auth: process.env.REPLICATE_API_TOKEN,
            });

            // Using Stable Diffusion XL (faster and cheaper)
            const output = await replicate.run(
                "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
                {
                    input: {
                        prompt: imagePrompt,
                        width: 768,
                        height: 768,
                        refine: "expert_ensemble_refiner",
                    }
                }
            );

            // Output is usually an array of URLs
            if (Array.isArray(output) && output.length > 0) {
                return NextResponse.json({ 
                    url: output[0],
                    provider: 'replicate'
                });
            }
        } catch (replicateError) {
            console.warn("Replicate generation failed, falling back to mock:", replicateError);
            // Continue to fallback
        }
    }

    // 2. Fallback: Local Test Image (Mock)
    // Simulating delay
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    // We return the local path. 
    // NOTE: In a real "burn" scenario where we need to upload to IPFS, 
    // the frontend handles fetching this URL (even if local) and uploading the Blob.
    return NextResponse.json({ 
      url: '/test.png',
      provider: 'local-mock',
      prompt: imagePrompt
    });

  } catch (error) {
    console.error('Image generation error:', error);
    return NextResponse.json({ error: 'Failed to generate image' }, { status: 500 });
  }
}
