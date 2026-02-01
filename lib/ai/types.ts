export interface IMusicGenerator {
  generate(prompt: string, seed: number, duration?: number): Promise<ArrayBuffer>;
}

export interface GenerationResult {
  audio: string; // Base64 or URL
  seed: number;
  prompt: string;
}
