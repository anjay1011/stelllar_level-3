"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import StatusBadge from "@/components/shared/StatusBadge";
import BracketView from "@/components/tournament/BracketView";
import EmptyState from "@/components/shared/EmptyState";
import LoadingSkeleton from "@/components/shared/LoadingSkeleton";
import ErrorState from "@/components/shared/ErrorState";
import { getTournamentById, updateTournamentStatusContract } from "@/lib/stellar/contracts";
import { useWallet } from "@/providers/WalletProvider";
import {
  formatXLM,
  type Tournament,
  type TournamentStatus,
} from "@/lib/mock-data";

export default function ManageTournamentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { isConnected, publicKey, connect } = useWallet();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<TournamentStatus>("draft");
  const [selectedWinner, setSelectedWinner] = useState<string>("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadManageData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getTournamentById(id, publicKey ?? undefined);
      if (data) {
        setTournament(data);
        setStatus(data.status);
      }
    } catch {
      setError("Unable to load tournament details.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await getTournamentById(id, publicKey ?? undefined);
        if (!cancelled && data) {
          setTournament(data);
          setStatus(data.status);
        }
      } catch {
        if (!cancelled) setError("Unable to load tournament details.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id, publicKey]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <LoadingSkeleton variant="detail" />
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {error ? (
          <ErrorState message={error} onRetry={loadManageData} />
        ) : (
          <EmptyState
            icon="♚"
            title="Tournament not found"
            description="The tournament you are trying to manage does not exist."
            action={{ label: "Go to Dashboard", href: "/dashboard" }}
          />
        )}
      </div>
    );
  }

  const handleStatusChange = async (newStatus: TournamentStatus, actionName: string) => {
    if (!isConnected) {
      await connect();
      return;
    }
    setActionLoading(actionName);
    setActionError(null);
    try {
      await updateTournamentStatusContract(
        tournament.id,
        newStatus,
        publicKey || tournament.organizerAddress,
        selectedWinner
      );
      // Refresh tournament data to get updated status
      await loadManageData();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Contract state transition failed.";
      setActionError(msg);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-xs text-zinc-500">
        <Link href="/dashboard" className="hover:text-white transition-colors">
          Dashboard
        </Link>
        <span>→</span>
        <span className="text-zinc-400">Manage {tournament.name}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl font-[family-name:var(--font-space-grotesk)]">
              Manage Tournament
            </h1>
            <StatusBadge status={status} size="md" />
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            {tournament.name} · Prize Pool:{" "}
            <span className="text-amber-400 font-semibold">
              {formatXLM(tournament.prizePool)}
            </span>
          </p>
        </div>

        <Link
          href={`/tournaments/${tournament.id}`}
          className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10"
        >
          View Public Page →
        </Link>
      </div>

      {/* Organizer Control Panel */}
      <div className="mt-8 rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/[0.05] via-transparent to-transparent p-6">
        <h2 className="text-base font-semibold text-white border-b border-white/5 pb-3">
          Organizer Actions (Smart Contract State Controls)
        </h2>

        {actionError && (
          <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/[0.05] p-3 text-xs text-red-400">
            {actionError}
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-3">
          {/* Draft -> Open Registration */}
          {status === "draft" && (
            <button
              onClick={() => handleStatusChange("registration_open", "open")}
              disabled={!!actionLoading}
              className="rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-4 py-2.5 text-xs font-semibold hover:bg-emerald-500/30 disabled:opacity-50"
            >
              {actionLoading === "open" ? "Opening..." : "Open Registration"}
            </button>
          )}

          {/* Registration Open -> Close Registration */}
          {status === "registration_open" && (
            <button
              onClick={() => handleStatusChange("registration_closed", "close")}
              disabled={!!actionLoading}
              className="rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 px-4 py-2.5 text-xs font-semibold hover:bg-amber-500/30 disabled:opacity-50"
            >
              {actionLoading === "close" ? "Closing..." : "Close Registration"}
            </button>
          )}

          {/* Registration Closed -> Start Tournament */}
          {status === "registration_closed" && (
            <button
              onClick={() => handleStatusChange("ongoing", "start")}
              disabled={!!actionLoading}
              className="rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 px-4 py-2.5 text-xs font-semibold hover:bg-sky-500/30 disabled:opacity-50"
            >
              {actionLoading === "start" ? "Starting..." : "Start Tournament (Generate Bracket)"}
            </button>
          )}

          {/* Ongoing -> Declare Winner */}
          {status === "ongoing" && (
            <div className="flex items-center gap-2">
              <select
                value={selectedWinner}
                onChange={(e) => setSelectedWinner(e.target.value)}
                className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-xs text-white outline-none"
              >
                <option value="">Select Final Winner...</option>
                {tournament.registeredPlayers.map((p) => (
                  <option key={p.address} value={p.address}>
                    {p.name} ({p.address.slice(0, 8)}...)
                  </option>
                ))}
              </select>
              <button
                disabled={!selectedWinner || !!actionLoading}
                onClick={() => handleStatusChange("completed", "winner")}
                className="rounded-xl bg-violet-500/20 text-violet-400 border border-violet-500/30 px-4 py-2 text-xs font-semibold hover:bg-violet-500/30 disabled:opacity-50"
              >
                {actionLoading === "winner" ? "Declaring..." : "Declare Winner"}
              </button>
            </div>
          )}

          {/* Completed -> Release Prize */}
          {status === "completed" && (
            <button
              onClick={() => handleStatusChange("prize_released", "prize")}
              disabled={!!actionLoading}
              className="rounded-xl bg-amber-500 to-amber-600 text-zinc-950 px-5 py-2.5 text-xs font-bold shadow-lg shadow-amber-500/25 hover:brightness-110 disabled:opacity-50"
            >
              {actionLoading === "prize" ? "Releasing..." : "Release Prize Pool (Execute Treasury Payout)"}
            </button>
          )}

          {/* Cancel Tournament */}
          {status !== "cancelled" && status !== "prize_released" && (
            <button
              onClick={() => handleStatusChange("cancelled", "cancel")}
              disabled={!!actionLoading}
              className="ml-auto rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 px-4 py-2.5 text-xs font-semibold hover:bg-red-500/20 disabled:opacity-50"
            >
              {actionLoading === "cancel" ? "Cancelling..." : "Cancel Tournament & Refund All"}
            </button>
          )}
        </div>
      </div>

      {/* Bracket & Players */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Bracket */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <h2 className="text-base font-semibold text-white">
              Live Bracket & Match Controls
            </h2>
            {tournament.bracket && tournament.bracket.length > 0 ? (
              <div className="mt-4">
                <BracketView matches={tournament.bracket} />
              </div>
            ) : (
              <div className="mt-4 py-12 text-center text-sm text-zinc-500">
                Bracket will appear when tournament is started.
              </div>
            )}
          </div>
        </div>

        {/* Players & Status Summary */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <h2 className="text-base font-semibold text-white">
              Registered Players ({tournament.registeredPlayers.length}/{tournament.maxPlayers})
            </h2>
            <div className="mt-4 space-y-2">
              {tournament.registeredPlayers.map((player) => (
                <div
                  key={player.address}
                  className="flex items-center justify-between rounded-xl border border-white/[0.04] bg-white/[0.01] p-3"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">{player.avatar}</span>
                    <div>
                      <div className="text-xs font-medium text-white">
                        {player.name}
                      </div>
                      <div className="text-[10px] font-mono text-zinc-500">
                        {player.address}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                    Paid {formatXLM(tournament.entryFee)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
