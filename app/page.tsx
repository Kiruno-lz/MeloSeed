/**
 * MeloSeed 主页面
 * 
 * 这是应用的核心页面，包含两个主要视图:
 * 1. 创建视图 (create) - 生成新的音乐并铸造为 NFT
 * 2. 收藏视图 (collection) - 查看和播放已拥有的 NFT
 * 
 * ## 创建流程
 * 1. 用户点击 "Germinate Seed" 按钮
 * 2. 调用 startStreaming() 启动 SSE 流
 * 3. 服务器返回音乐数据块，通过 useAudioStream 实时播放
 * 4. 同时在后台并行生成标题和封面图
 * 5. 用户可以编辑标题和描述
 * 6. 点击 "Mint NFT" 将音乐铸造为 NFT
 * 
 * ## 状态管理
 * - view: 当前视图 ('create' | 'collection')
 * - generatedData: 当前生成的音乐数据
 * - title/description/coverUrl: 用户可编辑的元数据
 * - isStreaming: 是否正在生成音乐
 * 
 * ## 关键依赖
 * - useAudioStream: 音频流处理
 * - useMyCollection: 用户收藏查询
 * - useWriteContract: 智能合约交互
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAccount, useWriteContract } from 'wagmi';
import { Header } from '@/components/Header';
import { Generator } from '@/components/features/Generator';
import { StreamingPlayer } from '@/components/features/StreamingPlayer';
import { MintingCard } from '@/components/features/MintingCard';
import { NFTPlayer } from '@/components/features/NFTPlayer';
import { useToast } from '@/components/Toast';
import { useMyCollection } from '@/lib/hooks/useMyCollection';
import { useAudioStream } from '@/lib/hooks/useAudioStream';
import { CONTRACT_ADDRESS, MELO_SEED_ABI } from '@/lib/constants';
import { ConnectButton } from '@rainbow-me/rainbowkit';

/** 完整的音乐数据结构 */
interface CompleteMusicData {
  seed: number;
  audioBase64?: string;
  title: string;
  description: string;
  tags: string[];
  mood: string;
  genre: string;
  coverUrl: string | null;
  styleMix?: { name: string; weight: number; color: string }[];
  seedHash?: string;
}

