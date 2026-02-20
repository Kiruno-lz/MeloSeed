import { GoogleGenerativeAI } from '@google/generative-ai';
import { IMusicAnalyzer, MusicAnalysisResult } from './types';

export class GeminiAdapter implements IMusicAnalyzer {
  private client: GoogleGenerativeAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set');
    }
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async analyze(audioData: ArrayBuffer): Promise<MusicAnalysisResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.warn('No GEMINI_API_KEY found, returning mock analysis.');
      return this.getMockAnalysis();
    }

    try {
      const model = this.client.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const base64Audio = this.arrayBufferToBase64(audioData);
      
      const prompt = `You are a music expert. Please analyze this audio and provide:
1. A creative and catchy title (in English, max 10 words)
2. A detailed description of the music (2-3 sentences)
3. 5 relevant tags (comma separated)
4. The mood (e.g., happy, melancholic, energetic, calm)
5. The genre (e.g., lo-fi, electronic, classical, jazz)

Respond in JSON format with keys: title, description, tags, mood, genre`;

      const result = await model.generateContent([
        {
          inlineData: {
            data: base64Audio,
            mimeType: 'audio/mpeg'
          }
        },
        prompt
      ]);

      const responseText = result.response.text();
      
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          title: parsed.title || 'Untitled',
          description: parsed.description || '',
          tags: Array.isArray(parsed.tags) ? parsed.tags : parsed.tags.split(',').map((t: string) => t.trim()),
          mood: parsed.mood || 'unknown',
          genre: parsed.genre || 'unknown'
        };
      }

      return this.getMockAnalysis();
    } catch (error) {
      console.error('Gemini API Error:', error);
      return this.getMockAnalysis();
    }
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private getMockAnalysis(): MusicAnalysisResult {
    return {
      title: 'Midnight Dreams',
      description: 'A soothing lo-fi track with soft piano melodies and gentle beats, perfect for relaxation and focus.',
      tags: ['lo-fi', 'chill', 'piano', 'relaxing', 'ambient'],
      mood: 'calm',
      genre: 'lo-fi'
    };
  }
}
