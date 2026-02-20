import { GoogleGenerativeAI } from '@google/generative-ai';
import { IMusicAnalyzer, IMusicAnalyzerWithCover, MusicAnalysisResult, CompleteMusicMetadata } from './types';
import { uploadFileToIPFS } from '../ipfs-client';

export class GeminiAdapter implements IMusicAnalyzer, IMusicAnalyzerWithCover {
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

  async analyzeAndGenerateCover(audioData: ArrayBuffer): Promise<CompleteMusicMetadata> {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.warn('No GEMINI_API_KEY found, returning mock analysis with cover.');
      return this.getMockCompleteMetadata();
    }

    const analysis = await this.analyze(audioData);
    const coverUrl = await this.generateCover(analysis);

    return {
      ...analysis,
      coverUrl
    };
  }

  private async generateCover(analysis: MusicAnalysisResult): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return '/logo.png';
    }

    try {
      const model = this.client.getGenerativeModel({ model: 'gemini-2.0-flash-exp-image-generation' });

      const coverPrompt = `Create an album cover art for a music track with the following characteristics:
- Title: ${analysis.title}
- Description: ${analysis.description}
- Mood: ${analysis.mood}
- Genre: ${analysis.genre}
- Tags: ${analysis.tags.join(', ')}

Create a beautiful, abstract, minimalistic album cover art with harmonious colors that match the mood. Style: modern, artistic, high quality digital art, 1024x1024.`;

      const result = await model.generateContent(coverPrompt);
      
      const responseText = result.response.text();
      
      const imageMatch = responseText.match(/"base64":\s*"([^"]+)"/);
      if (imageMatch) {
        const base64Image = imageMatch[1];
        const imageBuffer = Buffer.from(base64Image, 'base64');
        const blob = new Blob([imageBuffer], { type: 'image/png' });
        const coverUrl = await uploadFileToIPFS(blob);
        return coverUrl;
      }

      const urlMatch = responseText.match(/"url":\s*"([^"]+)"/);
      if (urlMatch) {
        return urlMatch[1];
      }

      return '/logo.png';
    } catch (error) {
      console.error('Cover generation error:', error);
      return '/logo.png';
    }
  }

  async generateCoverFromPrompt(prompt: string): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return '/logo.png';
    }

    try {
      const model = this.client.getGenerativeModel({ model: 'gemini-2.0-flash-exp-image-generation' });

      const result = await model.generateContent(prompt);
      
      const responseText = result.response.text();
      
      const imageMatch = responseText.match(/"base64":\s*"([^"]+)"/);
      if (imageMatch) {
        const base64Image = imageMatch[1];
        const imageBuffer = Buffer.from(base64Image, 'base64');
        const blob = new Blob([imageBuffer], { type: 'image/png' });
        const coverUrl = await uploadFileToIPFS(blob);
        return coverUrl;
      }

      const urlMatch = responseText.match(/"url":\s*"([^"]+)"/);
      if (urlMatch) {
        return urlMatch[1];
      }

      return '/logo.png';
    } catch (error) {
      console.error('Cover generation error:', error);
      return '/logo.png';
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

  private getMockCompleteMetadata(): CompleteMusicMetadata {
    return {
      title: 'Midnight Dreams',
      description: 'A soothing lo-fi track with soft piano melodies and gentle beats, perfect for relaxation and focus.',
      tags: ['lo-fi', 'chill', 'piano', 'relaxing', 'ambient'],
      mood: 'calm',
      genre: 'lo-fi',
      coverUrl: '/logo.png'
    };
  }
}
