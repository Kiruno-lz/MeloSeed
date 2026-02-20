import { NextRequest, NextResponse } from 'next/server';
import { GeminiMusicAdapter } from '@/lib/ai/gemini-music-adapter';
import { compressAudio } from '@/lib/audio-utils';
import { base64ToArrayBuffer } from '@/lib/utils';

const musicGenerator = new GeminiMusicAdapter();

export async function POST(req: NextRequest) {
  try {
    const { prompt, seed, style, duration, bpm } = await req.json();

    if (!seed) {
      return NextResponse.json({ error: 'Seed is required' }, { status: 400 });
    }

    console.log(`Generating music for seed: ${seed}, prompt: ${prompt}, style: ${style}`);

    const generationResult = await musicGenerator.generate({
      seed: Number(seed),
      prompt: prompt || '',
      style: style || 'calm, soothing, gentle, relaxing, soft melody, ambient',
      duration: duration || 15,
      bpm: bpm || 80
    });

    const audioArrayBuffer = base64ToArrayBuffer(generationResult.audioBase64);
    const compressedBuffer = await compressAudio(audioArrayBuffer);
    const audioBase64 = Buffer.from(compressedBuffer).toString('base64');

    console.log(`Music generation complete for seed: ${seed}`);

    return NextResponse.json({
      seed: generationResult.seed,
      audioBase64,
      audioFormat: generationResult.audioFormat,
      styleMix: generationResult.styleMix,
      seedHash: generationResult.seedHash
    });

  } catch (error) {
    console.error('Music Generation Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate music' },
      { status: 500 }
    );
  }
}
