import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

export async function compressAudio(inputBuffer: ArrayBuffer): Promise<Buffer> {
  const tempDir = os.tmpdir();
  const id = uuidv4();
  const inputPath = path.join(tempDir, `${id}_input.wav`);
  const outputPath = path.join(tempDir, `${id}_output.mp3`);

  // Write input buffer to disk
  await fs.writeFile(inputPath, Buffer.from(inputBuffer));

  return new Promise((resolve, reject) => {
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
        // Cleanup
        await fs.unlink(inputPath).catch(() => {});
        await fs.unlink(outputPath).catch(() => {});
        reject(err);
      })
      .save(outputPath);
  });
}
