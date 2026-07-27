"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  connectFreighter,
  checkFreighterInstalled,
  type WalletState,
} from "@/lib/stellar/wallet";

interface WalletContextType extends WalletState {
  connect: () => Promise<void>;
  disconnect: () => void;
  isLoading: boolean;
  error: string | null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [wallet, setWallet] = useState<WalletState>({
    isConnected: false,
    publicKey: null,
    network: null,
    isFreighterInstalled: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function initWallet() {
      const installed = await checkFreighterInstalled();
      setWallet((prev) => ({ ...prev, isFreighterInstalled: installed }));
    }
    initWallet();
  }, []);

  const connect = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { publicKey, network } = await connectFreighter();
      setWallet({
        isConnected: true,
        publicKey,
        network,
        isFreighterInstalled: true,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to connect Freighter wallet";
      setError(message);
      console.error("Wallet connection error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const disconnect = () => {
    setWallet({
      isConnected: false,
      publicKey: null,
      network: null,
      isFreighterInstalled: wallet.isFreighterInstalled,
    });
  };

  return (
    <WalletContext.Provider
      value={{
        ...wallet,
        connect,
        disconnect,
        isLoading,
        error,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}
