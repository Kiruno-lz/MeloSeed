/**
 * useAudioStream - 音频流处理 Hook
 * 
 * 这个 Hook 封装了 Web Audio API 的音频流处理逻辑，用于实时播放从服务器接收的音频数据。
 * 
 * ## 主要功能
 * - 初始化和管理 AudioContext
 * - 解码 base64 编码的音频块
 * - 无缝拼接和播放音频块
 * - 提供播放/暂停/重置控制
 * 
 * ## 使用场景
 * 1. 创建页面 (page.tsx) - 播放新生成的音乐
 * 2. 收藏页面 (NFTPlayer.tsx) - 播放已铸造的 NFT 音乐
 * 
 * ## 技术细节
 * - 采样率: 48000 Hz
 * - 音频格式: 16-bit PCM (从服务器接收时)
 * - 输出: 立体声 (双通道)
 * - 使用 GainNode 实现平滑的音量过渡
 */

'use client';

import { useRef, useCallback, useState, useEffect } from 'react';

export function useAudioStream() {
  // ============ 状态管理 ============
  
  /** 当前是否正在播放 */
  const [isPlaying, setIsPlaying] = useState(false);
  
  // ============ Refs (用于跨渲染周期保持引用) ============
  
  /** 
   * AudioContext 实例
   * - Web Audio API 的核心对象
   * - 管理音频处理图和音频输出
   * - 采样率设为 48000 Hz 以匹配服务器端
   */
  const audioContextRef = useRef<AudioContext | null>(null);
  
  /**
   * GainNode 实例
   * - 用于控制音量
   * - 支持平滑的音量过渡 (防止爆音)
   * - 连接在 AudioBufferSourceNode 和 destination 之间
   */
  const gainNodeRef = useRef<GainNode | null>(null);
  
  /**
   * 下一个音频块的预定开始时间
   * - 用于实现无缝拼接
   * - 每次播放新块时更新为当前块的结束时间
   */
  const nextStartTimeRef = useRef<number>(0);
  
  /**
   * 播放状态的同步引用
   * - 用于在回调函数中访问最新的播放状态
   * - 避免 useState 的闭包问题
   */
  const isPlayingRef = useRef(false);
  
  /**
   * 活跃的音频源节点列表
   * - 用于追踪当前正在播放的所有 AudioBufferSourceNode
   * - 在停止播放时需要全部停止并清空
   */
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);

  // ============ 核心方法 ============

  /**
   * 初始化 AudioContext
   * 
   * 采用懒加载模式，只在第一次需要时创建。
   * 创建时会同时创建 GainNode 并连接到 destination。
   * 
   * @returns AudioContext 实例
   */
  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext({ sampleRate: 48000 });
      gainNodeRef.current = audioContextRef.current.createGain();
      // 初始音量设为 0，通过 linearRampToValueAtTime 渐入
      gainNodeRef.current.gain.setValueAtTime(0, audioContextRef.current.currentTime);
      gainNodeRef.current.connect(audioContextRef.current.destination);
    }
    // 处理浏览器的自动播放策略
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  /**
   * 解码音频块
   * 
   * 将 base64 编码的 16-bit PCM 音频数据解码为 Float32Array。
   * 
   * 输入格式:
   * - base64 编码的二进制数据
   * - 原始格式: 16-bit signed integer PCM
   * 
   * 输出格式:
   * - Float32Array
   * - 范围: -1.0 到 1.0
   * 
   * @param base64Data - base64 编码的音频数据
   * @returns 解码后的浮点音频数据
   */
  const decodeAudioChunk = useCallback((base64Data: string): Float32Array => {
    // Step 1: Base64 解码为二进制
    const binaryString = atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Step 2: 将 16-bit PCM 转换为 Float32
    // 32768 = 2^15，16-bit 有符号整数的范围
    const int16Array = new Int16Array(bytes.buffer, bytes.byteOffset, bytes.length / 2);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768;
    }
    
    return float32Array;
  }, []);

  /**
   * 播放音频块
   * 
   * 将解码后的音频数据创建为 AudioBuffer 并调度播放。
   * 使用 nextStartTime 实现无缝拼接。
   * 
   * @param base64Audio - base64 编码的音频数据
   */
  const playChunk = useCallback((base64Audio: string) => {
    // 如果未处于播放状态，不执行
    if (!isPlayingRef.current) return;
    
    const ctx = initAudioContext();
    const floatData = decodeAudioChunk(base64Audio) as Float32Array<ArrayBuffer>;
    
    // 创建立体声 AudioBuffer (2 通道)
    const audioBuffer = ctx.createBuffer(2, floatData.length, 48000);
    audioBuffer.copyToChannel(floatData, 0); // 左声道
    audioBuffer.copyToChannel(floatData, 1); // 右声道 (复制左声道)
    
    // 创建音频源节点
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    
    // 连接到 GainNode (如果存在) 或直接连接到 destination
    if (gainNodeRef.current) {
      source.connect(gainNodeRef.current);
    } else {
      source.connect(ctx.destination);
    }
    
    // 计算播放时间
    const currentTime = ctx.currentTime;
    if (nextStartTimeRef.current < currentTime) {
      // 如果预定时间已过，立即开始 (加一点延迟避免爆音)
      nextStartTimeRef.current = currentTime + 0.1;
    }
    
    // 调度播放
    source.start(nextStartTimeRef.current);
    nextStartTimeRef.current += audioBuffer.duration;
    
    // 追踪活跃的音频源
    activeSourcesRef.current.push(source);
    
    // 播放结束后从列表中移除
    source.onended = () => {
      const index = activeSourcesRef.current.indexOf(source);
      if (index > -1) {
        activeSourcesRef.current.splice(index, 1);
      }
    };
  }, [initAudioContext, decodeAudioChunk]);

  /**
   * 开始播放
   * 
   * 设置播放状态并启动音量渐入效果。
   */
  const startPlaying = useCallback(() => {
    isPlayingRef.current = true;
    setIsPlaying(true);
    
    const ctx = initAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    // 音量渐入: 0 → 1, 持续 0.1 秒
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.cancelScheduledValues(ctx.currentTime);
      gainNodeRef.current.gain.setValueAtTime(0, ctx.currentTime);
      gainNodeRef.current.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.1);
    }
  }, [initAudioContext]);

  /**
   * 停止播放
   * 
   * 停止所有活跃的音频源并重置状态。
   * 不会关闭 AudioContext，以便后续继续使用。
   */
  const stopPlaying = useCallback(() => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    
    // 静音
    if (audioContextRef.current && gainNodeRef.current) {
      gainNodeRef.current.gain.cancelScheduledValues(audioContextRef.current.currentTime);
      gainNodeRef.current.gain.setValueAtTime(0, audioContextRef.current.currentTime);
    }
    
    // 停止所有活跃的音频源
    activeSourcesRef.current.forEach(source => {
      try {
        source.stop();
      } catch (e) {
        // 忽略已停止的源
      }
    });
    activeSourcesRef.current = [];
    nextStartTimeRef.current = 0;
  }, []);

  /**
   * 切换播放/暂停
   */
  const togglePlayPause = useCallback(() => {
    if (isPlayingRef.current) {
      stopPlaying();
    } else {
      startPlaying();
    }
  }, [startPlaying, stopPlaying]);

  /**
   * 完全重置
   * 
   * 停止播放并关闭 AudioContext。
   * 用于开始新的流或组件卸载时。
   */
  const reset = useCallback(() => {
    stopPlaying();
    
    if (audioContextRef.current) {
      if (gainNodeRef.current) {
        gainNodeRef.current.disconnect();
      }
      audioContextRef.current.close();
      audioContextRef.current = null;
      gainNodeRef.current = null;
    }
  }, [stopPlaying]);

  // ============ 生命周期 ============

  /**
   * 组件卸载时清理资源
   */
  useEffect(() => {
    return () => {
      activeSourcesRef.current.forEach(source => {
        try {
          source.stop();
        } catch (e) {}
      });
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // ============ 导出 API ============

  return {
    // 状态
    isPlaying,
    isPlayingRef,
    
    // Refs (供高级用法)
    audioContextRef,
    gainNodeRef,
    nextStartTimeRef,
    
    // 方法
    initAudioContext,
    decodeAudioChunk,
    playChunk,
    startPlaying,
    stopPlaying,
    togglePlayPause,
    reset
  };
}
