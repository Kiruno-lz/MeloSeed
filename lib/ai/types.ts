export interface IMusicGenerator {
  generate(options: MusicGenerationOptions): Promise<MusicGenerationResult>;
}

export interface MusicGenerationOptions {
  seed: number;
  prompt?: string;
  style?: string;
  duration?: number;
  bpm?: number;
}

export interface StyleMixItem {
  name: string;
  weight: number;
  color: string;
}

export interface MusicGenerationResult {
  audioBase64: string;
  audioFormat: string;
  seed: number;
  styleMix?: StyleMixItem[];
  seedHash?: string;
}

export interface IMusicAnalyzer {
  analyze(audioData: ArrayBuffer): Promise<MusicAnalysisResult>;
}

export interface IMusicAnalyzerWithCover {
  analyzeAndGenerateCover(audioData: ArrayBuffer): Promise<CompleteMusicMetadata>;
}

export interface GenerationResult {
  audio: string;
  seed: number;
  prompt: string;
}

export interface MusicAnalysisResult {
  title: string;
  description: string;
  tags: string[];
  mood: string;
  genre: string;
}

export interface CompleteMusicMetadata {
  title: string;
  description: string;
  tags: string[];
  mood: string;
  genre: string;
  coverUrl: string;
}
