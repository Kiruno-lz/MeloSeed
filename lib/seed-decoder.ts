/**
 * Seed Decoder - 将任意字符串种子映射到音乐生成参数
 * 
 * 核心思路：
 * 1. 将输入字符串通过SHA-256哈希为256位数字指纹
 * 2. 取前32位作为LCG PRNG的种子
 * 3. 使用确定性伪随机数生成器生成所有参数
 * 4. 通过音色分类避免冲突
 */

import { createHash } from 'crypto';

// ==================== 类型定义 ====================

/** 音乐生成配置完整参数 */
export interface MusicGenerationConfig {
  /** 内部模型种子 (0-2147483647) */
  seed: number;
  /** BPM: 60-200 */
  bpm: number;
  /** 密度: 0-1 */
  density: number;
  /** 亮度: 0-1 */
  brightness: number;
  /** 调性: 12个调号 */
  scale: string;
  /** 流派 */
  genre: string;
  /** 情绪列表 (1-3个) */
  moods: string[];
  /** 音色组合 (2-6个) */
  instruments: Instrument[];
  /** 指导强度: 0-6 */
  guidance: number;
  /** 温度: 0.0-3.0 */
  temperature: number;
  /** Top K: 1-1000 */
  top_k: number;
  /** 生成模式 */
  music_generation_mode: string;
}

/** 乐器音色 */
export interface Instrument {
  category: InstrumentCategory;
  name: string;
  id: string;
}

/** 乐器分类 */
export type InstrumentCategory = 
  | 'bass'      // 贝斯类
  | 'drums'     // 鼓组类
  | 'synth'     // 合成器类
  | 'keys'      // 键盘类
  | 'guitar'    // 吉他类
  | 'strings'   // 弦乐类
  | 'wind'      // 管乐类
  | 'percussion'// 打击乐类
  | 'ethnic';   // 民族乐器

// ==================== 常量定义 ====================

/** 乐器分类及具体乐器 */
export const INSTRUMENT_CATEGORIES: Record<InstrumentCategory, { id: string; name: string }[]> = {
  bass: [
    { id: '303_acid_bass', name: '303 Acid Bass' },
    { id: 'boomy_bass', name: 'Boomy Bass' },
    { id: 'precision_bass', name: 'Precision Bass' },
    { id: 'sub_bass', name: 'Sub Bass' },
    { id: 'retro_bass', name: 'Retro Bass' },
    { id: 'fm_bass', name: 'FM Bass' },
  ],
  drums: [
    { id: '808_hiphop', name: '808 Hip Hop Beat' },
    { id: 'funk_drums', name: 'Funk Drums' },
    { id: 'tr_909', name: 'TR-909' },
    { id: 'acoustic_drums', name: 'Acoustic Drums' },
    { id: 'electronic_drums', name: 'Electronic Drums' },
    { id: 'breakbeat', name: 'Breakbeat' },
  ],
  synth: [
    { id: 'buchla_synths', name: 'Buchla Synths' },
    { id: 'moog_oscillations', name: 'Moog Oscillations' },
    { id: 'spacey_synths', name: 'Spacey Synths' },
    { id: 'warm_lead', name: 'Warm Lead' },
    { id: 'acid_lead', name: 'Acid Lead' },
    { id: 'pad_synth', name: 'Ambient Pad' },
  ],
  keys: [
    { id: 'rhodes_piano', name: 'Rhodes Piano' },
    { id: 'ragtime_piano', name: 'Ragtime Piano' },
    { id: 'harpsichord', name: 'Harpsichord' },
    { id: 'electric_piano', name: 'Electric Piano' },
    { id: 'organ', name: 'Organ' },
    { id: 'clavinet', name: 'Clavinet' },
  ],
  guitar: [
    { id: 'flamenco_guitar', name: 'Flamenco Guitar' },
    { id: 'shredding_guitar', name: 'Shredding Guitar' },
    { id: 'acoustic_guitar', name: 'Acoustic Guitar' },
    { id: 'nylon_guitar', name: 'Nylon Guitar' },
    { id: 'electric_guitar', name: 'Electric Guitar' },
  ],
  strings: [
    { id: 'cello', name: 'Cello' },
    { id: 'viola_ensemble', name: 'Viola Ensemble' },
    { id: 'harp', name: 'Harp' },
    { id: 'string_ensemble', name: 'String Ensemble' },
    { id: 'violin_solo', name: 'Violin Solo' },
  ],
  wind: [
    { id: 'alto_sax', name: 'Alto Saxophone' },
    { id: 'trumpet', name: 'Trumpet' },
    { id: 'tuba', name: 'Tuba' },
    { id: 'flute', name: 'Flute' },
    { id: 'clarinet', name: 'Clarinet' },
  ],
  percussion: [
    { id: 'bongos', name: 'Bongos' },
    { id: 'marimba', name: 'Marimba' },
    { id: 'steel_drum', name: 'Steel Drum' },
    { id: 'timpani', name: 'Timpani' },
    { id: 'vibraphone', name: 'Vibraphone' },
  ],
  ethnic: [
    { id: 'koto', name: 'Koto' },
    { id: 'pipa', name: 'Pipa' },
    { id: 'shamisen', name: 'Shamisen' },
    { id: 'sitar', name: 'Sitar' },
    { id: 'didgeridoo', name: 'Didgeridoo' },
  ],
};

