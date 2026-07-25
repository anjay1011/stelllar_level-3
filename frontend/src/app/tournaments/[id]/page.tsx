"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import StatusBadge from "@/components/shared/StatusBadge";
import BracketView from "@/components/tournament/BracketView";
import EmptyState from "@/components/shared/EmptyState";
import LoadingSkeleton from "@/components/shared/LoadingSkeleton";
import ErrorState from "@/components/shared/ErrorState";
import { getTournamentById, registerPlayerContract } from "@/lib/stellar/contracts";
import { useWallet } from "@/providers/WalletProvider";
import {
  type Tournament,
  formatXLM,
  formatDate,
  formatTime,
} from "@/lib/mock-data";

export default function TournamentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { isConnected, publicKey, connect } = useWallet();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const loadDetail = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getTournamentById(id);
      setTournament(data || null);
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
        const data = await getTournamentById(id);
        if (!cancelled) setTournament(data || null);
      } catch {
        if (!cancelled) setError("Unable to load tournament details.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  const joined = tournament && publicKey
    ? tournament.registeredPlayers.some((p) => p.address === publicKey)
    : false;

  const handleJoin = async () => {
    if (!isConnected) {
      await connect();
      return;
    }
    if (!tournament || !publicKey) return;

    setIsJoining(true);
    setJoinError(null);
    try {
      await registerPlayerContract(tournament.id, publicKey);
      // Refresh tournament data to get updated player list
      await loadDetail();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to join tournament.";
      setJoinError(msg);
    } finally {
      setIsJoining(false);
    }
  };

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
          <ErrorState message={error} onRetry={loadDetail} />
        ) : (
          <EmptyState
            icon="♚"
            title="Tournament not found"
            description="This tournament doesn't exist or has been removed."
            action={{ label: "Browse Tournaments", href: "/tournaments" }}
          />
        )}
      </div>
    );
  }

  const canJoin =
    tournament.status === "registration_open" &&
    tournament.registeredPlayers.length < tournament.maxPlayers &&
    !joined;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-xs text-zinc-500">
        <Link href="/tournaments" className="hover:text-white transition-colors">
          Tournaments
        </Link>
        <span>→</span>
        <span className="text-zinc-400">{tournament.name}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl font-[family-name:var(--font-space-grotesk)]">
              {tournament.name}
            </h1>
            <StatusBadge status={tournament.status} size="md" />
          </div>
          <p className="mt-2 text-sm text-zinc-500">
            Organized by{" "}
            <span className="text-zinc-400">{tournament.organizer}</span>
            <span className="mx-2">·</span>
            <span className="font-mono text-xs text-zinc-600">
              {tournament.organizerAddress}
            </span>
          </p>
        </div>

        {canJoin && (
          <button
            onClick={handleJoin}
            disabled={isJoining}
            className="shrink-0 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3 text-sm font-semibold text-zinc-950 shadow-lg shadow-amber-500/25 transition-all hover:shadow-amber-500/40 hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
          >
            {isJoining
              ? "Registering..."
              : `Join Tournament — ${formatXLM(tournament.entryFee)}`}
          </button>
        )}
        {joinError && (
          <p className="mt-2 text-xs text-red-400 sm:text-right">{joinError}</p>
        )}
      </div>

      {/* Description */}
      <p className="mt-5 max-w-3xl text-sm leading-relaxed text-zinc-400">
        {tournament.description}
      </p>

      {/* Stats Cards */}
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: "Entry Fee",
            value: formatXLM(tournament.entryFee),
            icon: "💎",
          },
          {
            label: "Prize Pool",
            value: formatXLM(tournament.prizePool),
            icon: "🏆",
            highlight: true,
          },
          {
            label: "Players",
            value: `${tournament.registeredPlayers.length}/${tournament.maxPlayers}`,
            icon: "👥",
          },
          {
            label: "Starts",
            value: formatDate(tournament.startsAt),
            sub: formatTime(tournament.startsAt),
            icon: "📅",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`rounded-xl border bg-white/[0.02] p-4 ${
              stat.highlight
                ? "border-amber-500/20 bg-amber-500/[0.03]"
                : "border-white/[0.06]"
            }`}
          >
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span>{stat.icon}</span>
              {stat.label}
            </div>
            <div
              className={`mt-1 text-lg font-bold font-[family-name:var(--font-space-grotesk)] ${
                stat.highlight ? "text-amber-400" : "text-white"
              }`}
            >
              {stat.value}
            </div>
            {stat.sub && (
              <div className="text-xs text-zinc-500">{stat.sub}</div>
            )}
          </div>
        ))}
      </div>

      {/* Winner Banner */}
      {tournament.winner && (
        <div className="mt-8 overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/[0.08] via-amber-500/[0.04] to-transparent">
          <div className="flex items-center gap-4 p-5 sm:p-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-amber-500/15 text-2xl">
              {tournament.winner.avatar}
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wider text-amber-400/70">
                Tournament Champion
              </div>
              <div className="mt-0.5 text-lg font-bold text-white">
                {tournament.winner.name}
              </div>
              <div className="mt-0.5 text-xs font-mono text-zinc-500">
                {tournament.winner.address}
              </div>
            </div>
            <div className="ml-auto text-right hidden sm:block">
              <div className="text-xs text-zinc-500">Prize Won</div>
              <div className="text-xl font-bold text-amber-400 font-[family-name:var(--font-space-grotesk)]">
                {formatXLM(tournament.prizePool)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content Grid */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Bracket — 2 cols */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <h2 className="text-base font-semibold text-white">
              Tournament Bracket
            </h2>
            {tournament.bracket && tournament.bracket.length > 0 ? (
              <div className="mt-4">
                <BracketView matches={tournament.bracket} />
              </div>
            ) : (
              <div className="mt-4 flex flex-col items-center justify-center py-12 text-center">
                <div className="text-3xl opacity-20">♟</div>
                <p className="mt-2 text-sm text-zinc-500">
                  Bracket will be generated when the tournament starts
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar — Registered Players */}
        <div>
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">
                Registered Players
              </h2>
              <span className="text-xs text-zinc-500">
                {tournament.registeredPlayers.length}/
                {tournament.maxPlayers}
              </span>
            </div>

            {tournament.registeredPlayers.length > 0 ? (
              <div className="mt-4 space-y-2">
                {tournament.registeredPlayers.map((player) => (
                  <div
                    key={player.address}
                    className={`flex items-center gap-3 rounded-xl border bg-white/[0.01] p-3 transition-colors hover:bg-white/[0.03] ${
                      tournament.winner &&
                      tournament.winner.address === player.address
                        ? "border-amber-500/20 bg-amber-500/[0.03]"
                        : "border-white/[0.04]"
                    }`}
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-sm">
                      {player.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white truncate">
                          {player.name}
                        </span>
                        {tournament.winner &&
                          tournament.winner.address === player.address && (
                            <span className="text-xs text-amber-400">🏆</span>
                          )}
                      </div>
                      <span className="text-xs font-mono text-zinc-600">
                        {player.address}
                      </span>
                    </div>
                    {player.rating && (
                      <span className="text-xs font-medium text-zinc-400">
                        {player.rating}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 py-8 text-center">
                <div className="text-2xl opacity-20">👥</div>
                <p className="mt-2 text-xs text-zinc-500">
                  No players registered yet
                </p>
              </div>
            )}

            {/* Progress */}
            <div className="mt-4">
              <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500"
                  style={{
                    width: `${(tournament.registeredPlayers.length / tournament.maxPlayers) * 100}%`,
                  }}
                />
              </div>
              <div className="mt-1.5 flex items-center justify-between text-xs text-zinc-500">
                <span>
                  {tournament.maxPlayers -
                    tournament.registeredPlayers.length}{" "}
                  spots remaining
                </span>
                <span>
                  {Math.round(
                    (tournament.registeredPlayers.length /
                      tournament.maxPlayers) *
                      100
                  )}
                  %
                </span>
              </div>
            </div>
          </div>

          {/* Tournament Info */}
          <div className="mt-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <h2 className="text-base font-semibold text-white">
              Tournament Info
            </h2>
            <dl className="mt-3 space-y-3">
              {[
                { label: "Created", value: formatDate(tournament.createdAt) },
                {
                  label: "Start Date",
                  value: `${formatDate(tournament.startsAt)} at ${formatTime(tournament.startsAt)}`,
                },
                { label: "Format", value: "Single Elimination" },
                { label: "Max Players", value: tournament.maxPlayers.toString() },
                { label: "Contract", value: "Tournament v1.0" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between border-b border-white/[0.04] pb-2.5 last:border-0 last:pb-0"
                >
                  <dt className="text-xs text-zinc-500">{item.label}</dt>
                  <dd className="text-xs font-medium text-zinc-300">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
