export interface IMusicGenerator {
  generate(prompt: string, seed: number, duration?: number): Promise<ArrayBuffer>;
}

export interface IMusicAnalyzer {
  analyze(audioData: ArrayBuffer): Promise<MusicAnalysisResult>;
}

export interface GenerationResult {
  audio: string; // Base64 or URL
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
