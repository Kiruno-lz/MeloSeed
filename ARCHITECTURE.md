# MeloSeed 项目技术架构文档

## 技术流程概述

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              MeloSeed 架构图                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐     ┌─────────────────┐     ┌─────────────────────────┐   │
│  │   用户界面   │────▶│   API Routes    │────▶│   AI 服务 (Gemini)      │   │
│  │  (page.tsx) │     │                 │     │   - Lyria 音乐生成      │   │
│  │             │     │ /api/generate-  │     │   - 标题/描述生成       │   │
│  │  - 创建视图 │     │   music/stream  │     │   - 封面图生成          │   │
│  │  - 收藏视图 │     │                 │     │                         │   │
│  └─────────────┘     │ /api/generate-  │     └─────────────────────────┘   │
│         │            │   title         │                                    │
│         │            │                 │                                    │
│         ▼            │ /api/generate-  │     ┌─────────────────────────┐   │
│  ┌─────────────┐     │   cover-gemini  │────▶│   区块链 (Monad)        │   │
│  │  组件层级   │     └─────────────────┘     │   - ERC1155 NFT 合约    │   │
│  │             │                              │   - Mint/Burn 操作      │   │
│  │ Generator   │                              └─────────────────────────┘   │
│  │ Streaming   │                                                          │
│  │ Player      │     ┌─────────────────┐                                   │
│  │ MintingCard │◀────▶│  音频流处理     │                                   │
│  │ NFTPlayer   │     │ useAudioStream  │                                   │
│  └─────────────┘     │  (Web Audio API)│                                   │
│                      └─────────────────┘                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 核心模块说明

### 1. 页面路由 (app/)
- `page.tsx` - 主页面，包含创建和收藏两个视图
- `providers.tsx` - 全局 Provider 配置 (Wagmi, React Query, RainbowKit)

### 2. API 路由 (app/api/)
- `generate-music/stream/route.ts` - SSE 流式音乐生成
- `generate-title/route.ts` - 基于 styleMix 生成标题和描述
- `generate-cover-gemini/route.ts` - 使用 SiliconFlow 生成封面图

### 3. 组件 (components/)
- `Header.tsx` - 顶部导航栏
- `features/Generator.tsx` - 种子生成器输入界面
- `features/StreamingPlayer.tsx` - 实时音乐播放器
- `features/MintingCard.tsx` - NFT 铸造表单
- `features/NFTPlayer.tsx` - NFT 收藏播放器

### 4. Hooks (lib/hooks/)
- `useAudioStream.ts` - 音频流处理 hook (Web Audio API)
- `useMyCollection.ts` - 用户 NFT 收藏查询

### 5. AI 适配器 (lib/ai/)
- `types.ts` - 类型定义
- `gemini-adapter.ts` - Gemini AI 适配器 (分析/标题/封面)
- `gemini-music-adapter.ts` - Lyria 音乐生成适配器

### 6. 工具库 (lib/)
- `seed-mapper.ts` - 种子到音乐风格的映射
- `constants.ts` - 合约地址和 ABI
- `config.ts` - Wagmi 配置
- `utils.ts` - 通用工具函数

## 数据流

### 创建流程
1. 用户输入种子/提示词 → Generator 组件
2. 调用 /api/generate-music/stream (SSE 流)
3. Lyria RealTime 生成音乐 → 通过 useAudioStream 实时播放
4. 同时调用 /api/generate-title 和 /api/generate-cover-gemini
5. 用户确认后调用智能合约 mint 函数

### 收藏流程
1. useMyCollection 查询用户持有的 NFT
2. 用户选择 NFT → NFTPlayer 显示详情
3. 点击播放 → 重新调用流式 API 生成音乐

## 重构变更记录

### 删除的文件 (未使用)
- `app/api/generate/route.ts` - 非 SSE 版本的生成 API，从未被调用
- `app/api/generate-music/route.ts` - 非 SSE 版本，已被 stream 版本替代
- `app/api/ipfs/upload/route.ts` - IPFS 上传功能，当前使用 base64 data URI
- `lib/ipfs-client.ts` - IPFS 客户端，配合上述 API 使用
- `lib/hooks/useStreamingMusic.ts` - 旧版流媒体 hook，功能已整合到 useAudioStream

### 重构的文件
- `app/page.tsx` - 使用 useAudioStream hook 替代内联音频处理
- `components/features/NFTPlayer.tsx` - 使用 useAudioStream hook

### 新增的文件
- `lib/hooks/useAudioStream.ts` - 统一的音频流处理 hook

## 功能映射表

| 原文件 | 功能 | 新文件/位置 | 状态 |
|--------|------|-------------|------|
| page.tsx: initAudioContext() | 初始化音频上下文 | useAudioStream.ts: initAudioContext() | ✅ 已迁移 |
| page.tsx: decodeAudioChunk() | 解码音频块 | useAudioStream.ts: decodeAudioChunk() | ✅ 已迁移 |
| page.tsx: playChunk() | 播放音频块 | useAudioStream.ts: playChunk() | ✅ 已迁移 |
| page.tsx: togglePlayPause() | 播放/暂停切换 | useAudioStream.ts: togglePlayPause() | ✅ 已迁移 |
| page.tsx: stopAllAudio() | 停止所有音频 | useAudioStream.ts: reset() | ✅ 已迁移 |
| NFTPlayer.tsx: decodeAudioChunk() | 解码音频块 | useAudioStream.ts: decodeAudioChunk() | ✅ 已迁移 |
| NFTPlayer.tsx: playChunk() | 播放音频块 | useAudioStream.ts: playChunk() | ✅ 已迁移 |
| NFTPlayer.tsx: startStream() | 启动流 | NFTPlayer.tsx: startStream() (使用 hook) | ✅ 已重构 |
| NFTPlayer.tsx: stopStream() | 停止流 | NFTPlayer.tsx: stopStream() (使用 hook) | ✅ 已重构 |

## API 端点使用情况

| 端点 | 使用位置 | 状态 |
|------|----------|------|
| POST /api/generate-music/stream | page.tsx, NFTPlayer.tsx | ✅ 使用中 |
| POST /api/generate-title | page.tsx | ✅ 使用中 |
| POST /api/generate-cover-gemini | page.tsx | ✅ 使用中 |
| POST /api/generate | (已删除) | ❌ 未使用 |
| POST /api/generate-music | (已删除) | ❌ 未使用 |
| POST /api/ipfs/upload | (已删除) | ❌ 未使用 |
