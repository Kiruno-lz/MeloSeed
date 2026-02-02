# Project Roadmap & Known Issues

This document tracks the current status of the project after merging the ERC1155 and Storage Architecture refactors.

## Current Status
- **Contract**: Upgraded to ERC1155 (`MeloSeed.sol`). Supports multiple copies (though currently minting 1), burning, and unique per-token metadata.
- **Storage**: IPFS via Pinata.
  - Audio files are uploaded to IPFS.
  - Cover images are uploaded to IPFS.
  - Metadata JSON is uploaded to IPFS.
- **Frontend**:
  - Music Generation (Mock/Local).
  - Cover Generation (Mock/Local).
  - Custom Metadata Input (Title/Description).
  - NFT Player & Burner.

## Known Issues & Todos

### 1. Cover Image Generation
- **Current**: Uses a static local file `/public/test.png` as a placeholder.
- **Todo**: Integrate a real AI Image Generation API (e.g., OpenAI DALL-E 3 or Replicate Stable Diffusion).
- **File**: `app/api/generate-cover/route.ts` needs to be updated to call the external API and return the image URL/Blob.

### 2. Collection View ("My Collection")
- **Current**: The "Your Collection" section was disabled/removed.
- **Reason**: ERC1155 standard does not provide a simple `tokensOfOwner` function like ERC721Enumerable. Checking `balanceOf` requires knowing the Token ID.
- **Todo**: Implement an Indexer (e.g., The Graph, Goldsky, or a custom event listener backend) to track `TransferSingle` events and build a list of Token IDs owned by a specific address.

### 3. Environment Configuration
- **Current**: Relies on `.env.local`.
- **Todo**: Ensure the following variables are set in production/deployment:
  - `PINATA_JWT`: For IPFS uploads.
  - `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`: For RainbowKit.
  - `PRIVATE_KEY`: For contract deployment (backend/scripts).
  - `NEXT_PUBLIC_MONAD_RPC_URL`: Optional, defaults to devnet.

### 4. Hardhat & TypeScript
- **Current**: Uses `tsconfig.hardhat.json` to resolve conflicts between Next.js (Bundler resolution) and Hardhat (Node resolution).
- **Todo**: Always run deployment scripts with `TS_NODE_PROJECT=tsconfig.hardhat.json npx hardhat ...`.

### 5. Deployment
- **Contract Address**: After every new deployment, update `CONTRACT_ADDRESS` in:
  - `app/page.tsx`
  - `components/NFTPlayer.tsx`
