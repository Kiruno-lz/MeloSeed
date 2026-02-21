# Project Roadmap - Branch Refactoring

## Current Status

This branch focuses on refactoring the smart contract and frontend to eliminate IPFS overhead:
- **Images**: Will use SiliconFlow direct URLs instead of IPFS
- **Music**: Will use seed-based streaming generation instead of stored MP3 files
- **Storage**: Only seed and image URL will be stored on-chain

---

## Tasks

### Phase 1: Smart Contract Refactoring

- [ ] **1.1** Update `MeloSeed.sol` to store seed and imageUrl directly:
  - Add `seeds` mapping (uint256 => uint256) for music generation seed
  - Add `imageUrls` mapping (uint256 => string) for SiliconFlow image URL
  - Add `titles` mapping (uint256 => string) for music title
  - Add `setTokenData` function to set seed, imageUrl, and title during mint
  - Update `uri()` to return on-chain data format or IPFS fallback

- [ ] **1.2** Deploy new contract to Monad Devnet

- [ ] **1.3** Update `CONTRACT_ADDRESS` in `lib/constants.ts`

- [ ] **1.4** Update `MELO_SEED_ABI` in `lib/constants.ts` with new functions

---

### Phase 2: Minting Flow Updates

- [ ] **2.1** Modify `handleMint` in `app/page.tsx`:
  - Use SiliconFlow image URL directly (remove IPFS upload)
  - Call new contract function to store seed + imageUrl + title
  - Remove metadata JSON upload to IPFS

---

### Phase 3: NFTPlayer Refactoring (Collection View)

- [ ] **3.1** Refactor `NFTPlayer.tsx` to support seed-based streaming:
  - Fetch seed and imageUrl from contract instead of IPFS metadata
  - Integrate `useStreamingMusic` hook for playback
  - Display styleMix derived from seed using `SeedToStyleMapper`

- [ ] **3.2** Implement stream interruption:
  - Add AbortController to abort previous stream when switching NFTs
  - Ensure `stopStream()` is called before starting new NFT playback

- [ ] **3.3** Update UI to show seed-based music generation flow:
  - Show seed info and styleMix (same as StreamingPlayer)
  - Remove audio element, use streaming playback controls

---

### Phase 4: Cleanup & Verification

- [ ] **4.1** Remove IPFS upload dependencies if no longer needed:
  - Clean up `lib/ipfs-client.ts` if unused
  - Remove IPFS API routes if unused

- [ ] **4.2** Test full flow:
  - Generate music → Mint NFT → View in Collection → Play music

- [ ] **4.3** Update README if needed

---

## Technical Notes

### New Contract Structure
```
struct TokenData {
    uint256 seed;
    string imageUrl;
    string title;
}
mapping(uint256 => TokenData) private _tokenData;
```

### Stream Interruption Logic
```typescript
// When switching NFTs
const abortControllerRef = useRef<AbortController | null>(null);

const handleNFTChange = (newTokenId) => {
    // Abort previous stream
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
    }
    // Start new stream with new seed
    startStream(..., newSeed, ...);
};
```

### Image URL Storage
- Store SiliconFlow CDN URL directly: `https://xxx.siliconflow.cn/...`
- No IPFS conversion needed for display
