# Project Roadmap & Known Issues

This document tracks the current status of the project, completed milestones, and future plans.

## Current Status (MVP)

The project has reached a stable MVP state on the Monad Devnet. Users can generate music, mint it as ERC1155 NFTs, view their collection, and play music directly from on-chain data (IPFS).

- **Contract**: `MeloSeed.sol` (ERC1155 + Burnable + Ownable).
- **Network**: Monad Devnet.
- **Storage**: IPFS (Pinata).

## Completed Milestones

- [x] **Project Initialization**: Next.js + Hardhat setup.
- [x] **Storage Refactor**: Moved from on-chain base64 (expensive) to IPFS (efficient).
- [x] **Contract Upgrade**: Switched from ERC721 to ERC1155 for better batch handling and edition support.
- [x] **Frontend Architecture**:
    - Modularized components (`features/`).
    - Centralized constants and utilities.
- [x] **UX Improvements**:
    - "Connect Wallet" landing view.
    - Interactive "Ready to Mint" card.
    - **Combobox Player**: Easy selection of owned NFTs.
- [x] **Robustness**:
    - Implemented `balanceOfBatch` strategy for reliable collection fetching on testnets.
    - Added retry logic and timeouts for metadata fetching.
    - Fallback mechanisms for AI generation (mock/local data).

## Future Roadmap

### Phase 2: Social & Marketplace
- [ ] **Marketplace**: Simple Buy/Sell functionality (Atomic Swap).
- [ ] **Social Sharing**: "Share on X/Farcaster" buttons.
- [ ] **Likes/Voting**: On-chain or off-chain voting for best melodies.

### Phase 3: Advanced Generation
- [ ] **Real AI Music**: Integrate Replicate MusicGen API fully (currently mock/local for stability).
- [ ] **Parameters**: Allow users to tweak generation parameters (BPM, Mood, Instrument).

### Phase 4: Production Readiness
- [ ] **Indexer**: Integrate The Graph or Goldsky for scalable NFT indexing.
- [ ] **Mainnet Launch**: Deploy to Monad Mainnet.

## Known Issues

1.  **RPC Limits**: The public Monad Devnet RPC has strict rate limits. If the collection fails to load, try refreshing after a few seconds.
2.  **IPFS Latency**: Public IPFS gateways can be slow. The player has a 60s timeout for this reason.
