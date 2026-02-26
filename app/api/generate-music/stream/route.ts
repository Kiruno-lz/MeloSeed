import { NextRequest } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { SeedToStyleMapper, DEFAULT_STYLES, seedToHash } from '@/lib/seed-mapper';

const MODEL_VERSIONS: Record<string, string> = {
  'Lyria RealTime': 'models/lyria-realtime-exp',
  'Lyria RealTime Exp': 'models/lyria-realtime-exp',
};

const DEFAULT_MODEL = 'models/lyria-realtime-exp';

// Session storage: sessionId -> { session, createdAt, token }
// NOTE: In serverless environments (Vercel, AWS Lambda), this in-memory storage
// has limitations:
// - Sessions are lost on cold starts
// - Sessions are not shared between function instances
// For production, consider using Redis or similar external storage.
const activeSessions = new Map<string, {
  session: any;
  createdAt: number;
  token: string; // Token for ownership validation
}>();

// Session timeout: 5 minutes
const SESSION_TIMEOUT_MS = 5 * 60 * 1000;

// Clean up expired sessions periodically
setInterval(() => {
  const now = Date.now();
  const entries = Array.from(activeSessions.entries());
  for (const [sessionId, info] of entries) {
    if (now - info.createdAt > SESSION_TIMEOUT_MS) {
      console.log(`🧹 Cleaning up expired session: ${sessionId}`);
      activeSessions.delete(sessionId);
    }
  }
}, 60000); // Check every minute

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Generate a secure token for session ownership validation
 */
