"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { NAV_LINKS, APP_NAME } from "@/lib/constants";
import { useWallet } from "@/providers/WalletProvider";

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isConnected, publicKey, connect, disconnect, isLoading } = useWallet();

  const truncatedAddress = publicKey
    ? `${publicKey.slice(0, 4)}...${publicKey.slice(-4)}`
    : "";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-zinc-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-lg font-bold text-zinc-950 shadow-lg shadow-amber-500/20 transition-shadow group-hover:shadow-amber-500/40">
            ♔
          </div>
          <span className="text-lg font-bold tracking-tight text-white">
            {APP_NAME}
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-zinc-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Wallet Button */}
        <div className="hidden md:flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50 animate-pulse" />
          <span className="text-xs text-zinc-500">Testnet</span>

          {isConnected ? (
            <button
              onClick={disconnect}
              className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-400 transition-all hover:bg-amber-500/20"
            >
              {truncatedAddress}
            </button>
          ) : (
            <button
              onClick={connect}
              disabled={isLoading}
              className="rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-sm font-semibold text-zinc-950 shadow-lg shadow-amber-500/25 transition-all hover:shadow-amber-500/40 hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
            >
              {isLoading ? "Connecting..." : "Connect Wallet"}
            </button>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/5 hover:text-white md:hidden"
          aria-label="Toggle menu"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            {mobileOpen ? (
              <path d="M5 5l10 10M15 5L5 15" />
            ) : (
              <path d="M3 5h14M3 10h14M3 15h14" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="border-t border-white/5 bg-zinc-950/95 backdrop-blur-xl md:hidden">
          <div className="space-y-1 px-4 py-3">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-white/10 text-white"
                      : "text-zinc-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            {isConnected ? (
              <button
                onClick={() => {
                  disconnect();
                  setMobileOpen(false);
                }}
                className="mt-2 w-full rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-400"
              >
                {truncatedAddress} (Disconnect)
              </button>
            ) : (
              <button
                onClick={() => {
                  connect();
                  setMobileOpen(false);
                }}
                disabled={isLoading}
                className="mt-2 w-full rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2.5 text-sm font-semibold text-zinc-950 shadow-lg shadow-amber-500/25"
              >
                {isLoading ? "Connecting..." : "Connect Wallet"}
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
