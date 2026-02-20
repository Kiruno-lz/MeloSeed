import { NextRequest } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { SeedToStyleMapper, DEFAULT_STYLES, seedToHash } from '@/lib/seed-mapper';

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      const safeEnqueue = (data: string) => {
        if (!closed && controller.desiredSize !== null && controller.desiredSize > 0) {
          try {
            controller.enqueue(encoder.encode(data));
          } catch (e) {
            closed = true;
          }
        }
      };

      const apiKey = process.env.GEMINI_API_KEY;
      
      if (!apiKey) {
        safeEnqueue(`event: error\ndata: ${JSON.stringify({ error: 'No API key' })}\n\n`);
        controller.close();
        return;
      }

      (async () => {
        try {
          const { prompt, seed, style, duration, bpm } = await req.json();
          const targetSeed = seed || Math.floor(Math.random() * 1000000);
          const targetDuration = duration || 15;

          const mapper = new SeedToStyleMapper(targetSeed);
          const weightedPrompts = mapper.generateWeightedPrompts(DEFAULT_STYLES, 0.8);
          
          const styleTexts = weightedPrompts.map(p => `${p.text} (${Math.round(p.weight * 100)}%)`).join(', ');
          const fullPrompt = `${styleTexts}${prompt ? `, ${prompt}` : ''}`.trim();

          const seedHash = seedToHash(targetSeed);
          
          safeEnqueue(`event: init\ndata: ${JSON.stringify({
            seed: targetSeed,
            seedHash,
            styleMix: weightedPrompts.map(p => ({ name: p.text, weight: p.weight, color: p.color }))
          })}\n\n`);

          console.log(`🌱 Seed ${targetSeed} -> Hash: ${seedHash}`);
          console.log('🎵 Style Mix:', weightedPrompts.map(p => `${p.text}:${Math.round(p.weight*100)}%`).join(' | '));
          console.log('🔊 Starting Lyria RealTime streaming...');

          const client = new GoogleGenAI({ apiKey: apiKey, apiVersion: 'v1alpha' });
          const model = 'models/lyria-realtime-exp';
          const audioChunks: Uint8Array[] = [];

          const session = await client.live.music.connect({
            model,
            callbacks: {
              onmessage: async (message: any) => {
                if (closed) return;
                
                if (message.serverContent?.audioChunks) {
                  for (const chunk of message.serverContent.audioChunks) {
                    if (closed) return;
                    
                    if (chunk.data) {
                      const decoded = decodeBase64(chunk.data);
                      audioChunks.push(decoded);
                      
                      const base64Chunk = Buffer.from(decoded).toString('base64');
                      safeEnqueue(`event: chunk\ndata: ${JSON.stringify({ audio: base64Chunk })}\n\n`);
                    }
                  }
                }
                
                if (message.serverContent?.setupComplete) {
                  safeEnqueue(`event: playing\ndata: ${JSON.stringify({ status: 'playing' })}\n\n`);
                }
              },
              onerror: (error: any) => {
                console.error('Lyria session error:', error);
                if (!closed) {
                  safeEnqueue(`event: error\ndata: ${JSON.stringify({ error: String(error) })}\n\n`);
                }
              },
              onclose: (event: any) => {
                console.log('Lyria session closed:', event?.reason || 'Completed');
                
                if (audioChunks.length > 0 && !closed) {
                  const combined = combineAudioChunks(audioChunks);
                  safeEnqueue(`event: complete\ndata: ${JSON.stringify({ audio: combined })}\n\n`);
                }
                closed = true;
                controller.close();
              }
            },
          });

          await session.setWeightedPrompts({
            weightedPrompts: weightedPrompts.length > 0 
              ? weightedPrompts.map(p => ({ text: p.text, weight: p.weight }))
              : [{ text: fullPrompt, weight: 1.0 }]
          });

          session.play();

          setTimeout(async () => {
            try {
              if (session?.stop && !closed) {
                await session.stop();
              }
            } catch (e) {
              console.log('Session stop error:', e);
            }
          }, targetDuration * 1000 + 2000);

        } catch (error) {
          console.error('Lyria streaming error:', error);
          if (!closed) {
            safeEnqueue(`event: error\ndata: ${JSON.stringify({ error: String(error) })}\n\n`);
          }
          closed = true;
          controller.close();
        }
      })();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function combineAudioChunks(chunks: Uint8Array[]): string {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }
  return Buffer.from(combined).toString('base64');
}
