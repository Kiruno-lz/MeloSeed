import Replicate from 'replicate';
import { IMusicGenerator } from './types';
import fs from 'fs/promises';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

// Set ffmpeg path explicitly for Vercel/serverless environments
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

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
      console.log("Using local mock audio: public/assets/music_long.mp3");
      
      try {
        await fs.access(musicPath);
        
        // Attempt to trim audio using ffmpeg-static
        try {
            return await new Promise((resolve, reject) => {
              const tempDir = os.tmpdir();
              const id = uuidv4();
              const outputPath = path.join(tempDir, `${id}_trimmed.mp3`);
    
              ffmpeg(musicPath)
                .setStartTime(0)
                .setDuration(20) // 20 seconds
                .audioCodec('libmp3lame')
                .audioBitrate(32) // 32kbps
                .audioChannels(1) // Mono
                .format('mp3')
                .outputOptions('-map_metadata', '-1') // Strip metadata
                .on('end', async () => {
                  try {
                    const buffer = await fs.readFile(outputPath);
                    await fs.unlink(outputPath).catch(() => {}); // Cleanup
                    resolve(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer);
                  } catch (err) {
                    reject(err);
                  }
                })
                .on('error', (err) => {
                  console.warn("ffmpeg trim failed (using fallback):", err.message);
                  reject(err);
                })
                .save(outputPath);
            });
        } catch (ffmpegError) {
             console.warn("FFmpeg failed to trim audio, returning full file as fallback.", ffmpegError);
             // Fallback: Return full file
             const buffer = await fs.readFile(musicPath);
             return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
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
