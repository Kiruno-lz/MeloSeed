import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

// Shared initialization
if (ffmpegStatic) {
  console.log("Initializing FFmpeg with path:", ffmpegStatic);
  ffmpeg.setFfmpegPath(ffmpegStatic);
} else {
  console.warn("ffmpeg-static not found or failed to load!");
}


/**
 * Common Audio Processing Options
 */
const AUDIO_OPTS = {
  codec: 'libmp3lame',
  bitrate: 32, // 32kbps
  channels: 1, // Mono
  format: 'mp3'
};

/**
 * Compresses an audio buffer to low-bitrate MP3
 */
export async function compressAudio(inputBuffer: ArrayBuffer): Promise<Buffer> {
  const tempDir = os.tmpdir();
  const id = uuidv4();
  const inputPath = path.join(tempDir, `${id}_input.wav`);
  const outputPath = path.join(tempDir, `${id}_output.mp3`);

  try {
    // Write input buffer to disk
    await fs.writeFile(inputPath, Buffer.from(inputBuffer));

    return await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .audioCodec(AUDIO_OPTS.codec)
        .audioBitrate(AUDIO_OPTS.bitrate)
        .audioChannels(AUDIO_OPTS.channels)
        .format(AUDIO_OPTS.format)
        .outputOptions('-map_metadata', '-1')
        .outputOptions('-vn')
        .on('end', async () => {
          try {
            const outputBuffer = await fs.readFile(outputPath);
            await cleanup([inputPath, outputPath]);
            resolve(outputBuffer);
          } catch (err) {
            reject(err);
          }
        })
        .on('error', async (err) => {
          console.warn("ffmpeg compression failed, returning original buffer:", err.message);
          await cleanup([inputPath, outputPath]);
          resolve(Buffer.from(inputBuffer));
        })
        .save(outputPath);
    });
  } catch (error) {
    console.warn("Audio compression setup failed:", error);
    await cleanup([inputPath]);
    return Buffer.from(inputBuffer);
  }
}

/**
 * Trims an audio file from a path and returns buffer
 */
export async function trimAudioFile(filePath: string, durationSec: number): Promise<ArrayBuffer> {
  const tempDir = os.tmpdir();
  const id = uuidv4();
  const outputPath = path.join(tempDir, `${id}_trimmed.mp3`);

  try {
    return await new Promise((resolve, reject) => {
      ffmpeg(filePath)
        .setStartTime(0)
        .setDuration(durationSec)
        .audioCodec(AUDIO_OPTS.codec)
        .audioBitrate(AUDIO_OPTS.bitrate)
        .audioChannels(AUDIO_OPTS.channels)
        .format(AUDIO_OPTS.format)
        .outputOptions('-map_metadata', '-1')
        .on('end', async () => {
          try {
            const buffer = await fs.readFile(outputPath);
            await cleanup([outputPath]);
            // Convert Buffer to ArrayBuffer
            resolve(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer);
          } catch (err) {
            reject(err);
          }
        })
        .on('error', async (err) => {
            console.warn("ffmpeg trim failed:", err.message);
            await cleanup([outputPath]);
            reject(err);
        })
        .save(outputPath);
    });
  } catch (error) {
    // If trimming fails, throw error so caller can handle fallback
    throw error;
  }
}

async function cleanup(paths: string[]) {
    for (const p of paths) {
        await fs.unlink(p).catch(() => {});
    }
}
