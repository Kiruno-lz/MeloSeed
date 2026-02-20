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
      
      const prompt = `You are a poetic music curator with an evocative writing style. Analyze this audio and create:

1. TITLE: A captivating, poetic title (max 10 words, English) that captures the essence of the music
2. DESCRIPTION: Write a vivid, atmospheric description (2-3 sentences) that paints a picture and evokes emotions. Make it feel like a personal note to someone special - intimate, poetic, and moving. Use sensory language about what the music feels like, what memories it evokes, or what emotions it stirs. Avoid generic AI-sounding phrases.
3. TAGS: 5 relevant tags (comma separated)
4. MOOD: The emotional atmosphere (e.g., dreamy, melancholic, hopeful, nostalgic, serene)
5. GENRE: The music style (e.g., lo-fi, ambient, electronic, classical, jazz)

Respond in JSON format with keys: title, description, tags, mood, genre

Make the description feel human and emotionally resonant - like something you'd write in a personal message to share this music with someone you care about.`;

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

  async generateCoverFromStyleMix(analysis: MusicAnalysisResult): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return '/logo.png';
    }

    try {
      const model = this.client.getGenerativeModel({ model: 'gemini-2.0-flash-exp-image-generation' });

      const styleColors = ['#9900ff', '#5200ff', '#ff25f6', '#2af6de', '#ffdd28', '#3dffab', '#d8ff3e', '#d9b2ff'];
      const randomColor = styleColors[Math.floor(Math.random() * styleColors.length)];

      const coverPrompt = `Create an album cover art for music with these characteristics:
- Title: ${analysis.title}
- Description: ${analysis.description}
- Mood: ${analysis.mood}
- Genre: ${analysis.genre}
- Tags: ${analysis.tags.join(', ')}

Create a beautiful, abstract, minimalistic album cover art. Use a color palette centered around ${randomColor}. Style: modern, artistic, high quality digital art, 1024x1024, atmospheric, evocative.`;

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

  async generateTitleFromStyleMix(styleMix: { name: string; weight: number; color: string }[]): Promise<MusicAnalysisResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    
    const styleText = styleMix.map(s => `${s.name} (${Math.round(s.weight * 100)}%)`).join(', ');
    
    if (!apiKey) {
      console.warn('No GEMINI_API_KEY found, returning mock title from style mix.');
      return this.getMockAnalysisFromStyle(styleText);
    }

    try {
      const model = this.client.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = `Based on this music style mix: ${styleText}

Create an evocative title and description that captures the artistic essence of this style combination:

1. TITLE: A poetic, captivating title (max 8 words) that reflects the artistic vibe of these styles
2. DESCRIPTION: Write an atmospheric, poetic description (2-3 sentences) that paints a picture of the artistic journey this style mix represents. Make it feel like an intimate note to someone special - evocative, sensory, and emotionally resonant. Avoid generic AI phrases.
3. TAGS: 5 relevant tags (comma separated)
4. MOOD: The emotional atmosphere
5. GENRE: The dominant music style

Respond in JSON format with keys: title, description, tags, mood, genre`;

      const result = await model.generateContent(prompt);
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

      return this.getMockAnalysisFromStyle(styleText);
    } catch (error) {
      console.error('Gemini Title Generation Error:', error);
      return this.getMockAnalysisFromStyle(styleText);
    }
  }

  private getMockAnalysisFromStyle(styleText: string): MusicAnalysisResult {
    const titles = [
      'Midnight Frequencies', 'Neon Dreams', 'Cosmic Drift', 'Digital Serenity',
      'Velvet Echoes', 'Starlight Protocol', 'Urban Solitude', 'Crystal Waves',
      'Silent Rebellion', 'Ethereal Journey'
    ];
    const descriptions = [
      'Like wandering through a neon-lit city at 3am, where every reflection tells a story - this is a moment of pure introspection set to sound.',
      'Whispers of a distant future where technology and emotion intertwine, creating a sanctuary of sound for the thoughtful soul.',
      'A gentle exploration of inner landscapes, where rhythm meets reflection and every beat echoes the heartbeat of the universe.'
    ];
    
    const seed = styleText.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    return {
      title: titles[seed % titles.length],
      description: descriptions[seed % descriptions.length],
      tags: ['electronic', 'ambient', 'atmospheric', 'cinematic', 'evocative'],
      mood: 'dreamy',
      genre: 'ambient'
    };
  }
    return {
      title: 'Starlight Lullaby',
      description: 'Like drifting through a quiet midnight sky, this gentle melody wraps you in warmth and nostalgia - a tender moment of peace between friends, where silence speaks louder than words.',
      tags: ['lo-fi', 'chill', 'piano', 'dreams', 'serene'],
      mood: 'dreamy',
      genre: 'lo-fi'
    };
  }

  private getMockCompleteMetadata(): CompleteMusicMetadata {
    return {
      title: 'Starlight Lullaby',
      description: 'Like drifting through a quiet midnight sky, this gentle melody wraps you in warmth and nostalgia - a tender moment of peace between friends, where silence speaks louder than words.',
      tags: ['lo-fi', 'chill', 'piano', 'dreams', 'serene'],
      mood: 'dreamy',
      genre: 'lo-fi',
      coverUrl: '/logo.png'
    };
  }
}
