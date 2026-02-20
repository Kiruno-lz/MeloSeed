import { NextRequest, NextResponse } from 'next/server';
import { GeminiMusicAdapter } from '@/lib/ai/gemini-music-adapter';
import { GeminiAdapter } from '@/lib/ai/gemini-adapter';
import { compressAudio } from '@/lib/audio-utils';
import { base64ToArrayBuffer } from '@/lib/utils';

const musicGenerator = new GeminiMusicAdapter();
const musicAnalyzer = new GeminiAdapter();

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

    console.log(`Analyzing music and generating cover for seed: ${seed}`);
    
    const metadata = await musicAnalyzer.analyzeAndGenerateCover(compressedBuffer.buffer as ArrayBuffer);

    console.log(`Generation complete for seed: ${seed}`, {
      title: metadata.title,
      coverUrl: metadata.coverUrl
    });

    return NextResponse.json({
      seed: generationResult.seed,
      audioBase64,
      audioFormat: generationResult.audioFormat,
      title: metadata.title,
      description: metadata.description,
      tags: metadata.tags,
      mood: metadata.mood,
      genre: metadata.genre,
      coverUrl: metadata.coverUrl
    });

  } catch (error) {
    console.error('Generation Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate music' },
      { status: 500 }
    );
  }
}
