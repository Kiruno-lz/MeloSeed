# MeloSeed

MeloSeed is a decentralized application on Monad that generates AI music in real-time and mints it as permanent, interactive NFTs.

## Key Features

- **Real-time AI Music Generation**: Powered by Google Lyria RealTime API with streaming audio playback.
- **Seed-driven Style Mapping**: Each seed deterministically generates a unique mix of music styles (Bossa Nova, Chillwave, Drum and Bass, etc.).
- **ERC1155 Architecture**: Built on the efficient ERC1155 standard with burnable NFT support.
- **IPFS Metadata Storage**: Cover images and NFT metadata are stored on IPFS (via Pinata).
- **Interactive Player**: Real-time streaming player with background visualizer.
- **Collection Management**: View and manage your minted NFTs with built-in burn functionality.

## Tech Stack

- **Frontend**: Next.js 16 (App Router), Tailwind CSS, shadcn/ui
- **Blockchain**: Wagmi, Viem, RainbowKit
- **Smart Contracts**: Solidity (Hardhat), OpenZeppelin
- **AI Music**: Google Lyria RealTime API
- **AI Content**: Google Gemini API (title, description, cover generation)
- **Storage**: Pinata (IPFS)

## Project Structure

```
/
├── app/
│   ├── api/
│   │   ├── generate-music/stream/  # Lyria RealTime streaming
│   │   ├── generate-title/         # Gemini title/description
│   │   ├── generate-cover-gemini/  # Gemini cover image
│   │   └── ipfs/upload/            # IPFS upload
│   ├── page.tsx                    # Main application
│   └── providers.tsx
├── components/
│   ├── features/
│   │   ├── Generator.tsx           # Music generation input
│   │   ├── StreamingPlayer.tsx     # Real-time audio player
│   │   ├── MintingCard.tsx         # NFT minting form
│   │   ├── NFTPlayer.tsx           # Collection player
│   │   └── BackgroundVisualizer.tsx
│   └── ui/                         # shadcn components
├── smart-contracts/
│   └── contracts/MeloSeed.sol      # ERC1155 contract
├── lib/
│   ├── seed-mapper.ts              # Seed → style mapping
│   ├── ipfs-client.ts              # IPFS utilities
│   └── hooks/useMyCollection.ts    # Collection fetching
└── ...
```

## Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Environment Variables**:
   Copy `.env.example` to `.env.local`:
   ```env
   NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_id
   GEMINI_API_KEY=your_gemini_api_key
   PINATA_JWT=your_pinata_jwt
   PRIVATE_KEY=your_wallet_private_key
   ```

3. **Compile Contract**:
   ```bash
   npm run compile
   ```

4. **Deploy Contract**:
   ```bash
   npm run deploy
   ```

5. **Update Configuration**:
   After deployment, update `CONTRACT_ADDRESS` in `lib/constants.ts`.

6. **Run Development Server**:
   ```bash
   npm run dev
   ```

## How It Works

1. **Generate**: Enter a seed (or use random) and click "Germinate Seed"
2. **Listen**: Music streams in real-time while AI generates title and cover
3. **Mint**: Once satisfied, mint as an NFT with custom title/description
4. **Collect**: View and play your minted NFTs in the collection view

## Development Notes

- **Audio Storage**: Audio is streamed in real-time and not stored permanently. Only metadata (title, description, cover, seed info) is saved on IPFS.
- **Collection Indexing**: Uses `balanceOfBatch` strategy for reliable collection fetching on testnets.
- **Rate Limits**: Monad Testnet RPC has strict rate limits; refresh if collection fails to load.
