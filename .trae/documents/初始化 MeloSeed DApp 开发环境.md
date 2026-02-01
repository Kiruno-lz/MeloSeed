# 构建 MeloSeed (Monad 链上版)

## 1. 基础设施与脚手架 (Infrastructure)
*   **初始化**: Next.js (App Router), TypeScript, Tailwind.
*   **链配置**: 配置 Wagmi/RainbowKit 适配 **Monad** 网络 (需提供 RPC，暂用 EVM 模版)。
*   **工具库**: 安装 `fluent-ffmpeg` (用于音频压缩), `viem`.

## 2. 后端：AI 适配器与音频处理 (Backend Core)
*   **接口定义**: 创建 `lib/ai/types.ts` 定义 `IMusicGenerator` 接口。
*   **实现适配器**: 开发 `ReplicateAdapter`，封装 MusicGen 调用。
    *   **Prompt 调优**: 注入 "Soft, melodic, catchy" 风格基底。
    *   **时长控制**: 限制生成时长为 10-20秒。
*   **音频压缩服务**: 创建 `/api/compress` 路由。
    *   功能：接收 AI 返回的音频 -> 转换为单声道、低码率格式 -> 返回 Base64 字符串。

## 3. 智能合约 (Smart Contract)
*   **合约开发**: `MeloSeed.sol` (ERC-721)。
*   **存储逻辑**:
    *   实现 `mint(string memory audioData)`。
    *   将 Base64 音频数据直接写入链上存储（或使用 `SSTORE2` 库优化 Gas）。
    *   *注：这将生成一个完全去中心化、不依赖 IPFS 的永久音乐 NFT。*

## 4. 前端交互 (UI/UX)
*   **Generator 组件**:
    *   状态流：Generating (AI) -> Compressing (Server) -> Ready to Mint。
    *   播放器：支持直接播放 Base64 音频流。
*   **Mint 交互**: 提交 Base64 数据到合约（需处理大体积交易的 Gas Limit 估算）。

## 里程碑目标
完成 Phase 1 后，你将能够点击按钮，生成一段 15秒左右的柔和旋律，并将其数据完全写入 Monad 模拟环境的链上。