import Replicate from 'replicate';
import { IMusicGenerator } from './types';
import fs from 'fs/promises';
import path from 'path';
import { trimAudioFile } from '../audio-utils';

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
      const musicPath = path.join(process.cwd(), 'public', 'assets', 'music_long.mp3');
      const mockTrimmedPath = path.join(process.cwd(), 'public', 'assets', 'music_mock_20s.mp3');
      
      console.log("Using local mock audio");
      
      try {
        await fs.access(musicPath);
        
        // Attempt to trim audio using shared utility
        try {
            return await trimAudioFile(musicPath, 50);
        } catch (ffmpegError) {
             console.warn("FFmpeg failed to trim audio.", ffmpegError);
             
             // Fallback 1: Try pre-trimmed mock file
             try {
                console.log("Attempting to use pre-trimmed mock file...");
                await fs.access(mockTrimmedPath);
                const buffer = await fs.readFile(mockTrimmedPath);
                return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
             } catch (fallbackError) {
                 console.warn("Pre-trimmed mock file not found.", fallbackError);
                 // Fallback 2: Return full file
                 const buffer = await fs.readFile(musicPath);
                 return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
             }
        }

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
