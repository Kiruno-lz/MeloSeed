# MeloSeed

MeloSeed is a decentralized application (DApp) on the Monad blockchain that generates AI music and stores it fully on-chain as NFTs.

## Features

- **AI Music Generation**: Uses Replicate (MusicGen) to create unique melodies.
- **On-Chain Storage**: Compresses audio to low-bitrate MP3 to fit directly in the Smart Contract.
- **NFT Minting**: Mint your favorite generated melodies as permanent NFTs.

## Setup

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Environment Variables**:
    Copy `.env.example` to `.env.local` and fill in your keys:
    - `REPLICATE_API_TOKEN`: Get from Replicate.
    - `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`: Get from WalletConnect Cloud.
    - `PRIVATE_KEY`: (Optional) Your wallet private key for deployment.

3.  **Compile Contract**:
    ```bash
    npm run compile
    ```

4.  **Deploy Contract**:
    To deploy to Monad Devnet:
    ```bash
    npm run deploy
    ```
    *Make sure you have funds in your Monad Devnet wallet.*

5.  **Update Frontend**:
    After deployment, copy the contract address from the console output and update `CONTRACT_ADDRESS` in `app/page.tsx`.

6.  **Run Development Server**:
    ```bash
    npm run dev
    ```

## Project Structure

- `contracts/`: Solidity smart contracts.
- `scripts/`: Deployment scripts.
- `app/`: Next.js frontend and API routes.
- `lib/`: Helper libraries (AI adapter, audio compressor, Wagmi config).
