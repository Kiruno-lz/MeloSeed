import Replicate from 'replicate';
import { IMusicGenerator } from './types';
import fs from 'fs/promises';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

const BASE_PROMPT = "Lo-fi chill, soft piano melody, emotional, catchy hook, rhythmic, high fidelity, 80bpm";

export class ReplicateAdapter implements IMusicGenerator {
  private replicate: Replicate;

  constructor() {
    this.replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN || 'mock',
    });
  }

  async generate(userPrompt: string, seed: number, duration: number = 1): Promise<ArrayBuffer> {
    if (!process.env.REPLICATE_API_TOKEN) {
        console.warn("No REPLICATE_API_TOKEN found, returning mock audio.");
        return this.getMockAudio();
    }

    const fullPrompt = `${BASE_PROMPT}. ${userPrompt}`;
    
    // Using Facebook's MusicGen via Replicate
    // Model: meta/musicgen:b05b1dff1d8c6dc63d14b0cdb42135378dcb87f6373b0d3d341ede46e59e2b38
    try {
      const output = await this.replicate.run(
        "meta/musicgen:b05b1dff1d8c6dc63d14b0cdb42135378dcb87f6373b0d3d341ede46e59e2b38",
        {
          input: {
            prompt: fullPrompt,
            duration: duration,
            seed: seed,
          }
        }
      );

      // Output is usually a URL string or array of strings
      const audioUrl = output as unknown as string;
      
      const response = await fetch(audioUrl);
      const arrayBuffer = await response.arrayBuffer();
      return arrayBuffer;
    } catch (error) {
      console.error("Replicate API Error:", error);
      console.warn("Falling back to Mock Audio due to API failure.");
      return this.getMockAudio();
    }
  }

  private async getMockAudio(): Promise<ArrayBuffer> {
      // In Vercel/Serverless environment, we might not have access to ffmpeg.
      // Simply return the file buffer directly.
      const musicPath = path.join(process.cwd(), 'public', 'assets', 'music_long.mp3');
      console.log("Using local mock audio: public/assets/music_long.mp3");
      
      try {
        const buffer = await fs.readFile(musicPath);
        return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
      } catch (e) {
        console.warn("music_long.mp3 not found or unreadable, falling back to silent buffer.", e);
        // Fallback to silent buffer (1 second of silence)
        return new ArrayBuffer(1024);
      }
  }

  private writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
}
