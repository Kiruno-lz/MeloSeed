/**
 * NFTPlayer - NFT 收藏播放器组件
 * 
 * 这个组件用于显示和播放用户收藏的 NFT 音乐。
 * 它支持两种模式：
 * 1. 收藏模式 - 从区块链加载 NFT 数据并播放
 * 2. 预览模式 - 显示预览数据（用于未来的功能扩展）
 * 
 * ## 主要功能
 * - 从下拉列表或 Token ID 输入框选择 NFT
 * - 从链上读取 NFT 元数据
 * - 通过 SSE 流重新生成并播放音乐
 * - 支持销毁 (burn) NFT
 * 
 * ## 数据流
 * 1. 用户选择 NFT → 查询 getTokenData 获取 seed 和 metadataUri
 * 2. 解析 metadataUri (base64 JSON) 获取标题、描述、封面图
 * 3. 点击播放 → 调用 /api/generate-music/stream 重新生成音乐
 * 4. 使用 useAudioStream hook 实时播放音频块
 * 
 * ## 注意事项
 * - 音乐不是存储在链上的，而是根据 seed 重新生成的
 * - 这保证了相同 seed 始终生成相同的音乐（确定性生成）
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useConfig, useWriteContract, useAccount } from 'wagmi';
import { readContract } from 'wagmi/actions';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlayCircle, Search, Disc, Flame, ChevronDown, Music, Pause } from 'lucide-react';
import { useToast } from '@/components/Toast';
import * as Popover from '@radix-ui/react-popover';
import { CONTRACT_ADDRESS, MELO_SEED_ABI } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { SeedToStyleMapper, DEFAULT_STYLES, seedToHash } from '@/lib/seed-mapper';
import { useAudioStream } from '@/lib/hooks/useAudioStream';

// ============ 类型定义 ============

/** 风格混合项 */
interface StyleMixItem {
  name: string;
  weight: number;
  color: string;
}

/** 从链上读取的 NFT 数据 */
interface NFTData {
  seed: number;
  metadataUri: string;
  parsedMetadata?: {
    name: string;
    description: string;
    image: string;
    attributes: Array<{ trait_type: string; value: string }>;
  };
  modelVersion?: string;
}

/** 组件 Props */
interface NFTPlayerProps {
  /** 用户拥有的 NFT Token ID 列表 */
  collectionIds?: bigint[];
  /** 预览数据（用于未来的预览功能） */
  previewData?: {
    audioSrc: string;
    coverImage: string | null;
    title: string;
    description: string;
    seed: number;
  } | null;
  /** NFT 销毁后的回调 */
  onBurn?: () => void;
  /** 自定义类名 */
  className?: string;
}

// ============ 组件实现 ============

