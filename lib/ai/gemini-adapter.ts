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
      const model = this.client.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
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
    const apiKey = process.env.SILICON_FLOW_API_KEY;
    
    console.log('SILICON_FLOW_API_KEY present:', !!apiKey);
    
    if (!apiKey) {
      console.warn('SILICON_FLOW_API_KEY not set, using default cover');
      return '/logo.png';
    }

    try {
      const styleColors = [
        { hex: '#9900ff', name: 'violet' },
        { hex: '#5200ff', name: 'blue' },
        { hex: '#ff25f6', name: 'pink' },
        { hex: '#2af6de', name: 'cyan' },
        { hex: '#ffdd28', name: 'yellow' },
        { hex: '#3dffab', name: 'mint' },
        { hex: '#d8ff3e', name: 'lime' },
        { hex: '#d9b2ff', name: 'lavender' }
      ];
      const selectedStyle = styleColors[Math.floor(Math.random() * styleColors.length)];

      const artisticStyles = [
        'ethereal watercolor with soft gradients',
        'abstract geometric with flowing lines',
        'retro synthwave neon aesthetics',
        'minimalist Bauhaus-inspired design',
        'surrealist dreamlike composition',
        'contemporary digital art with texture',
        'impressionist oil painting style',
        'futuristic cyberpunk atmosphere'
      ];
      const artisticStyle = artisticStyles[Math.floor(Math.random() * artisticStyles.length)];

      const coverPrompt = `Album cover art for "${analysis.title}". ${analysis.description}. Mood: ${analysis.mood}, Genre: ${analysis.genre}, Tags: ${analysis.tags.join(', ')}. Create a ${artisticStyle}. Use a color palette centered around ${selectedStyle.name} (#${selectedStyle.hex}). Aspect ratio 1:1. Style: highly artistic, emotionally evocative, modern digital art, professional album cover quality. Make it visually stunning and unique.`;

      const response = await fetch('https://api.siliconflow.cn/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'Kwai-Kolors/Kolors',
          prompt: coverPrompt,
          image_size: '350x350',
          batch_size: 1,
          num_inference_steps: 20,
          guidance_scale: 7.5
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Silicon Flow API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Silicon Flow response:', JSON.stringify(result));
      
      if (result.data && result.data[0]?.url) {
        return result.data[0].url;
      }

      if (result.data && result.data[0]?.image) {
        const imageBase64 = result.data[0].image;
        const buffer = Buffer.from(imageBase64, 'base64');
        const blob = new Blob([buffer], { type: 'image/png' });
        const coverUrl = await uploadFileToIPFS(blob);
        return coverUrl;
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
      const coverPrompt = `Create an album cover art for a music track with the following characteristics:
- Title: ${analysis.title}
- Description: ${analysis.description}
- Mood: ${analysis.mood}
- Genre: ${analysis.genre}
- Tags: ${analysis.tags.join(', ')}

Create a beautiful, abstract, minimalistic album cover art with harmonious colors that match the mood. Style: modern, artistic, high quality digital art, 1024x1024.`;

      const result = await this.client.models.generateImage({
        model: 'imagen-3.0-generate-002',
        prompt: coverPrompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: '1:1'
        }
      });

      if (result.generatedImages && result.generatedImages.length > 0) {
        const image = result.generatedImages[0];
        if (image.image?.imageBytes) {
          const imageBuffer = Buffer.from(image.image.imageBytes, 'base64');
          const blob = new Blob([imageBuffer], { type: 'image/jpeg' });
          const coverUrl = await uploadFileToIPFS(blob);
          return coverUrl;
        }
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
      const result = await this.client.models.generateImage({
        model: 'imagen-3.0-generate-002',
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: '1:1'
        }
      });

      if (result.generatedImages && result.generatedImages.length > 0) {
        const image = result.generatedImages[0];
        if (image.image?.imageBytes) {
          const imageBuffer = Buffer.from(image.image.imageBytes, 'base64');
          const blob = new Blob([imageBuffer], { type: 'image/jpeg' });
          const coverUrl = await uploadFileToIPFS(blob);
          return coverUrl;
        }
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
      const model = this.client.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

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

  private getMockAnalysis(): MusicAnalysisResult {
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
