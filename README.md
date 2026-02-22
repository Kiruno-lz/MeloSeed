# MeloSeed

**AI-Powered Music NFT Platform on Monad Blockchain**

MeloSeed is a next-generation decentralized application that combines real-time AI music generation with NFT technology. Generate unique music from a single seed, create AI-powered artwork and metadata, then mint it as a permanent, tradable NFT on the blockchain.

---

## Key Features

### AI Capabilities

| Feature | Technology | Description |
|---------|------------|-------------|
| **Music Generation** | Gemini Lyria RealTime | Real-time streaming audio generation with weighted style mixing |
| **Text Generation**  | Gemini 2.5 Flash Lite | Poetic titles, descriptions, tags, mood & genre analysis |
| **Image Generation** | Kwai-Kolors/Kolors (SiliconFlow) | Album cover art based on music mood and style |

### Blockchain Features

- **ERC1155 NFT Standard** - Efficient multi-token standard with burnable support
- **Monad Testnet** - High-performance parallel execution blockchain
- **Seed-Based Regeneration** - Same seed always generates the same music style mix
- **On-Chain Metadata** - Seed and metadata URI stored directly on blockchain

### User Experience

- **Real-time Streaming** - SSE-based audio streaming with instant playback
- **Style Visualization** - Visual representation of the 16 music style combinations
- **Collection Management** - View, play, and burn your minted NFTs
- **Dark/Light Theme** - Full theme support

---

## Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                         User Interface                        │
│  ┌──────────┐  ┌───────────────┐  ┌─────────────┐             │
│  │Generator │  │StreamingPlayer│  │MintingCard  │             │
│  └────┬─────┘  └──────┬────────┘  └──────┬──────┘             │
└───────┼───────────────┼──────────────────┼────────────────────┘
        │               │                  │
        ▼               ▼                  ▼
┌───────────────────────────────────────────────────────────────┐
│                        API Routes                             │
│  /api/generate-music/stream  /api/generate-title              │
│              /api/generate-cover-gemini                       │
└───────────────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────────────┐
│                        AI Services                            │
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐ │
│  │ Gemini Lyria    │  │ Gemini 2.5      │  │ SiliconFlow    │ │
│  │ RealTime        │  │ Flash Lite      │  │ Kolors         │ │
│  │ (Music)         │  │ (Text)          │  │ (Image)        │ │
│  └─────────────────┘  └─────────────────┘  └────────────────┘ │
└───────────────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────────────┐
│                     Blockchain Layer                          │
│  ┌─────────────────┐  ┌─────────────────┐                     │
│  │ Monad Testnet   │  │ ERC1155 Contract│                     │
│  │ (Chain ID:10143)│  │ MeloSeed.sol    │                     │
│  └─────────────────┘  └─────────────────┘                     │
└───────────────────────────────────────────────────────────────┘
```

---

## Core Technology

### 1. Seed-to-Style Mapping Algorithm

Each seed deterministically generates a unique combination of music styles using the Mulberry32 pseudo-random algorithm.

```typescript
// 16 Available Music Styles
const DEFAULT_STYLES = [
  'Bossa Nova', 'Chillwave', 'Drum and Bass', 'Post Punk',
  'Shoegaze', 'Funk', 'Chiptune', 'Lush Strings',
  'Sparkling Arpeggios', 'Staccato Rhythms', 'Punchy Kick',
  'Dubstep', 'K-Pop', 'Neo Soul', 'Trip Hop', 'Thrash Metal'
];

// Same seed = Same style mix
const mapper = new SeedToStyleMapper(seed);
const styleMix = mapper.generateWeightedPrompts(DEFAULT_STYLES);
// Example output: [{ name: 'Bossa Nova', weight: 0.35 }, { name: 'Chillwave', weight: 0.28 }, ...]
```

### 2. Real-time Music Streaming

Audio streams from Lyria RealTime API via Server-Sent Events (SSE):

```typescript
// WebSocket connection to Lyria RealTime
const session = await client.live.music.connect({
  model: 'models/lyria-realtime-exp',
  callbacks: {
    onmessage: (message) => {
      // Stream audio chunks to client
      if (message.serverContent?.audioChunks) {
        // Decode and play PCM audio (48kHz)
      }
    }
  }
});