/** 流派列表 */
export const GENRES = [
  'electronic',
  'pop',
  'rock',
  'jazz',
  'classical',
  'hiphop',
  'rnb',
  'ambient',
  'dance',
  'metal',
  'folk',
  'blues',
  'reggae',
  'country',
  'indie',
];

/** 情绪列表 */
export const MOODS = [
  'happy',
  'sad',
  'energetic',
  'calm',
  'aggressive',
  'romantic',
  'mysterious',
  'uplifting',
  'dark',
  'dreamy',
  'nostalgic',
  'intense',
];

/** 调性列表 (12个调号) */
export const SCALES = [
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
  'B_MAJOR_A_FLAT_MINOR',
];

// ==================== 哈希与随机数生成 ====================

/**
 * 将任意字符串哈希为32位种子
 * 使用SHA-256，取前4字节作为种子
 */
function hashStringToSeed(input: string): number {
  const hash = createHash('sha256').update(input).digest();
  // 取前4字节 (大端序) 作为32位种子
  const seed = (hash[0] << 24) | (hash[1] << 16) | (hash[2] << 8) | hash[3];
  // 转换为无符号整数
  return seed >>> 0;
}

/**
 * 线性同余生成器 (LCG)
 * 参数: a=1664525, c=1013904223, m=2^32
 */
class LCG {
  private state: number;

  constructor(seed: number) {
    this.state = seed;
  }

  /**
   * 生成下一个32位随机数
   */
  next(): number {
    // LCG: next = (a * current + c) mod 2^32
    // a = 1664525, c = 1013904223
    this.state = (1664525 * this.state + 1013904223) >>> 0;
    return this.state;
  }

  /**
   * 生成0-1之间的浮点数
   */
  nextFloat(): number {
    return this.next() / 4294967296;
  }

  /**
   * 生成指定范围内的整数 [min, max]
   */
  nextInt(min: number, max: number): number {
    return min + (this.next() % (max - min + 1));
  }

  /**
   * 从列表中随机选择一项
   */
  pick<T>(items: T[]): T {
    return items[this.next() % items.length];
  }

  /**
   * 从列表中不重复地选择多项
   */
  pickMultiple<T>(items: T[], count: number): T[] {
    const shuffled = [...items];
    // Fisher-Yates 洗牌
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, count);
  }
}

// ==================== 种子解码器 ====================

/**
 * 种子解码器类
 * 将字符串种子确定性映射到音乐生成参数
 */
export class SeedDecoder {
  private lcg: LCG;

