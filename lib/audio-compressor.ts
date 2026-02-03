import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

export async function compressAudio(inputBuffer: ArrayBuffer): Promise<Buffer> {
  // If we are in a serverless environment (like Vercel) without ffmpeg,
  // we should skip compression and return the original buffer if possible,
  // or at least handle the error gracefully.
  
  // Basic check for ffmpeg binary path or environment variable could go here,
  // but fluent-ffmpeg relies on PATH.
  
  const tempDir = os.tmpdir();
  const id = uuidv4();
  const inputPath = path.join(tempDir, `${id}_input.wav`);
  const outputPath = path.join(tempDir, `${id}_output.mp3`);

  try {
    // Write input buffer to disk
    await fs.writeFile(inputPath, Buffer.from(inputBuffer));

    return await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .audioCodec('libmp3lame')
        .audioBitrate(32) // 32kbps
        .audioChannels(1) // Mono
        .format('mp3')
        .outputOptions('-map_metadata', '-1') // Strip all metadata
        .outputOptions('-vn') // No video
        .on('end', async () => {
          try {
            const outputBuffer = await fs.readFile(outputPath);
            // Cleanup
            await fs.unlink(inputPath).catch(() => {});
            await fs.unlink(outputPath).catch(() => {});
            resolve(outputBuffer);
          } catch (err) {
            reject(err);
          }
        })
        .on('error', async (err) => {
          console.warn("ffmpeg compression failed (likely missing binary), returning original buffer:", err.message);
          // Cleanup
          await fs.unlink(inputPath).catch(() => {});
          await fs.unlink(outputPath).catch(() => {});
          
          // Fallback: Return original buffer
          resolve(Buffer.from(inputBuffer));
        })
        .save(outputPath);
    });
  } catch (error) {
    console.warn("Audio compression setup failed, returning original buffer:", error);
    // Cleanup just in case
    await fs.unlink(inputPath).catch(() => {});
    return Buffer.from(inputBuffer);
  }
}
