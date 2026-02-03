"use client"

import * as React from "react"
import { Moon, Sun, Music, Disc, Sparkles } from "lucide-react"
import { useTheme } from "next-themes"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface HeaderProps {
  currentView: 'create' | 'collection';
  setView: (view: 'create' | 'collection') => void;
}

export function Header({ currentView, setView }: HeaderProps) {
  const { setTheme, theme } = useTheme()

  return (
    <header className="fixed top-0 left-0 right-0 z-50 transition-all duration-300">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-xl border-b border-border/20 shadow-sm" />
      
      <div className="container relative flex h-20 max-w-screen-2xl items-center justify-between px-6">
        {/* Logo */}
        <div 
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => setView('create')}
        >
            <div className="relative w-10 h-10 rounded-full overflow-hidden shadow-lg group-hover:shadow-primary/25 transition-all duration-300 group-hover:scale-105">
                <img src="/logo.png" alt="MeloSeed" className="w-full h-full object-cover" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 tracking-tight">
              MeloSeed
            </span>
        </div>

        {/* Center Nav - Floating Pill */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:flex items-center p-1 bg-secondary/50 backdrop-blur-md rounded-full border border-white/10 shadow-inner">
            <button
                onClick={() => setView('create')}
                className={cn(
                    "flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium transition-all duration-300",
                    currentView === 'create' 
                        ? "bg-background shadow-md text-primary" 
                        : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                )}
            >
                <Sparkles className="w-4 h-4" />
                Create
            </button>
            <button
                onClick={() => setView('collection')}
                className={cn(
                    "flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium transition-all duration-300",
                    currentView === 'collection' 
                        ? "bg-background shadow-md text-primary" 
                        : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                )}
            >
                <Disc className="w-4 h-4" />
                Collection
            </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-4">
          <ConnectButton.Custom>
            {({ account, chain, openAccountModal, openConnectModal, mounted }) => {
              const ready = mounted;
              const connected = ready && account && chain;

              return (
                <div
                  {...(!ready && {
                    'aria-hidden': true,
                    'style': { opacity: 0, pointerEvents: 'none' },
                  })}
                >
                  {(() => {
                    if (!connected) {
                      return (
                        <button
                          onClick={openConnectModal}
                          className="
                            relative px-5 py-2.5 rounded-full text-sm font-semibold text-white
                            bg-gradient-to-r from-primary to-purple-500
                            shadow-lg shadow-primary/20
                            hover:shadow-primary/40 hover:scale-105 transition-all duration-300
                          "
                        >
                          Connect Wallet
                        </button>
                      );
                    }
                    return (
                        <div className="flex items-center gap-3">
                            <button
                                onClick={openAccountModal}
                                className="px-4 py-2 rounded-full bg-secondary/80 hover:bg-secondary font-medium text-sm transition-colors"
                            >
                                {account.displayName}
                            </button>
                        </div>
                    );
                  })()}
                </div>
              );
            }}
          </ConnectButton.Custom>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="rounded-full w-10 h-10 hover:bg-secondary/80"
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-orange-500" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-primary" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