export default function Home() {
  // ============ 钱包连接状态 ============
  const { address, isConnected } = useAccount();
  
  // ============ 视图状态 ============
  /** 当前视图: 'create' 创建页面 | 'collection' 收藏页面 */
  const [view, setView] = useState<'create' | 'collection'>('create');
  
  // ============ 音频流处理 ============
  /** 
   * useAudioStream Hook
   * 封装了所有音频处理逻辑，包括:
   * - AudioContext 管理
   * - 音频块解码和播放
   * - 播放/暂停控制
   */
  const audioStream = useAudioStream();
  
  /** 
   * AbortController 用于取消正在进行的流请求
   * 当用户切换视图或重新生成时需要中断
   */
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // ============ 生成状态 ============
  /** 是否正在流式生成音乐 */
  const [isStreaming, setIsStreaming] = useState(false);
  
  /** 当前生成的音乐数据 */
  const [generatedData, setGeneratedData] = useState<CompleteMusicData | null>(null);
  
  /** 用户可编辑的元数据 */
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  
  /** 上传状态 (当前未使用，保留用于未来扩展) */
  const [isUploading, setIsUploading] = useState(false);
  
  // ============ 合约交互 ============
  const { writeContract, isPending: isTxPending, error, isSuccess, reset } = useWriteContract();
  const { showToast } = useToast();

  // ============ 收藏查询 ============
  const { tokenIds, isLoading: isCollectionLoading, refetch: refetchCollection } = useMyCollection(CONTRACT_ADDRESS);

  /** 综合的等待状态 */
  const isPending = isUploading || isTxPending;

  // ============ 核心业务逻辑 ============

  /**
   * 启动音乐生成流
   * 
   * 这个函数通过 SSE (Server-Sent Events) 与服务器建立连接，
   * 实时接收生成的音乐数据。
   * 
   * SSE 事件类型:
   * - init: 包含 seed, seedHash, styleMix
   * - chunk: 包含音频数据块
   * - complete: 生成完成
   * - error: 发生错误
   * 
   * @param prompt - 用户输入的提示词 (可选)
   * @param seed - 随机种子，用于确定性生成
   * @param style - 音乐风格描述
   * @param duration - 生成时长 (秒)
   * @param bpm - 节拍速度
   */
  const startStreaming = async (prompt: string, seed: number, style: string, duration: number, bpm: number) => {
    // 中断之前的流
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // 重置音频状态
    audioStream.reset();
    
    // 创建新的 AbortController
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    setIsStreaming(true);
    audioStream.startPlaying();

    try {
      const response = await fetch('/api/generate-music/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, seed, style, duration, bpm }),
        signal: abortController.signal
      });

      if (!response.ok) {
        throw new Error(`Failed to start stream: ${response.status}`);
      }
      
      if (!response.body) {
        throw new Error('No response body');
      }

      // SSE 流读取器
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        
        // SSE 格式: 事件以双换行分隔
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';
        
        for (const event of events) {
          if (!event.trim()) continue;
          
          // 解析 SSE 事件
          const lines = event.split('\n');
          let eventType = '';
          let eventData = '';
          
          for (const line of lines) {
            if (line.startsWith('event:')) {
              eventType = line.slice(6).trim();
            } else if (line.startsWith('data:')) {
              eventData = line.slice(5).trim();
            }
          }
          
          if (eventType && eventData) {
            try {
              const parsed = JSON.parse(eventData);
              
              if (eventType === 'init') {
                // 初始化事件 - 设置基础数据
                setGeneratedData({
                  seed: parsed.seed,
                  title: `MeloSeed #${parsed.seed}`,
                  description: '',
                  tags: [],
                  mood: 'unknown',
                  genre: 'unknown',
                  coverUrl: null,
                  styleMix: parsed.styleMix,
                  seedHash: parsed.seedHash
                });
                
                // 并行生成标题和封面
                if (parsed.styleMix?.length > 0) {
                  Promise.all([
                    fetch('/api/generate-title', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ styleMix: parsed.styleMix })
                    }).then(res => res.json()).catch(console.error),
                    
                    fetch('/api/generate-cover-gemini', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        title: `MeloSeed #${parsed.seed}`,
                        description: '',
                        tags: [],
                        mood: 'unknown',
                        genre: 'unknown'
                      })
                    }).then(res => res.json()).catch(console.error)
                  ]).then(([titleData, coverData]) => {
                    // 更新生成的数据
                    setGeneratedData(prev => prev ? {
                      ...prev,
                      title: titleData?.title || prev.title,
                      description: titleData?.description || '',
                      tags: titleData?.tags || [],
                      mood: titleData?.mood || 'unknown',
                      genre: titleData?.genre || 'unknown',
                      coverUrl: coverData?.coverUrl || null
                    } : null);
                  }).catch(console.error);
                }
              } else if (eventType === 'chunk' && parsed.audio) {
                // 音频块事件 - 播放音频
                audioStream.playChunk(parsed.audio);
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }
      }
      
      setIsStreaming(false);
    } catch (err) {
      // 忽略 AbortError (用户主动取消)
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('Stream error:', err);
      }
      setIsStreaming(false);
    } finally {
      abortControllerRef.current = null;
    }
  };

  /**
   * 重置所有状态
   * 
   * 在以下情况下调用:
   * - 用户点击 "Discard & Create New"
   * - 切换到收藏视图
   * - 铸造成功后
   */
  const resetState = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    audioStream.reset();
    setIsStreaming(false);
    setGeneratedData(null);
    setCoverUrl(null);
    setTitle('');
    setDescription('');
  }, [audioStream]);

  const handleRestart = () => resetState();

  // ============ 副作用 ============

  /** 切换视图时重置状态 */
  useEffect(() => {
    if (view !== 'create') resetState();
  }, [view, resetState]);

  /** 同步生成的数据到可编辑状态 */
  useEffect(() => {
    if (generatedData) {
      setTitle(generatedData.title);
      setDescription(generatedData.description);
      setCoverUrl(generatedData.coverUrl);
    }
  }, [generatedData]);

  /** 处理合约错误 */
  useEffect(() => {
    if (error) {
      showToast(error.message.substring(0, 100) + '...', 'error');
      reset();
    }
  }, [error, showToast, reset]);

  /** 处理铸造成功 */
  useEffect(() => {
    if (isSuccess) {
      showToast('NFT Minted Successfully!', 'success');
      reset();
      resetState();
      setTimeout(() => {
        refetchCollection();
        setView('collection');
      }, 2000);
    }
  }, [isSuccess, showToast, refetchCollection, resetState, reset]);

  // ============ 合约交互 ============

  /**
   * 铸造 NFT
   * 
   * 将音乐元数据编码为 base64 JSON data URI 并存储在链上。
   * 符合 ERC1155 元数据标准。
   */
  const handleMint = async () => {
    if (!generatedData) return;
    if (!isConnected || !address) {
      showToast("Please connect your wallet to mint.", "error");
      return;
    }
    if (!coverUrl) {
      showToast("Cover image is not ready yet. Please wait...", "error");
      return;
    }
    
    setIsUploading(true);
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const tokenTitle = title || `MeloSeed #${generatedData.seed}`;
      const tokenDescription = description || `A unique AI-generated melody seeded by ${generatedData.seed}.`;
      
      // 构建 ERC1155 兼容的元数据
      const metadata = {
        name: tokenTitle,
        description: tokenDescription,
        image: coverUrl,
        attributes: [
          { trait_type: "Title", value: tokenTitle },
          { trait_type: "Description", value: tokenDescription },
          { trait_type: "Seed", value: String(generatedData.seed) },
          { trait_type: "Model Version", value: "Lyria RealTime" },
          { trait_type: "Timestamp", value: String(timestamp) }
        ]
      };
      
      // 编码为 base64 data URI
      const jsonStr = JSON.stringify(metadata);
      const base64Json = typeof window !== 'undefined' 
        ? btoa(unescape(encodeURIComponent(jsonStr)))
        : Buffer.from(jsonStr).toString('base64');
      const metadataUri = `data:application/json;base64,${base64Json}`;
      
      // 调用合约的 mint 函数
      writeContract({
        address: CONTRACT_ADDRESS,
        abi: MELO_SEED_ABI,
        functionName: 'mint',
        args: [address, BigInt(1), BigInt(generatedData.seed), metadataUri, "0x"],
      });
    } catch (e) {
      showToast("Minting failed: " + (e as Error).message, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  /** NFT 销毁完成后的回调 */
  const handleBurnComplete = useCallback(() => {
    setTimeout(() => refetchCollection(), 2000);
  }, [refetchCollection]);

  // ============ 渲染 ============

  return (
    <div className="min-h-screen pb-20 pt-24 px-4 relative overflow-x-hidden flex flex-col">
      <Header currentView={view} setView={setView} />
      
      <main className="container max-w-6xl mx-auto flex-1 flex flex-col justify-center">
        {/* 创建视图 */}
        {view === 'create' && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            {!generatedData ? (
              /* 初始状态 - 显示生成器 */
              <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Generator onGenerate={startStreaming} />
              </div>
            ) : (
              /* 预览状态 - 显示播放器和铸造表单 */
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start mt-8">
                {/* 左侧: 播放器 */}
                <div className="order-1 lg:col-start-1 lg:row-start-1 w-full">
                  {generatedData && (
                    <StreamingPlayer 
                      coverUrl={coverUrl}
                      title={title || `MeloSeed #${generatedData.seed}`}
                      seed={generatedData.seed}
                      seedHash={generatedData.seedHash}
                      styleMix={generatedData.styleMix}
                      className="sticky top-24"
                      isPlaying={audioStream.isPlaying}
                      onPlayPause={audioStream.togglePlayPause}
                    />
                  )}
                </div>

                {/* 右侧: 铸造表单 */}
                <div className="order-2 lg:col-start-2 lg:row-start-1 w-full h-full">
                  <MintingCard 
                    onMint={handleMint}
                    isPending={isPending}
                    isUploading={isUploading}
                    title={title}
                    setTitle={setTitle}
                    description={description}
                    setDescription={setDescription}
                    onRegenerate={handleRestart}
                    isAssetsReady={!!coverUrl}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* 收藏视图 */}
        {view === 'collection' && (
          <div className="animate-in fade-in zoom-in-95 duration-500">
            <div className="text-center mb-12 space-y-2">
              <h2 className="text-3xl font-bold tracking-tight">Your Sonic Garden</h2>
              <p className="text-muted-foreground">
                {isCollectionLoading ? "Syncing with blockchain..." : 
                 isConnected ? `You have harvested ${tokenIds.length} unique seeds.` : "Connect wallet to view your garden."}
              </p>
            </div>
            
            {isConnected ? (
              <div className="flex justify-center">
                <NFTPlayer 
                  collectionIds={tokenIds} 
                  onBurn={handleBurnComplete}
                />
              </div>
            ) : (
              /* 未连接钱包时显示连接按钮 */
              <div className="flex flex-col items-center justify-center py-20 gap-6 opacity-80">
                <p className="text-xl font-medium">Please connect your wallet to enter the garden</p>
                <ConnectButton.Custom>
                  {({ openConnectModal, mounted }) => {
                    if (!mounted) return null;
                    return (
                      <button
                        onClick={openConnectModal}
                        className="
                          relative px-8 py-3 rounded-full text-base font-bold text-white
                          bg-gradient-to-r from-primary to-purple-500
                          shadow-lg shadow-primary/20
                          hover:shadow-primary/40 hover:scale-105 transition-all duration-300
                        "
                      >
                        Connect Wallet
                      </button>
                    );
                  }}
                </ConnectButton.Custom>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