function generateToken(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Music Generation Config derived from seed
 * 
 * These configuration parameters will be deterministically derived from the seed,
 * ensuring the same seed always produces consistent music characteristics.
 * 
 * Parameters:
 * - guidance: Controls how closely the generation follows the prompt (higher = more faithful)
 * - bpm: Beats per minute - tempo of the music
 * - density: How busy/complex the arrangement is
 * - brightness: Brightness/timbre of the sound
 * - scale: Musical scale for melody generation
 * - music_generation_mode: Generation mode (e.g., 'melody', 'full', 'accompaniment')
 * - temperature: Randomness in generation (higher = more creative/unpredictable)
 * - top_k: Number of top candidates to consider during generation
 * - seed: Random seed for reproducible results
 */
interface MusicGenerationConfig {
  guidance?: number;
  bpm?: number;
  density?: number;
  brightness?: number;
  scale?: string;
  music_generation_mode?: string;
  temperature?: number;
  top_k?: number;
  seed?: number;
  audioFormat?: string;
  sampleRateHz?: number;
}

/**
 * Derive music generation config from seed
 * 
 * Uses the seed to generate deterministic values for each parameter.
 * The seed ensures reproducibility - same seed always produces same config.
 * 
 * @param seed - The music seed
 * @param customConfig - Optional custom config to override derived values
 * @returns Complete music generation config
 */
function deriveMusicConfig(seed: number, customConfig?: Partial<MusicGenerationConfig>): MusicGenerationConfig {
  // Simple deterministic random using seed
  const seededRandom = (index: number): number => {
    const x = Math.sin(seed * 9999 + index * 999) * 10000;
    return x - Math.floor(x);
  };
  
  // Map seed to value range
  const mapToRange = (index: number, min: number, max: number): number => {
    return min + seededRandom(index) * (max - min);
  };
  
  // Map seed to discrete options
  const pickOption = (index: number, options: string[]): string => {
    const idx = Math.floor(seededRandom(index) * options.length);
    return options[idx % options.length];
  };
  
  // Musical scales
  const scales = [
    'C_MAJOR_A_MINOR', 
    'D_FLAT_MAJOR_B_FLAT_MINOR',
    'D_MAJOR_B_MINOR', 
    'E_FLAT_MAJOR_C_MINOR', 
    'E_MAJOR_D_FLAT_MINOR', 
    'F_MAJOR_D_MINOR', 
    'G_FLAT_MAJOR_E_FLAT_MINOR', 
    'G_MAJOR_E_MINOR',
    'A_FLAT_MAJOR_F_MINOR',
    'A_MAJOR_G_FLAT_MINOR',
    'B_FLAT_MAJOR_G_MINOR',
    'B_MAJOR_A_FLAT_MINOR'
  ];
  
  // Base config derived from seed
  const derived: MusicGenerationConfig = {
    // Guidance: 0-6, default around 6
    guidance: 6,
    
    // BPM: 60-200, typical range for electronic music
    bpm: Math.round(mapToRange(1, 60, 200)),
    
    // Density: 0-1, how busy the arrangement is
    density: Math.round(mapToRange(1, 0, 1)),
    
    // Brightness: 0-1, brightness/timbre of sound
    brightness: Math.round(mapToRange(1, 0, 1)),
    
    // Scale: musical scale
    scale: pickOption(12, scales),
    // scale: 'SCALE_UNSPECIFIED',
    
    // Music generation mode
    music_generation_mode: 'QUALITY',
    
    // Temperature: 0.0-3.0, randomness in generation
    temperature: parseFloat(mapToRange(1, 0, 3).toFixed(2)),
    
    // Top K: 1-1000, number of candidates
    top_k: Math.round(mapToRange(1, 1, 1000)),
    
    // Seed: use the provided seed
    seed: seed,
    
  };
  
  // Override with custom config if provided
  return { ...derived, ...customConfig };
}

/**
 * POST /api/generate-music/stream - Create and start a music generation session
 * Also handles control requests via JSON body with 'action' field
 */
export async function POST(req: NextRequest) {
  // Check if this is a control request by reading the body first
  // We clone the request to avoid consuming the body stream
  let body: any = null;
  let isControlRequest = false;
  
  try {
    // Clone and parse to check if this is a control request
    const clonedReq = req.clone();
    body = await clonedReq.json();
    
    if (body && body.action) {
      isControlRequest = true;
    }
  } catch (e) {
    // Not JSON, treat as stream request
    isControlRequest = false;
  }
  
  // Handle control requests
  if (isControlRequest && body) {
    return handleControlRequest(body);
  }
  
  // Handle the original streaming request
  // Note: The original req body is still available since we used req.clone()
  return handleStreamRequest(req);
}

/**
 * Handle session control requests (pause, stop, reset)
 */
async function handleControlRequest(body: {
  action: 'pause' | 'stop' | 'reset';
  sessionId: string;
  token: string; // Token for ownership validation
}) {
  const { action, sessionId, token } = body;
  
  console.log(`🎮 Control request: ${action} for session ${sessionId}`);
  
  const sessionInfo = activeSessions.get(sessionId);
  
  if (!sessionInfo) {
    console.log(`⚠️ Session not found: ${sessionId}`);
    return Response.json({ 
      success: false, 
      error: 'Session not found or expired' 
    }, { status: 404 });
  }
  
  // Validate token for ownership
  if (sessionInfo.token !== token) {
    console.log(`⚠️ Invalid token for session: ${sessionId}`);
    return Response.json({ 
      success: false, 
      error: 'Invalid session token' 
    }, { status: 403 });
  }
  
  try {
    const { session } = sessionInfo;
    
    switch (action) {
      case 'pause':
        await session.pause();
        console.log(`⏸️ Session paused: ${sessionId}`);
        break;
        
      case 'stop':
        await session.stop();
        activeSessions.delete(sessionId);
        console.log(`⏹️ Session stopped and cleaned up: ${sessionId}`);
        break;
        
      case 'reset':
        await session.reset_context();
        console.log(`🔄 Session context reset: ${sessionId}`);
        break;
        
      default:
        return Response.json({ 
          success: false, 
          error: `Unknown action: ${action}` 
        }, { status: 400 });
    }
    
    return Response.json({ success: true });
  } catch (error) {
    console.error(`❌ Error controlling session ${sessionId}:`, error);
    // Clean up the session on error
    activeSessions.delete(sessionId);
    return Response.json({ 
      success: false, 
      error: String(error) 
    }, { status: 500 });
  }
}

/**
 * Handle the original streaming request
 */
function handleStreamRequest(req: NextRequest) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      let sessionId: string | null = null;
      let sessionToken: string | null = null;
      
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
          const { prompt, seed, style, duration, bpm, modelVersion } = await req.json();
          const targetSeed = seed || Math.floor(Math.random() * 1000000);
          const targetDuration = duration || 15;

          const mapper = new SeedToStyleMapper(targetSeed);
          const weightedPrompts = mapper.generateWeightedPrompts(DEFAULT_STYLES);
          
          const styleTexts = weightedPrompts.map(p => `${p.text} (${Math.round(p.weight * 100)}%)`).join(', ');
          const fullPrompt = `${styleTexts}${prompt ? `, ${prompt}` : ''}`.trim();

          const seedHash = seedToHash(targetSeed);
          
          // Generate session ID and token
          sessionId = generateSessionId();
          const sessionToken = generateToken();
          
          safeEnqueue(`event: init\ndata: ${JSON.stringify({
            seed: targetSeed,
            seedHash,
            styleMix: weightedPrompts.map(p => ({ name: p.text, weight: p.weight, color: p.color })),
            sessionId,
            sessionToken
          })}\n\n`);

          console.log(`🌱 Seed ${targetSeed} -> Hash: ${seedHash}`);
          console.log('🎵 Style Mix:', weightedPrompts.map(p => `${p.text}:${Math.round(p.weight*100)}%`).join(' | '));
          console.log(`🔑 Session ID: ${sessionId}`);

          const client = new GoogleGenAI({ apiKey: apiKey, apiVersion: 'v1alpha' });
          const model = modelVersion && MODEL_VERSIONS[modelVersion] 
            ? MODEL_VERSIONS[modelVersion] 
            : DEFAULT_MODEL;
          
          console.log(`🔊 Starting streaming with model: ${model} (version: ${modelVersion || 'default'})`);
          
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
                
                // Clean up session
                if (sessionId) {
                  activeSessions.delete(sessionId);
                  console.log(`🗑️ Session cleaned up: ${sessionId}`);
                }
                
                if (audioChunks.length > 0 && !closed) {
                  const combined = combineAudioChunks(audioChunks);
                  safeEnqueue(`event: complete\ndata: ${JSON.stringify({ audio: combined })}\n\n`);
                }
                if (!closed) {
                  closed = true;
                  try {
                    controller.close();
                  } catch (e) {
                    console.log('Controller already closed');
                  }
                }
              }
            },
          });

          // Store session for later control
          if (sessionId) {
            activeSessions.set(sessionId, {
              session,
              createdAt: Date.now(),
              token: sessionToken
            });
          }

          await session.setWeightedPrompts({
            weightedPrompts: weightedPrompts.length > 0 
              ? weightedPrompts.map(p => ({ text: p.text, weight: p.weight }))
              : [{ text: fullPrompt, weight: 1.0 }]
          });

          // Derive music generation config from seed
          const musicConfig = deriveMusicConfig(targetSeed, { bpm });
          
          console.log('🎛️ Music config:', {
            bpm: musicConfig.bpm,
            guidance: musicConfig.guidance,
            density: musicConfig.density,
            brightness: musicConfig.brightness,
            scale: musicConfig.scale,
            mode: musicConfig.music_generation_mode,
            temperature: musicConfig.temperature,
            top_k: musicConfig.top_k,
            seed: musicConfig.seed
          });
          
          // Use type assertion to handle the library's specific types
          await session.setMusicGenerationConfig({
            musicGenerationConfig: musicConfig as any
          });

          session.play();

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