export function NFTPlayer({ collectionIds = [], previewData, className, onBurn }: NFTPlayerProps) {
  // ============ Wagmi Hooks ============
  const config = useConfig();
  const { address } = useAccount();
  
  /** 是否为预览模式 */
  const isPreview = !!previewData;

  // ============ 状态管理 ============
  
  /** 用户输入的 Token ID */
  const [tokenId, setTokenId] = useState<string>('');
  
  /** 查询状态：当前查询的 ID 和重试次数 */
  const [queryState, setQueryState] = useState<{ id: bigint | null; attempts: number }>({ id: null, attempts: 0 });
  
  /** 显示的错误信息 */
  const [displayError, setDisplayError] = useState<string | null>(null);
  
  /** NFT 选择下拉框的开关状态 */
  const [openCombobox, setOpenCombobox] = useState(false);
  
  /** 是否正在流式生成音乐 */
  const [isStreaming, setIsStreaming] = useState(false);
  
  /** 当前音乐的风格混合 */
  const [styleMix, setStyleMix] = useState<StyleMixItem[]>([]);
  
  // ============ 音频处理 ============
  
  /**
   * useAudioStream Hook
   * 提供：
   * - isPlaying: 当前是否正在播放
   * - playChunk(): 播放音频块
   * - startPlaying(): 开始播放
   * - stopPlaying(): 停止播放
   * - reset(): 完全重置
   */
  const audioStream = useAudioStream();
  
  /** 用于取消流请求的 AbortController */
  const abortControllerRef = useRef<AbortController | null>(null);
  
  /** 当前会话的 sessionId */
  const sessionIdRef = useRef<string | null>(null);
  
  /** 当前会话的 token */
  const sessionTokenRef = useRef<string | null>(null);

  /** 当前正在播放的 seed（防止重复启动） */
  const currentSeedRef = useRef<number | null>(null);
  
  // ============ 合约交互 ============
  
  const { writeContract, isPending: isBurning, isSuccess: isBurnSuccess, error: burnError, reset: resetBurnState } = useWriteContract();
  const { showToast } = useToast();
  
  /**
   * 服务器端会话控制
   * 
   * 向服务器发送控制请求来暂停/停止 Lyria 会话
   */
  const serverControl = useCallback(async (action: 'pause' | 'stop' | 'reset') => {
    const sessionId = sessionIdRef.current;
    const token = sessionTokenRef.current;
    if (!sessionId || !token) {
      return;
    }
    
    try {
      await fetch('/api/generate-music/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, sessionId, token })
      });
    } catch (e) {
      console.error('Failed to control session:', e);
    }
  }, []);

  /** 使用 ref 存储回调，避免 useEffect 依赖问题 */
  const onBurnRef = useRef(onBurn);
  const showToastRef = useRef(showToast);
  
  useEffect(() => {
    onBurnRef.current = onBurn;
    showToastRef.current = showToast;
  }, [onBurn, showToast]);

  // ============ 数据获取函数 ============

  /**
   * 从链上获取 Token 数据
   * 
   * @param id - Token ID
   * @param attempt - 当前尝试次数（影响超时时间）
   * @returns NFT 数据
   */
  const fetchTokenData = async (id: bigint, attempt: number) => {
    // 前两次尝试使用较短超时，之后使用长超时
    const timeoutDuration = attempt < 2 ? 5000 : 60000;
    
    const fetchPromise = readContract(config, {
      address: CONTRACT_ADDRESS,
      abi: MELO_SEED_ABI,
      functionName: 'getTokenData',
      args: [id],
    });
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Timeout')), timeoutDuration);
    });

    const data = await Promise.race([fetchPromise, timeoutPromise]) as [bigint, string];
    
    // 解析元数据
    let parsedMetadata = undefined;
    let modelVersion: string | undefined;
    
    if (data[1]) {
      try {
        let jsonStr = '';
        
        // 支持 base64 编码的 JSON
        if (data[1].startsWith('data:application/json;base64,')) {
          const base64Str = data[1].slice('data:application/json;base64,'.length);
          jsonStr = atob(base64Str);
          // 处理 UTF-8 编码
          jsonStr = decodeURIComponent(jsonStr.split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
        } else if (data[1].startsWith('data:application/json,')) {
          // 支持直接 URL 编码的 JSON
          jsonStr = decodeURIComponent(data[1].slice('data:application/json,'.length));
        }
        
        if (jsonStr) {
          parsedMetadata = JSON.parse(jsonStr);
          // 提取 Model Version 属性
          const modelAttr = parsedMetadata.attributes?.find(
            (attr: { trait_type: string; value: string }) => attr.trait_type === 'Model Version'
          );
          modelVersion = modelAttr?.value;
        }
      } catch (e) {
        console.error('Failed to parse metadata:', e);
      }
    }
    
    return {
      seed: Number(data[0]),
      metadataUri: data[1],
      parsedMetadata,
      modelVersion
    };
  };

  // ============ React Query 查询 ============

  /** 查询 Token 数据 */
  const { data: nftData, isFetching, error: fetchError } = useQuery({
    queryKey: ['tokenData', queryState.id?.toString(), queryState.attempts],
    queryFn: () => queryState.id === null ? null : fetchTokenData(queryState.id, queryState.attempts),
    enabled: !isPreview && queryState.id !== null,
    retry: false,
  });

  /** 当 NFT 数据变化时，更新风格混合 */
  useEffect(() => {
    if (nftData) {
      // 根据 seed 生成确定性的风格混合
      const mapper = new SeedToStyleMapper(nftData.seed);
      const mix = mapper.generateWeightedPrompts(DEFAULT_STYLES).map(s => ({
        name: s.text,
        weight: s.weight,
        color: s.color
      }));
      setStyleMix(mix);
    }
  }, [nftData]);

  // ============ 派生状态和事件处理 ============

  /** 综合错误信息 */
  const effectiveError = displayError || (fetchError ? (fetchError instanceof Error ? fetchError.message : "Failed to load NFT") : null);

  /**
   * 处理 Token ID 搜索
   */
  const handleSearch = () => {
    if (tokenId === '') return;
    try {
      const id = BigInt(tokenId);
      if (queryState.id === id) {
        // 重复搜索同一 ID，增加重试次数
        setQueryState(prev => ({ ...prev, attempts: prev.attempts + 1 }));
      } else {
        // 搜索新 ID
        stopStream();
        setQueryState({ id, attempts: 0 });
      }
      setDisplayError(null);
    } catch (e) { 
      setDisplayError("Invalid Token ID"); 
    }
  };

  /**
   * 从下拉列表选择 NFT
   */
  const handleSelectNFT = (id: bigint) => {
    stopStream();
    setTokenId(id.toString());
    setOpenCombobox(false);
    setQueryState({ id, attempts: 0 });
  };

  /** 查询用户对当前 Token 的持有量 */
  const { data: balance } = useQuery({
    queryKey: ['balance', address, queryState.id?.toString()],
    queryFn: async () => {
      if (!address || queryState.id === null) return null;
      return readContract(config, {
        address: CONTRACT_ADDRESS,
        abi: MELO_SEED_ABI,
        functionName: 'balanceOf',
        args: [address, queryState.id],
      });
    },
    enabled: !!address && queryState.id !== null,
  });

  /** 用户是否拥有当前 Token */
  const isOwner = balance ? balance > BigInt(0) : false;

  /**
   * 销毁 NFT
   */
  const handleBurn = () => {
    if (queryState.id === null || !address || !isOwner) return;
    if (!confirm("Permanently destroy this NFT?")) return;
    stopStream();
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: MELO_SEED_ABI,
      functionName: 'burn',
      args: [address, queryState.id, BigInt(1)],
    });
  };

  // ============ 音乐流处理 ============

  /**
   * 启动音乐生成流
   * 
   * 与 page.tsx 中的 startStreaming 类似，但：
   * - 不生成标题和封面（这些已经在铸造时生成并存储在链上）
   * - 只处理 chunk, complete, error 事件
   * 
   * @param seed - 音乐种子
   * @param style - 风格描述
   * @param duration - 时长
   * @param bpm - 节拍
   * @param modelVersion - 模型版本
   */
  const startStream = useCallback(async (seed: number, style: string, duration: number, bpm: number, modelVersion?: string) => {
    // 防止重复启动同一 seed 的流
    if (currentSeedRef.current === seed && isStreaming) return;
    
    // 先停止之前的会话
    if (sessionIdRef.current) {
      await serverControl('stop');
      sessionIdRef.current = null;
    }
    
    // 中断之前的流
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // 重置音频状态
    audioStream.reset();
    
    setIsStreaming(true);
    audioStream.startPlaying();
    currentSeedRef.current = seed;

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/generate-music/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: '', seed, style, duration, bpm, modelVersion }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';
        
        for (const event of events) {
          if (!event.trim()) continue;
          
          const lines = event.split('\n');
          let eventType = '';
          let eventData = '';
          
          for (const line of lines) {
            if (line.startsWith('event:')) eventType = line.slice(6).trim();
            else if (line.startsWith('data:')) eventData = line.slice(5).trim();
          }
          
          if (eventType && eventData) {
            try {
              const parsed = JSON.parse(eventData);
              
              if (eventType === 'chunk' && parsed.audio) {
                audioStream.playChunk(parsed.audio);
              } else if (eventType === 'init' && parsed.sessionId) {
                sessionIdRef.current = parsed.sessionId;
                sessionTokenRef.current = parsed.sessionToken || null;
              } else if (eventType === 'complete') {
                setIsStreaming(false);
              } else if (eventType === 'error') {
                setDisplayError(parsed.error || 'Stream error');
                setIsStreaming(false);
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }
      }
      
      setIsStreaming(false);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Stream error:', err);
        setDisplayError(String(err));
      }
      setIsStreaming(false);
      audioStream.stopPlaying();
    }
  }, [isStreaming, audioStream]);

  /**
   * 停止音乐流
   */
  const stopStream = useCallback(async () => {
    // 停止服务器端会话
    if (sessionIdRef.current) {
      await serverControl('stop');
      sessionIdRef.current = null;
      sessionTokenRef.current = null;
    }
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    audioStream.reset();
    setIsStreaming(false);
    currentSeedRef.current = null;
  }, [audioStream, serverControl]);

  // ============ 副作用 ============

  /** 处理销毁成功/失败 */
  useEffect(() => {
    if (isBurnSuccess) {
      showToastRef.current("NFT Burned Successfully!", "success");
      setTokenId('');
      setQueryState({ id: null, attempts: 0 });
      stopStream();
      resetBurnState();
      if (onBurnRef.current) onBurnRef.current();
    }
    if (burnError) {
      showToastRef.current("Failed to burn NFT: " + burnError.message, "error");
      resetBurnState();
    }
  }, [isBurnSuccess, burnError, stopStream, resetBurnState]);

  // ============ 事件处理 ============

  /**
   * 处理播放/暂停按钮点击
   */
  const handlePlayPause = () => {
    if (!nftData) return;
    
    if (audioStream.isPlaying || isStreaming) {
      stopStream();
    } else {
      startStream(
        nftData.seed,
        'calm, soothing, gentle, relaxing, soft melody, ambient, peaceful, dreamy',
        15,
        80,
        nftData.modelVersion
      );
    }
  };

  // ============ 派生显示数据 ============

  const finalData = isPreview ? previewData : nftData;
  const coverImage = isPreview ? previewData?.coverImage : (nftData?.parsedMetadata?.image ?? null);
  const title = isPreview ? previewData?.title : (nftData?.parsedMetadata?.name || "Select an NFT");
  const description = isPreview ? previewData?.description : (nftData?.parsedMetadata?.description ?? '');
  const seed = isPreview ? previewData?.seed : nftData?.seed;
  const seedHash = seed !== undefined ? seedToHash(seed) : undefined;

  // ============ 渲染 ============

  return (
    <div className={cn("w-full max-w-lg mx-auto transition-all duration-500", className)}>
      <div className="relative glass-card rounded-3xl overflow-hidden p-1">
        
        {/* NFT 选择器（仅非预览模式） */}
        {!isPreview && (
          <div className="p-6 pb-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2 text-foreground/80">
                <Disc className="w-5 h-5 text-primary" />
                Sonic Garden
              </h3>
              
              {/* NFT 下拉选择器 */}
              <div className="flex items-center gap-2">
                <Popover.Root open={openCombobox} onOpenChange={setOpenCombobox}>
                  <Popover.Trigger asChild>
                    <Button variant="outline" size="sm" className="rounded-full border-primary/20 hover:bg-primary/5">
                      {collectionIds.length > 0 ? `${collectionIds.length} Available` : "Empty"}
                      <ChevronDown className="w-3 h-3 ml-2 opacity-50" />
                    </Button>
                  </Popover.Trigger>
                  <Popover.Portal>
                    <Popover.Content className="w-[240px] p-2 bg-popover border rounded-xl shadow-xl z-50 animate-in zoom-in-95" align="end">
                      <div className="max-h-[200px] overflow-y-auto space-y-1">
                        {collectionIds.length === 0 ? (
                          <p className="text-xs text-center py-4 text-muted-foreground">Your garden is empty.</p>
                        ) : (
                          collectionIds.map(id => (
                            <button
                              key={id.toString()}
                              onClick={() => handleSelectNFT(id)}
                              className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-secondary transition-colors flex items-center justify-between"
                            >
                              <span>#{id.toString()}</span>
                              <PlayCircle className="w-3 h-3 text-primary" />
                            </button>
                          ))
                        )}
                      </div>
                    </Popover.Content>
                  </Popover.Portal>
                </Popover.Root>
              </div>
            </div>

            {/* Token ID 输入框 */}
            <div className="relative group">
              <Input 
                value={tokenId}
                onChange={(e) => setTokenId(e.target.value)}
                placeholder="Or enter Token ID..."
                className="rounded-full bg-secondary/30 border-transparent focus:border-primary/50 focus:bg-background transition-all pr-12"
              />
              <Button 
                size="icon" 
                variant="ghost" 
                onClick={handleSearch}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full hover:bg-primary/10 text-primary"
                disabled={isFetching}
              >
                {isFetching ? <span className="animate-spin text-xs">⏳</span> : <Search className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        )}

        {/* 封面图和播放器 */}
        <div className="relative aspect-square md:aspect-[4/3] w-full bg-gradient-to-br from-secondary/50 to-background rounded-[1.2rem] overflow-hidden group mt-2">
          
          {/* 封面图 */}
          {coverImage ? (
            <img 
              src={coverImage} 
              alt="Cover" 
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-secondary/20">
              <Music className="w-24 h-24 text-muted-foreground/10" />
            </div>
          )}

          {/* 渐变遮罩和信息 */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-100 flex flex-col justify-end p-6">
            
            {/* 标题和描述 */}
            <div className="mb-4 transform translate-y-0 transition-transform duration-300 text-shadow-sm">
              <h2 className="text-2xl font-bold text-white mb-1 drop-shadow-md" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{title}</h2>
              {description && (
                <p className="text-sm text-white/70 mt-1 line-clamp-2">{description}</p>
              )}
              {seedHash && (
                <code className="text-xs font-mono text-white/60 mt-1 block">
                  Seed Hash: {seedHash}
                </code>
              )}
            </div>

            {/* 播放和销毁按钮 */}
            <div className="space-y-2">
              {nftData && (
                <>
                  <div className="flex gap-2">
                    {/* 播放/暂停按钮 */}
                    <Button
                      onClick={handlePlayPause}
                      disabled={isFetching}
                      className={cn(
                        "flex-1 h-12 rounded-xl font-semibold transition-all duration-300",
                        audioStream.isPlaying || isStreaming
                          ? "bg-secondary hover:bg-secondary/80 text-foreground border border-border"
                          : "bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90 text-white shadow-lg shadow-primary/25"
                      )}
                    >
                      {isStreaming ? (
                        <div className="flex items-center gap-2">
                          <span className="animate-spin text-lg">✺</span>
                          <span>Generating...</span>
                        </div>
                      ) : audioStream.isPlaying ? (
                        <div className="flex items-center gap-2">
                          <Pause className="w-5 h-5" />
                          <span>Pause</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <PlayCircle className="w-5 h-5" />
                          <span>Play Music</span>
                        </div>
                      )}
                    </Button>

                    {/* 销毁按钮（仅拥有者可见） */}
                    {!isPreview && isOwner && (
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={handleBurn}
                        disabled={isBurning}
                        className="h-12 px-4 text-xs rounded-xl bg-red-500/20 hover:bg-red-500/40 text-red-200 border border-red-500/30 backdrop-blur-md"
                      >
                        {isBurning ? <span className="animate-spin mr-1">⏳</span> : <Flame className="w-4 h-4 mr-1" />}
                        Burn
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
          
          {/* 加载中遮罩 */}
          {isFetching && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <span className="text-white text-xs font-medium tracking-widest">LOADING</span>
              </div>
            </div>
          )}
        </div>
        
        {/* 错误提示 */}
        {effectiveError && (
          <div className="p-4 bg-red-500/10 text-red-600 text-sm text-center font-medium border-t border-red-500/20">
            {effectiveError}
          </div>
        )}
      </div>
    </div>
  );
}
