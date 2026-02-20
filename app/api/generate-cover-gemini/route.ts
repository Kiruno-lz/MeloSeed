import { NextRequest, NextResponse } from 'next/server';
import { GeminiAdapter } from '@/lib/ai/gemini-adapter';

const musicAnalyzer = new GeminiAdapter();

export async function POST(req: NextRequest) {
  try {
    const { title, description, tags, mood, genre } = await req.json();

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    console.log(`Generating cover for: ${title}`);

    const analysis = {
      title: title || 'Untitled',
      description: description || '',
      tags: tags || [],
      mood: mood || 'unknown',
      genre: genre || 'unknown'
    };

    const coverUrl = await musicAnalyzer.generateCoverFromStyleMix(analysis);

    console.log(`Cover generation complete: ${coverUrl}`);

    return NextResponse.json({
      coverUrl
    });

  } catch (error) {
    console.error('Cover Generation Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate cover' },
      { status: 500 }
    );
  }
}
