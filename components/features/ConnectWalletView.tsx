'use client';

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Music } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';

/**
 * ConnectWalletView Component
 * 
 * Displays the landing page when the user is not connected.
 * Includes the hero section, wallet connection button, and feature highlights.
 */
export function ConnectWalletView() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
      {/* Hero Icon */}
      <div className="relative">
        <div className="absolute -inset-4 bg-primary/20 rounded-full blur-xl animate-pulse"></div>
        <Music className="w-24 h-24 text-primary relative z-10" />
      </div>

      {/* Hero Text */}
      <div className="space-y-4 max-w-lg">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight lg:text-7xl bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple-500 to-pink-500">
          MeloSeed
        </h1>
        <p className="text-xl text-muted-foreground">
          Generate unique AI melodies and mint them as permanent on-chain NFTs on Monad.
        </p>
      </div>
      
      {/* Custom Connect Button */}
      <ConnectButton.Custom>
        {({
          account,
          chain,
          openAccountModal,
          openChainModal,
          openConnectModal,
          authenticationStatus,
          mounted,
        }) => {
          const ready = mounted && authenticationStatus !== 'loading';
          const connected =
            ready &&
            account &&
            chain &&
            (!authenticationStatus ||
              authenticationStatus === 'authenticated');

          return (
            <div
              {...(!ready && {
                'aria-hidden': true,
                'style': {
                  opacity: 0,
                  pointerEvents: 'none',
                  userSelect: 'none',
                },
              })}
            >
              {(() => {
                if (!connected) {
                  return (
                    <button
                      onClick={openConnectModal}
                      type="button"
                      className="
                        relative inline-flex items-center justify-center px-6 py-3 rounded-full
                        text-white font-semibold
                        bg-gradient-to-b from-[#4dabff] to-[#2f6df6]
                        overflow-hidden transition duration-180 ease-out
                        hover:scale-[1.05] hover:bg-gradient-to-r hover:from-[#60a5fa] hover:to-[#3b82f6]
                        hover:shadow-[0_10px_24px_rgba(59,130,246,0.45)]
                        focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#6366f1]/50
                      "
                    >
                      <span className="relative z-[1]">连接钱包</span>
                      <span className="absolute inset-0 rounded-full z-0
                        [background:radial-gradient(120%_120%_at_50%_0%,rgba(168,85,247,.35)_0%,rgba(168,85,247,.15)_50%,rgba(168,85,247,0)_100%)]
                      "></span>
                    </button>
                  );
                }

                if (chain.unsupported) {
                  return (
                    <button onClick={openChainModal} type="button" className="px-4 py-2 bg-red-500 text-white rounded-lg font-bold">
                      Wrong network
                    </button>
                  );
                }

                return (
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button
                      onClick={openChainModal}
                      style={{ display: 'flex', alignItems: 'center' }}
                      type="button"
                      className="px-4 py-2 bg-gray-100 rounded-lg font-bold text-black"
                    >
                      {chain.hasIcon && (
                        <div
                          style={{
                            background: chain.iconBackground,
                            width: 12,
                            height: 12,
                            borderRadius: 999,
                            overflow: 'hidden',
                            marginRight: 4,
                          }}
                        >
                          {chain.iconUrl && (
                            <img
                              alt={chain.name ?? 'Chain icon'}
                              src={chain.iconUrl}
                              style={{ width: 12, height: 12 }}
                            />
                          )}
                        </div>
                      )}
                      {chain.name}
                    </button>

                    <button onClick={openAccountModal} type="button" className="px-4 py-2 bg-gray-100 rounded-lg font-bold text-black">
                      {account.displayName}
                      {account.displayBalance
                        ? ` (${account.displayBalance})`
                        : ''}
                    </button>
                  </div>
                );
              })()}
            </div>
          );
        }}
      </ConnectButton.Custom>

      {/* Feature Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 w-full max-w-4xl text-left">
          {[
              { title: "AI Generation", desc: "Create unique chiptune/lo-fi melodies from random seeds." },
              { title: "On-Chain Storage", desc: "Music is stored 100% on the blockchain, not IPFS." },
              { title: "NFT Ownership", desc: "Trade and collect your generated musical seeds." }
          ].map((feature, i) => (
              <Card key={i} className="bg-card/50 border-border/50 backdrop-blur-sm">
                  <CardHeader>
                      <CardTitle className="text-lg">{feature.title}</CardTitle>
                      <CardDescription>{feature.desc}</CardDescription>
                  </CardHeader>
              </Card>
          ))}
      </div>
    </div>
  );
}
