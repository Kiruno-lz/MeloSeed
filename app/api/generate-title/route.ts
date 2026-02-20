import { NextRequest, NextResponse } from 'next/server';
import { GeminiAdapter } from '@/lib/ai/gemini-adapter';

const musicAnalyzer = new GeminiAdapter();

export async function POST(req: NextRequest) {
  try {
    const { styleMix } = await req.json();

    if (!styleMix || !Array.isArray(styleMix)) {
      return NextResponse.json({ error: 'Style mix is required' }, { status: 400 });
    }

    console.log(`Generating description for title and style mix`);

    const styleMetadata = await musicAnalyzer.generateTitleFromStyleMix(styleMix);

    console.log(`Title generation complete: ${styleMetadata.title}`);

    return NextResponse.json({
      title: styleMetadata.title,
      description: styleMetadata.description,
      tags: styleMetadata.tags,
      mood: styleMetadata.mood,
      genre: styleMetadata.genre
    });

  } catch (error) {
    console.error('Title Generation Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate title' },
      { status: 500 }
    );
  }
}
