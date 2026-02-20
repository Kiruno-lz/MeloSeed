export interface MusicStyle {
  id: string;
  name: string;
  color: string;
  weight: number;
}

export const DEFAULT_STYLES: MusicStyle[] = [
  { id: 'bossanova', name: 'Bossa Nova', color: '#9900ff', weight: 0 },
  { id: 'chillwave', name: 'Chillwave', color: '#5200ff', weight: 0 },
  { id: 'drumandbass', name: 'Drum and Bass', color: '#ff25f6', weight: 0 },
  { id: 'postpunk', name: 'Post Punk', color: '#2af6de', weight: 0 },
  { id: 'shoegaze', name: 'Shoegaze', color: '#ffdd28', weight: 0 },
  { id: 'funk', name: 'Funk', color: '#2af6de', weight: 0 },
  { id: 'chiptune', name: 'Chiptune', color: '#9900ff', weight: 0 },
  { id: 'lushstrings', name: 'Lush Strings', color: '#3dffab', weight: 0 },
  { id: 'sparkling', name: 'Sparkling Arpeggios', color: '#d8ff3e', weight: 0 },
  { id: 'staccato', name: 'Staccato Rhythms', color: '#d9b2ff', weight: 0 },
  { id: 'punchykick', name: 'Punchy Kick', color: '#3dffab', weight: 0 },
  { id: 'dubstep', name: 'Dubstep', color: '#ffdd28', weight: 0 },
  { id: 'kpop', name: 'K-Pop', color: '#ff25f6', weight: 0 },
  { id: 'neosoul', name: 'Neo Soul', color: '#d8ff3e', weight: 0 },
  { id: 'triphop', name: 'Trip Hop', color: '#5200ff', weight: 0 },
  { id: 'thrash', name: 'Thrash Metal', color: '#d9b2ff', weight: 0 },
];

export class SeedToStyleMapper {
  private seed: number;
  private rngState: number;

  constructor(seed: number) {
    this.seed = seed;
    this.rngState = seed;
  }

  private mulberry32(): number {
    let t = this.rngState += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    this.rngState = t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(this.mulberry32() * (max - min + 1)) + min;
  }

  private shuffleArray<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.randomInt(0, i);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  generateStyleMix(styles: MusicStyle[], intensity: number = 0.8): MusicStyle[] {
    const shuffled = this.shuffleArray(styles);
    const activeCount = Math.max(2, Math.floor(styles.length * intensity));
    const selected = shuffled.slice(0, activeCount);
    
    let remaining = 1.0;
    const result: MusicStyle[] = selected.map((style, index) => {
      let weight: number;
      if (index === selected.length - 1) {
        weight = remaining;
      } else {
        const maxWeight = remaining / (selected.length - index);
        weight = this.mulberry32() * maxWeight * 0.7 + 0.1;
        remaining -= weight;
      }
      return { ...style, weight: Math.min(1, Math.max(0.05, weight)) };
    });

    return result.sort((a, b) => b.weight - a.weight);
  }

  generateWeightedPrompts(styles: MusicStyle[]): { text: string; weight: number; color: string }[] {
    const mix = this.generateStyleMix(styles);
    return mix.map(s => ({
      text: s.name,
      weight: s.weight,
      color: s.color
    }));
  }
}

export function seedToHash(seed: number, length: number = 8): string {
  let hash = seed.toString(16);
  while (hash.length < length) {
    hash = (parseInt(hash, 16) * 1103515245 + 12345).toString(16);
  }
  return hash.substring(0, length);
}
