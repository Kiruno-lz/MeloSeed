import { NextRequest, NextResponse } from 'next/server';
import { ReplicateAdapter } from '@/lib/ai/replicate-adapter';
import { compressAudio } from '@/lib/audio-utils';

const musicGenerator = new ReplicateAdapter();

export async function POST(req: NextRequest) {
  try {
    const { prompt, seed } = await req.json();

    if (!seed) {
      return NextResponse.json({ error: 'Seed is required' }, { status: 400 });
    }

    console.log(`Generating music for seed: ${seed}, prompt: ${prompt}`);

    // 1. Generate Music
    const rawAudioBuffer = await musicGenerator.generate(prompt || '', Number(seed), 1); // 1 second

    // 2. Compress Audio (Server-side)
    const compressedBuffer = await compressAudio(rawAudioBuffer);

    // 3. Convert to Base64
    const audioBase64 = compressedBuffer.toString('base64');

    return NextResponse.json({
      seed,
      audioBase64,
      mimeType: 'audio/mp3',
    });

  } catch (error) {
    console.error('Generation Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate music' },
      { status: 500 }
    );
  }
}
