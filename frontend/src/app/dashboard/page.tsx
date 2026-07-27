"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import StatusBadge from "@/components/shared/StatusBadge";
import LoadingSkeleton from "@/components/shared/LoadingSkeleton";
import ErrorState from "@/components/shared/ErrorState";
import { getAllTournaments, getContractActivityFeed } from "@/lib/stellar/contracts";
import { useWallet } from "@/providers/WalletProvider";
import {
  formatXLM,
  timeAgo,
  type Tournament,
  type Activity,
} from "@/lib/mock-data";

export default function DashboardPage() {
  const { isConnected, publicKey } = useWallet();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeAddress = publicKey ?? "";

  const loadDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [tList, actList] = await Promise.all([
        getAllTournaments(publicKey ?? undefined),
        getContractActivityFeed(),
      ]);
      setTournaments(tList);
      setActivities(actList);
    } catch {
      setError("Unable to load dashboard data from chain.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [tList, actList] = await Promise.all([
          getAllTournaments(publicKey ?? undefined),
          getContractActivityFeed(),
        ]);
        if (!cancelled) {
          setTournaments(tList);
          setActivities(actList);
        }
      } catch {
        if (!cancelled) setError("Unable to load dashboard data from chain.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [publicKey]);

  const joinedTournaments = tournaments.filter((t) =>
    t.registeredPlayers.some((p) => p.address === activeAddress)
  );
  const createdTournaments = tournaments.filter(
    (t) => t.organizerAddress === activeAddress
  );

  const activityIcons: Record<string, string> = {
    tournament_created: "🏗️",
    player_registered: "✅",
    tournament_started: "🚀",
    winner_declared: "🏆",
    prize_released: "💰",
    registration_closed: "🔒",
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl font-[family-name:var(--font-space-grotesk)]">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Manage your tournaments and track activity
          </p>
        </div>
        <Link
          href="/dashboard/create"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2.5 text-sm font-semibold text-zinc-950 shadow-lg shadow-amber-500/25 transition-all hover:shadow-amber-500/40 hover:brightness-110 active:scale-[0.98]"
        >
          <span className="text-base">+</span>
          Create Tournament
        </Link>
      </div>

      {/* Wallet Card */}
      <div className="mt-8 overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-r from-white/[0.03] to-white/[0.01]">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 text-2xl">
            {isConnected ? "♚" : "♟"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-white">
                {isConnected && publicKey ? `${publicKey.slice(0, 6)}...${publicKey.slice(-4)}` : "Not Connected"}
              </span>
              <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-medium text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {isConnected ? "Freighter Active" : "Not Connected"}
              </div>
            </div>
            <div className="mt-0.5 font-mono text-xs text-zinc-500">
              {activeAddress}
            </div>
          </div>
          <div className="flex items-center gap-6 sm:text-right">
            <div>
              <div className="text-xs text-zinc-500">Rating</div>
              <div className="text-lg font-bold text-white font-[family-name:var(--font-space-grotesk)]">
                —
              </div>
            </div>
            <div>
              <div className="text-xs text-zinc-500">Balance</div>
              <div className="text-lg font-bold text-amber-400 font-[family-name:var(--font-space-grotesk)]">
                2,450 XLM
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: "Joined",
            value: joinedTournaments.length.toString(),
            icon: "🎮",
          },
          {
            label: "Created",
            value: createdTournaments.length.toString(),
            icon: "🏗️",
          },
          { label: "Won", value: "0", icon: "🏆" },
          {
            label: "Total Earned",
            value: "0 XLM",
            icon: "💎",
            highlight: true,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`rounded-xl border bg-white/[0.02] p-4 ${
              stat.highlight
                ? "border-amber-500/20"
                : "border-white/[0.06]"
            }`}
          >
            <div className="text-xs text-zinc-500">
              {stat.icon} {stat.label}
            </div>
            <div
              className={`mt-1 text-xl font-bold font-[family-name:var(--font-space-grotesk)] ${
                stat.highlight ? "text-amber-400" : "text-white"
              }`}
            >
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Content Grid */}
      {error ? (
        <div className="mt-8">
          <ErrorState message={error} onRetry={loadDashboardData} />
        </div>
      ) : (
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Joined Tournaments */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02]">
            <div className="border-b border-white/5 px-5 py-4">
              <h2 className="text-base font-semibold text-white">
                My Tournaments
              </h2>
            </div>
            {isLoading ? (
              <div className="p-5">
                <LoadingSkeleton variant="row" count={3} />
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {joinedTournaments.map((t) => (
                  <Link
                    key={t.id}
                    href={`/tournaments/${t.id}`}
                    className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/[0.02]"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 text-base">
                      ♞
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">
                        {t.name}
                      </div>
                      <div className="mt-0.5 text-xs text-zinc-500">
                        {t.organizer} · {t.registeredPlayers.length}/
                        {t.maxPlayers} players
                      </div>
                    </div>
                    <div className="hidden sm:flex flex-col items-end gap-1">
                      <StatusBadge status={t.status} />
                      <span className="text-xs text-zinc-500">
                        {formatXLM(t.prizePool)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Created Tournaments */}
          <div className="mt-6 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
            <div className="border-b border-white/5 px-5 py-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">
                Created by Me
              </h2>
              <Link
                href="/dashboard/create"
                className="text-xs text-amber-400 hover:text-amber-300"
              >
                + New
              </Link>
            </div>
            {isLoading ? (
              <div className="p-5">
                <LoadingSkeleton variant="row" count={2} />
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {createdTournaments.map((t) => (
                  <Link
                    key={t.id}
                    href={`/dashboard/manage/${t.id}`}
                    className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/[0.02]"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-base">
                      ♚
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">
                        {t.name}
                      </div>
                      <div className="mt-0.5 text-xs text-zinc-500">
                        {t.registeredPlayers.length}/{t.maxPlayers} players ·{" "}
                        {formatXLM(t.prizePool)} pool
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <StatusBadge status={t.status} />
                      <span className="text-xs text-zinc-500">Manage →</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Activity Feed */}
        <div>
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02]">
            <div className="border-b border-white/5 px-5 py-4">
              <h2 className="text-base font-semibold text-white">
                Recent Activity
              </h2>
            </div>
            <div className="divide-y divide-white/5">
              {activities.map((activity) => (
                <div key={activity.id} className="px-5 py-3.5">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 text-sm">
                      {activityIcons[activity.type] || "📋"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-zinc-300 leading-relaxed">
                        {activity.type === "player_registered" && (
                          <>
                            <span className="font-medium text-white">
                              {activity.playerName}
                            </span>{" "}
                            joined{" "}
                            <span className="font-medium text-white">
                              {activity.tournamentName}
                            </span>
                          </>
                        )}
                        {activity.type === "tournament_created" && (
                          <>
                            <span className="font-medium text-white">
                              {activity.tournamentName}
                            </span>{" "}
                            was created
                          </>
                        )}
                        {activity.type === "winner_declared" && (
                          <>
                            <span className="font-medium text-white">
                              {activity.playerName}
                            </span>{" "}
                            won{" "}
                            <span className="font-medium text-white">
                              {activity.tournamentName}
                            </span>
                          </>
                        )}
                        {activity.type === "prize_released" && (
                          <>
                            <span className="font-medium text-amber-400">
                              {formatXLM(activity.amount || 0)}
                            </span>{" "}
                            released to{" "}
                            <span className="font-medium text-white">
                              {activity.playerName}
                            </span>
                          </>
                        )}
                        {activity.type === "tournament_started" && (
                          <>
                            <span className="font-medium text-white">
                              {activity.tournamentName}
                            </span>{" "}
                            has started
                          </>
                        )}
                        {activity.type === "registration_closed" && (
                          <>
                            Registration closed for{" "}
                            <span className="font-medium text-white">
                              {activity.tournamentName}
                            </span>
                          </>
                        )}
                      </p>
                      <span className="mt-1 block text-[10px] text-zinc-600">
                        {timeAgo(activity.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
