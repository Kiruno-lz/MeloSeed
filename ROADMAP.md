# Project Roadmap & Known Issues

This document tracks the current status of the project after merging the ERC1155 and Storage Architecture refactors.

## Current Status
- **Contract**: Upgraded to ERC1155 (`MeloSeed.sol`). Supports multiple copies, burning, and unique per-token metadata.
- **Storage**: IPFS via Pinata.
- **Frontend**:
  - Music Generation (Mock/Local).
  - Cover Generation (Replicate API with Fallback).
  - Custom Metadata Input (Title/Description).
  - **NFT Player**: Refactored with Combobox (Input + Dropdown) for easy selection from "My Collection".
  - **Fixes**: Resolved RPC Block Range error and image display issues.

## Completed Tasks
- [x] Fix RPC Error (Block Range Limit) by chunking/limiting block range.
- [x] Fix Frontend Image Display for both API (Mint) and IPFS (Player) sources.
- [x] Refactor NFT Player UX with Dropdown/Combobox.
- [x] Integrate a real AI Image Generation API (Replicate with fallback).
- [x] Restore "My Collection" view using client-side indexing (`useMyCollection` hook).

## Known Issues & Todos

### 1. Environment Configuration
- **Required**:
  - `PINATA_JWT`: For IPFS uploads.
  - `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`: For RainbowKit.
  - `REPLICATE_API_TOKEN`: (Optional) For real AI cover generation.
  - `PRIVATE_KEY`: For contract deployment (backend/scripts).
  - `NEXT_PUBLIC_MONAD_RPC_URL`: Optional, defaults to devnet.

### 2. Hardhat & TypeScript
- Always run deployment scripts with `TS_NODE_PROJECT=tsconfig.hardhat.json npx hardhat ...`.

### 3. Deployment
- **Contract Address**: `0xDfF0D0b3a294e22F86A99dD2DdE1d7810ab5Ca00` (Monad Devnet)
- Ensure this address is updated in `app/page.tsx` and `components/NFTPlayer.tsx` after re-deployment.


### 1. Environment Configuration
- **Required**:
  - `PINATA_JWT`: For IPFS uploads.
  - `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`: For RainbowKit.
  - `REPLICATE_API_TOKEN`: (Optional) For real AI cover generation.
  - `PRIVATE_KEY`: For contract deployment (backend/scripts).
  - `NEXT_PUBLIC_MONAD_RPC_URL`: Optional, defaults to devnet.

### 2. Hardhat & TypeScript
- Always run deployment scripts with `TS_NODE_PROJECT=tsconfig.hardhat.json npx hardhat ...`.

### 3. Deployment
- **Contract Address**: `0xDfF0D0b3a294e22F86A99dD2DdE1d7810ab5Ca00` (Monad Devnet)
- Ensure this address is updated in `app/page.tsx` and `components/NFTPlayer.tsx` after re-deployment.