  constructor(seedString: string) {
    const seed = hashStringToSeed(seedString);
    this.lcg = new LCG(seed);
  }

  /**
   * 生成完整的音乐生成配置
   */
  generateConfig(): MusicGenerationConfig {
    // 按照固定顺序生成参数
    const seed = this.lcg.nextInt(0, 2147483647);
    const bpm = this.generateBPM();
    const density = this.generateDensity();
    const brightness = this.generateBrightness();
    const scale = this.generateScale();
    const genre = this.generateGenre();
    const moods = this.generateMoods();
    const instruments = this.generateInstruments();
    const guidance = this.generateGuidance();
    const temperature = this.generateTemperature();
    const topK = this.generateTopK();

    return {
      seed,
      bpm,
      density,
      brightness,
      scale,
      genre,
      moods,
      instruments,
      guidance,
      temperature,
      top_k: topK,
      music_generation_mode: 'QUALITY',
    };
  }

  /**
   * 生成BPM: 60-200
   */
  private generateBPM(): number {
    return this.lcg.nextInt(60, 200);
  }

  /**
   * 生成密度: 0-1 (浮点数，保留2位小数)
   */
  private generateDensity(): number {
    return Math.round(this.lcg.nextFloat() * 100) / 100;
  }

  /**
   * 生成亮度: 0-1 (浮点数，保留2位小数)
   */
  private generateBrightness(): number {
    return Math.round(this.lcg.nextFloat() * 100) / 100;
  }

  /**
   * 生成调性
   */
  private generateScale(): string {
    return this.lcg.pick(SCALES);
  }

  /**
   * 生成流派
   */
  private generateGenre(): string {
    return this.lcg.pick(GENRES);
  }

  /**
   * 生成情绪列表 (1-3个，不重复)
   */
  private generateMoods(): string[] {
    // 随机决定情绪数量 (1-3)
    const count = this.lcg.nextInt(1, 3);
    // 使用集合避免重复
    const selected: string[] = [];
    while (selected.length < count) {
      const mood = this.lcg.pick(MOODS);
      if (!selected.includes(mood)) {
        selected.push(mood);
      }
    }
    return selected;
  }

  /**
   * 生成音色组合 (2-6个，不同类别)
   */
  private generateInstruments(): Instrument[] {
    const categories = Object.keys(INSTRUMENT_CATEGORIES) as InstrumentCategory[];
    
    // 随机决定音色数量 (2-6)
    const count = this.lcg.nextInt(2, Math.min(6, categories.length));
    
    // 随机选择不同类别
    const selectedCategories = this.lcg.pickMultiple(categories, count);
    
    // 从每个选中类别中随机选择一个乐器
    const instruments: Instrument[] = [];
    for (const category of selectedCategories) {
      const instrumentList = INSTRUMENT_CATEGORIES[category];
      const instrument = this.lcg.pick(instrumentList);
      instruments.push({
        category,
        name: instrument.name,
        id: instrument.id,
      });
    }

    return instruments;
  }

  /**
   * 生成指导强度: 0-6
   */
  private generateGuidance(): number {
    return this.lcg.nextInt(0, 6);
  }

  /**
   * 生成温度: 0.0-3.0
   */
  private generateTemperature(): number {
    return Math.round(this.lcg.nextFloat() * 3 * 100) / 100;
  }

  /**
   * 生成Top K: 1-1000
   */
  private generateTopK(): number {
    return this.lcg.nextInt(1, 1000);
  }
}

/**
 * 便捷函数：从字符串种子生成音乐配置
 */
export function decodeSeed(seedString: string): MusicGenerationConfig {
  const decoder = new SeedDecoder(seedString);
  return decoder.generateConfig();
}

/**
 * 生成用于显示的音色描述
 */
export function formatInstrumentsForPrompt(instruments: Instrument[]): string {
  return instruments.map(i => i.name).join(', ');
}

/**
 * 生成用于显示的情绪描述
 */
export function formatMoodsForPrompt(moods: string[]): string {
  return moods.join(', ');
}