// Set weighted prompts for style mixing
await session.setWeightedPrompts({ weightedPrompts: styleMix });
session.play();
```

### 3. NFT Minting Flow

```solidity
// MeloSeed.sol - ERC1155 Contract
function mint(
  address account,
  uint256 amount,
  uint256 seed,           // Music generation seed
  string memory metadataUri, // Base64 JSON metadata
  bytes memory data
) public {
  uint256 tokenId = _nextTokenId++;
  _mint(account, tokenId, amount, data);
  _setTokenData(tokenId, seed, metadataUri);
}
```

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | Next.js 16 (App Router), React 19, Tailwind CSS, shadcn/ui |
| **State** | TanStack Query, React Hooks |
| **Blockchain** | Wagmi, Viem, RainbowKit, Monad Testnet |
| **Smart Contracts** | Solidity 0.8.20, Hardhat, OpenZeppelin |
| **AI - Music** | Google Gemini Lyria RealTime API |
| **AI - Text** | Google Gemini 2.5 Flash Lite |
| **AI - Image** | SiliconFlow Kwai-Kolors/Kolors |
| **Storage** | Base64 Data URI (primary), Pinata IPFS (optional) |

---

## Project Structure

```
MeloSeed/
├── app/
│   ├── api/
│   │   ├── generate-music/
│   │   │   ├── route.ts              # Non-streaming music generation
│   │   │   └── stream/route.ts       # SSE streaming (Lyria RealTime)
│   │   ├── generate-title/route.ts   # Gemini title/description
│   │   ├── generate-cover-gemini/route.ts  # Kolors cover generation
│   │   └── ipfs/upload/route.ts      # IPFS upload (Pinata)
│   ├── page.tsx                      # Main application
│   ├── providers.tsx                 # Wagmi + RainbowKit providers
│   ├── layout.tsx                    # Root layout
│   └── globals.css                   # Global styles
│
├── components/
│   ├── features/
│   │   ├── Generator.tsx             # Seed input & style display
│   │   ├── StreamingPlayer.tsx       # Real-time audio player
│   │   ├── MintingCard.tsx           # NFT minting form
│   │   └── NFTPlayer.tsx             # Collection playback
│   ├── ui/                           # shadcn/ui components
│   └── Header.tsx                    # Navigation
│
├── lib/
│   ├── ai/
│   │   ├── types.ts                  # AI adapter interfaces
│   │   ├── gemini-adapter.ts         # Text & Image generation
│   │   └── gemini-music-adapter.ts   # Music generation
│   ├── hooks/
│   │   ├── useMyCollection.ts        # NFT collection fetching
│   │   └── useStreamingMusic.ts      # SSE audio streaming
│   ├── seed-mapper.ts                # Seed → Style algorithm
│   ├── constants.ts                  # Contract address & ABI
│   ├── config.ts                     # Wagmi/RainbowKit config
│   └── ipfs-client.ts                # IPFS utilities
│
├── smart-contracts/
│   ├── contracts/
│   │   └── MeloSeed.sol              # ERC1155 contract
│   └── scripts/
│       └── deploy.ts                 # Deployment script
│
└── artifacts/                        # Compiled contracts
```

---

## Getting Started

### Prerequisites

- Node.js >= 18.17.0
- npm or yarn
- A wallet with MON tokens on Monad Testnet

### Installation

```bash
# Clone the repository
git clone https://github.com/Kiruno-lz/MeloSeed.git
cd meloseed

# Install dependencies
npm install
```

### Environment Variables

Create `.env.local`:

```env
# Wallet Connect
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_wallet_connect_id

# AI Services
GEMINI_API_KEY=your_gemini_api_key
SILICON_FLOW_API_KEY=your_siliconflow_key

# Contract Deployment
PRIVATE_KEY=your_deployer_private_key
```

### Deploy Smart Contract

```bash
# Compile contract
npm run compile

# Deploy to Monad Testnet
npm run deploy
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Usage Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   1. Seed   │────▶│ 2. Generate │────▶│  3. Listen  │
│   Input     │     │   Music     │     │  & Preview  │
└─────────────┘     └─────────────┘     └─────────────┘
                                              │
                                              ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  6. Collect │◀────│  5. Confirm │◀────│  4. Mint    │
│   & Play    │     │   & Pay     │     │    NFT      │
└─────────────┘     └─────────────┘     └─────────────┘
```

1. **Enter Seed** - Input a number or generate randomly
2. **Generate Music** - AI creates unique style-mixed music in real-time
3. **Listen & Preview** - Stream audio while AI generates title and cover
4. **Mint NFT** - Edit metadata and mint to blockchain
5. **Confirm & Pay** - Approve transaction in wallet
6. **Collect & Play** - View your NFTs and regenerate music from seed

---

## API Reference

### POST `/api/generate-music/stream`

Stream music generation via SSE.

**Request:**
```json
{
  "seed": 12345,
  "duration": 15,
  "prompt": "optional additional prompt"
}
```

**Response (SSE Events):**
```
event: init
data: {"seed": 12345, "seedHash": "a1b2c3d4", "styleMix": [...]}

event: chunk
data: {"audio": "base64-encoded-pcm-chunk"}

event: complete
data: {"audio": "base64-encoded-full-audio"}
```

### POST `/api/generate-title`

Generate title, description, tags from style mix.

**Request:**
```json
{
  "styleMix": [
    {"name": "Bossa Nova", "weight": 0.35, "color": "#9900ff"}
  ]
}
```

**Response:**
```json
{
  "title": "Midnight Frequencies",
  "description": "A poetic description...",
  "tags": ["electronic", "ambient"],
  "mood": "dreamy",
  "genre": "ambient"
}
```

### POST `/api/generate-cover-gemini`

Generate album cover image.

**Request:**
```json
{
  "title": "Midnight Frequencies",
  "description": "...",
  "mood": "dreamy",
  "genre": "ambient",
  "tags": ["electronic", "ambient"]
}
```

**Response:**
```json
{
  "coverUrl": "https://xxx.siliconflow.cn/..."
}
```

---

## Contract Address

**Monad Testnet:** `0xe9c4Bd588f163855fD5242bFd2dA7612d62fC51C`

[View on Monad Explorer](https://testnet.monadexplorer.com/address/0xe9c4Bd588f163855fD5242bFd2dA7612d62fC51C)

---

## License

GPL-v3

---

## Acknowledgments

- [Google Gemini](https://ai.google.dev/) - Lyria RealTime & Gemini 2.5 Flash
- [SiliconFlow](https://siliconflow.cn/) - Kwai-Kolors Image Generation
- [Monad](https://monad.xyz/) - High-performance blockchain
- [OpenZeppelin](https://openzeppelin.com/) - Smart contract libraries
- [RainbowKit](https://www.rainbowkit.com/) - Wallet connection
- [shadcn/ui](https://ui.shadcn.com/) - UI components
