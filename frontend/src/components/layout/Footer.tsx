import Link from "next/link";
import { APP_NAME } from "@/lib/constants";

export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-base font-bold text-zinc-950">
                ♔
              </div>
              <span className="text-base font-bold text-white">{APP_NAME}</span>
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-zinc-500">
              Decentralized chess tournament management powered by Stellar
              Soroban smart contracts.
            </p>
          </div>

          {/* Platform */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Platform
            </h3>
            <ul className="mt-3 space-y-2">
              {[
                { href: "/tournaments", label: "Explore Tournaments" },
                { href: "/dashboard", label: "Dashboard" },
                { href: "/dashboard/create", label: "Create Tournament" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-zinc-500 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Resources
            </h3>
            <ul className="mt-3 space-y-2">
              {[
                { href: "#", label: "Documentation" },
                { href: "#", label: "Smart Contracts" },
                { href: "#", label: "GitHub" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-zinc-500 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Network */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Network
            </h3>
            <ul className="mt-3 space-y-2">
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="text-sm text-zinc-500">Stellar Testnet</span>
              </li>
              <li className="text-sm text-zinc-500">Soroban Smart Contracts</li>
              <li className="text-sm text-zinc-500">Freighter Wallet</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 sm:flex-row">
          <p className="text-xs text-zinc-600">
            © 2026 {APP_NAME}. Built on Stellar.
          </p>
          <div className="flex items-center gap-1 text-xs text-zinc-600">
            <span>Powered by</span>
            <span className="font-semibold text-zinc-400">Soroban</span>
            <span className="mx-1">·</span>
            <span className="font-semibold text-zinc-400">Stellar</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
