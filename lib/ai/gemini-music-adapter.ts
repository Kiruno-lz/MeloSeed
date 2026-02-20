import { IMusicGenerator, MusicGenerationOptions, MusicGenerationResult } from './types';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import path from 'path';
import { SeedToStyleMapper, DEFAULT_STYLES, seedToHash } from '@/lib/seed-mapper';

export class GeminiMusicAdapter implements IMusicGenerator {
  private client: GoogleGenerativeAI;
  private defaultStyle = 'calm, soothing, gentle, relaxing, soft melody, ambient';

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set');
    }
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async generate(options: MusicGenerationOptions): Promise<MusicGenerationResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.warn('No GEMINI_API_KEY found, returning mock audio.');
      return this.getMockAudio(options.seed);
    }

    try {
      const seed = options.seed;
      const prompt = options.prompt || '';
      const style = options.style || this.defaultStyle;
      const duration = options.duration || 15;

      const mapper = new SeedToStyleMapper(seed);
      const weightedPrompts = mapper.generateWeightedPrompts(DEFAULT_STYLES, 0.8);
      
      const styleTexts = weightedPrompts.map(p => `${p.text} (${Math.round(p.weight * 100)}%)`).join(', ');
      const fullPrompt = `${styleTexts}${prompt ? `, ${prompt}` : ''}`.trim();
      
      console.log(`Seed ${seed} -> Hash: ${seedToHash(seed)}`);
      console.log('Style Mix:', weightedPrompts.map(p => `${p.text}:${Math.round(p.weight*100)}%`).join(' | '));

      const audioBase64 = await this.generateWithLyria(fullPrompt, options.bpm, duration, weightedPrompts);

      return {
        audioBase64,
        audioFormat: 'audio/wav',
        seed,
        styleMix: weightedPrompts.map(p => ({
          name: p.text,
          weight: p.weight,
          color: p.color
        })),
        seedHash: seedToHash(seed)
      };
    } catch (error) {
      console.error('Gemini Music Generation Error:', error);
      return this.getMockAudio(options.seed);
    }
  }

  private async generateWithLyria(
    prompt: string, 
    bpm: number | undefined, 
    duration: number = 15,
    weightedPrompts: { text: string; weight: number; color: string }[] = []
  ): Promise<string> {
    const model = 'models/lyria-realtime-exp';
    const audioChunks: Uint8Array[] = [];
    const targetDurationMs = duration * 1000;
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      let session: any;

      const setupSession = async () => {
        try {
          session = await (this.client as any).live.music.connect({
            model,
            callbacks: {
              onmessage: (message: any) => {
                if (message.serverContent?.audioChunks) {
                  for (const chunk of message.serverContent.audioChunks) {
                    if (chunk.data) {
                      audioChunks.push(new Uint8Array(chunk.data));
                    }
                  }
                }
                
                if (Date.now() - startTime >= targetDurationMs) {
                  if (session?.disconnect) {
                    session.disconnect();
                  }
                }
              },
              onerror: (error: any) => {
                console.error('Lyria session error:', error);
                reject(error);
              },
              onclose: () => {
                if (audioChunks.length > 0) {
                  resolve(this.combineAudioChunks(audioChunks));
                } else {
                  reject(new Error('No audio generated'));
                }
              }
            },
          });

          await session.setWeightedPrompts(
            weightedPrompts.length > 0 
              ? weightedPrompts.map(p => ({ text: p.text, weight: p.weight }))
              : [{ text: prompt, weight: 1.0 }]
          );

          await session.setMusicGenerationConfig({
            bpm: bpm || 80,
            temperature: 0.8,
            density: 0.6,
            brightness: 0.5,
          });

          await session.play();

          setTimeout(async () => {
            if (session?.disconnect) {
              session.disconnect();
            }
          }, duration * 1000 + 1000);

        } catch (error) {
          console.error('Lyria setup error:', error);
          reject(error);
        }
      };

      setupSession();
    });
  }

  private combineAudioChunks(chunks: Uint8Array[]): string {
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }
    return Buffer.from(combined).toString('base64');
  }

  private async getMockAudio(seed: number): Promise<MusicGenerationResult> {
    const musicPath = path.join(process.cwd(), 'public', 'assets', 'music_long.mp3');
    const mapper = new SeedToStyleMapper(seed);
    const styleMix = mapper.generateWeightedPrompts(DEFAULT_STYLES, 0.8);
    
    try {
      const buffer = await fs.readFile(musicPath);
      return {
        audioBase64: buffer.toString('base64'),
        audioFormat: 'audio/mp3',
        seed,
        styleMix: styleMix.map(p => ({ name: p.text, weight: p.weight, color: p.color })),
        seedHash: seedToHash(seed)
      };
    } catch (e) {
      console.warn('Mock audio not found, returning silent buffer');
      const silentBuffer = new Uint8Array(44100 * 2 * 5);
      return {
        audioBase64: Buffer.from(silentBuffer).toString('base64'),
        audioFormat: 'audio/wav',
        seed,
        styleMix: styleMix.map(p => ({ name: p.text, weight: p.weight, color: p.color })),
        seedHash: seedToHash(seed)
      };
    }
  }
}
