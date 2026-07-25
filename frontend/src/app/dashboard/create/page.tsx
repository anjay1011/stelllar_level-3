"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createTournamentContract } from "@/lib/stellar/contracts";
import { useWallet } from "@/providers/WalletProvider";

export default function CreateTournamentPage() {
  const router = useRouter();
  const { isConnected, publicKey, connect } = useWallet();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    entryFee: "50",
    maxPlayers: "8",
    startsAt: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !publicKey) {
      await connect();
      return;
    }

    // Client-side validation
    const fee = parseFloat(formData.entryFee);
    if (!formData.name.trim()) {
      setError("Tournament name is required.");
      return;
    }
    if (isNaN(fee) || fee < 0) {
      setError("Entry fee must be a non-negative number.");
      return;
    }
    if (!formData.startsAt) {
      setError("Start date and time is required.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const result = await createTournamentContract(
        formData.name.trim(),
        formData.description.trim(),
        fee,
        parseInt(formData.maxPlayers) || 8,
        publicKey
      );
      if (result.success && result.tournamentId) {
        setCreatedId(result.tournamentId);
        setSuccess(true);
        setTimeout(() => {
          router.push(`/tournaments/${result.tournamentId}`);
        }, 1500);
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to create tournament.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculatedPrizePool =
    (parseFloat(formData.entryFee) || 0) * (parseInt(formData.maxPlayers) || 0);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-xs text-zinc-500">
        <Link href="/dashboard" className="hover:text-white transition-colors">
          Dashboard
        </Link>
        <span>→</span>
        <span className="text-zinc-400">Create Tournament</span>
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl font-[family-name:var(--font-space-grotesk)]">
          Create Tournament
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Deploy a new chess tournament smart contract on Stellar Testnet
        </p>
      </div>

      {success ? (
        <div className="mt-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.05] p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-3xl">
            🏆
          </div>
          <h2 className="mt-4 text-xl font-bold text-white">
            Tournament Created Successfully!
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            {createdId
              ? `Redirecting you to ${createdId}...`
              : "Redirecting you to your tournament..."}
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/[0.05] p-4 text-sm text-red-400">
              {error}
            </div>
          )}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-5">
            <h2 className="text-base font-semibold text-white border-b border-white/5 pb-3">
              Tournament Details
            </h2>

            {/* Name */}
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-zinc-400">
                Tournament Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Stellar Master Series #1"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="mt-2 w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-amber-500/40 focus:bg-white/[0.04]"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-zinc-400">
                Description
              </label>
              <textarea
                rows={3}
                placeholder="Brief summary of rules, format (e.g. Lichess Blitz 3+0), and schedule..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="mt-2 w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-amber-500/40 focus:bg-white/[0.04]"
              />
            </div>

            {/* Grid for Fee & Max Players */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-zinc-400">
                  Entry Fee (XLM) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="5"
                  required
                  value={formData.entryFee}
                  onChange={(e) =>
                    setFormData({ ...formData, entryFee: e.target.value })
                  }
                  className="mt-2 w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-2.5 text-sm text-white outline-none focus:border-amber-500/40 focus:bg-white/[0.04]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-zinc-400">
                  Max Players *
                </label>
                <select
                  value={formData.maxPlayers}
                  onChange={(e) =>
                    setFormData({ ...formData, maxPlayers: e.target.value })
                  }
                  className="mt-2 w-full rounded-xl border border-white/[0.08] bg-zinc-900 px-4 py-2.5 text-sm text-white outline-none focus:border-amber-500/40"
                >
                  <option value="4">4 Players (2 Rounds)</option>
                  <option value="8">8 Players (3 Rounds)</option>
                  <option value="16">16 Players (4 Rounds)</option>
                  <option value="32">32 Players (5 Rounds)</option>
                </select>
              </div>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-zinc-400">
                Start Date & Time *
              </label>
              <input
                type="datetime-local"
                required
                value={formData.startsAt}
                onChange={(e) =>
                  setFormData({ ...formData, startsAt: e.target.value })
                }
                className="mt-2 w-full rounded-xl border border-white/[0.08] bg-zinc-900 px-4 py-2.5 text-sm text-white outline-none focus:border-amber-500/40"
              />
            </div>
          </div>

          {/* Summary Box */}
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.03] p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium uppercase tracking-wider text-amber-400/80">
                  Calculated Total Prize Pool
                </div>
                <div className="mt-1 text-2xl font-bold text-amber-400 font-[family-name:var(--font-space-grotesk)]">
                  {calculatedPrizePool.toLocaleString()} XLM
                </div>
              </div>
              <div className="text-right text-xs text-zinc-400">
                <div>100% directly to winner</div>
                <div className="text-zinc-500">0% platform fee</div>
              </div>
            </div>
          </div>

          {/* Submit CTA */}
          <div className="flex items-center justify-end gap-3">
            <Link
              href="/dashboard"
              className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-2.5 text-sm font-semibold text-zinc-950 shadow-lg shadow-amber-500/25 transition-all hover:shadow-amber-500/40 hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-950 border-t-transparent" />
                  Creating on Soroban...
                </>
              ) : (
                "Create Tournament"
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
