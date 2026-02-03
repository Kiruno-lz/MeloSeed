# MeloSeed

MeloSeed is a decentralized application (DApp) on the Monad blockchain that generates AI music and stores it as permanent, interactive NFTs.

## Key Features

- **AI Music Generation**: Create unique chiptune/lo-fi melodies from random seeds.
- **ERC1155 Architecture**: Built on the efficient ERC1155 standard, allowing for batch operations and "editions" (though currently 1/1).
- **IPFS Storage**: Music audio, cover images, and metadata are stored on IPFS (via Pinata) for decentralized permanence.
- **Burnable NFTs**: Users can destroy (burn) their NFTs if desired.
- **Interactive Player**: Play your music directly from the blockchain (IPFS gateway resolution) within the DApp.
- **Collection Management**: Automatically detects and displays NFTs owned by the connected wallet using a smart batch-checking strategy.

## Tech Stack

- **Frontend**: Next.js 14 (App Router), Tailwind CSS, shadcn/ui.
- **Blockchain Interaction**: Wagmi, Viem, RainbowKit.
- **Smart Contracts**: Solidity (Hardhat framework).
- **Storage**: Pinata (IPFS).
- **AI**: Replicate API (Stable Diffusion XL for covers, MusicGen for audio).

## Project Structure

```
/
├── app/                  # Next.js App Router pages and API routes
│   ├── api/              # Backend API routes (IPFS upload, AI generation)
│   └── page.tsx          # Main application orchestrator
├── components/           # React Components
│   ├── features/         # Feature-specific components (Player, Generator, etc.)
│   ├── ui/               # Reusable UI components (shadcn)
│   └── ...
├── contracts/            # Solidity Smart Contracts
├── hooks/                # Custom React Hooks (e.g., useMyCollection)
├── lib/                  # Utilities, Constants, and Helper functions
├── scripts/              # Hardhat deployment scripts
└── ...
```

## Getting Started

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Environment Variables**:
    Copy `.env.example` to `.env.local` and fill in your keys:
    ```env
    NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_id
    PINATA_JWT=your_pinata_jwt
    REPLICATE_API_TOKEN=your_replicate_token
    PRIVATE_KEY=your_wallet_private_key
    ```

3.  **Compile Contract**:
    ```bash
    npm run compile
    ```

4.  **Deploy Contract**:
    To deploy to Monad Devnet:
    ```bash
    npm run deploy
    ```
    *Note: Ensure `tsconfig.hardhat.json` is used.*

5.  **Update Configuration**:
    After deployment, update the `CONTRACT_ADDRESS` in `lib/constants.ts`.

6.  **Run Development Server**:
    ```bash
    npm run dev
    ```

## Development Notes

- **Collection Indexing**: Due to RPC limitations on testnets, `useMyCollection` uses a "Brute-force Batch Check" strategy (checking IDs 0-50) instead of event logs. In production, an Indexer (The Graph/Goldsky) is recommended.
- **IPFS**: We use a dedicated gateway or public gateways. Ensure Pinata JWT has upload permissions.
