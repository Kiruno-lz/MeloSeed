import { NextRequest, NextResponse } from 'next/server';
import { GeminiAdapter } from '@/lib/ai/gemini-adapter';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    const arrayBuffer = await audioFile.arrayBuffer();
    
    const analyzer = new GeminiAdapter();
    const analysis = await analyzer.analyze(arrayBuffer);

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Analyze music error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze music' },
      { status: 500 }
    );
  }
}
