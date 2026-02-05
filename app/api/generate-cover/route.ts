import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json().catch(() => ({ prompt: null }));
    
    // Default prompt if none provided
    const imagePrompt = prompt || "A futuristic abstract visualization of music, digital art, vibrant colors, high quality, 4k";

    // 1. Try Replicate if API Token is available
    if (process.env.REPLICATE_API_TOKEN) {
        // ... (Replicate logic remains same)
        try {
            const replicate = new Replicate({
                auth: process.env.REPLICATE_API_TOKEN,
            });

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

            if (Array.isArray(output) && output.length > 0) {
                return NextResponse.json({ 
                    url: output[0],
                    provider: 'replicate'
                });
            }
        } catch (replicateError) {
            console.warn("Replicate generation failed, falling back to mock:", replicateError);
        }
    }

    // 2. Fallback: Local Test Images (Mock)
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Scan public directory for files starting with 'test'
    // Note: process.cwd() is the root of the project
    const publicDir = path.join(process.cwd(), 'public');
    let testImages: string[] = [];
    
    try {
        const files = fs.readdirSync(publicDir);
        testImages = files.filter(file => 
            file.toLowerCase().startsWith('test') && 
            (file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.webp'))
        );
    } catch (e) {
        console.error("Failed to read public dir:", e);
    }

    // Default fallback if no files found
    let selectedImage = '/logo.png'; 
    
    if (testImages.length > 0) {
        const randomIndex = Math.floor(Math.random() * testImages.length);
        selectedImage = '/' + testImages[randomIndex];
    }
    
    return NextResponse.json({ 
      url: selectedImage,
      provider: 'local-mock-random',
      prompt: imagePrompt
    });

  } catch (error) {
    console.error('Image generation error:', error);
    return NextResponse.json({ error: 'Failed to generate image' }, { status: 500 });
  }
}
