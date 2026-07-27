"use client";

import { useEffect, useState } from "react";
import TournamentCard from "@/components/tournament/TournamentCard";
import EmptyState from "@/components/shared/EmptyState";
import LoadingSkeleton from "@/components/shared/LoadingSkeleton";
import ErrorState from "@/components/shared/ErrorState";
import { getAllTournaments } from "@/lib/stellar/contracts";
import { useWallet } from "@/providers/WalletProvider";
import {
  type Tournament,
  type TournamentStatus,
  statusConfig,
} from "@/lib/mock-data";

const filterOptions: { label: string; value: TournamentStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Open", value: "registration_open" },
  { label: "Ongoing", value: "ongoing" },
  { label: "Completed", value: "completed" },
  { label: "Closed", value: "registration_closed" },
  { label: "Draft", value: "draft" },
  { label: "Cancelled", value: "cancelled" },
];

export default function TournamentsPage() {
  const { publicKey } = useWallet();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<
    TournamentStatus | "all"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");

  const loadTournaments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAllTournaments(publicKey ?? undefined);
      setTournaments(data);
    } catch {
      setError("Unable to load tournaments from chain.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await getAllTournaments(publicKey ?? undefined);
        if (!cancelled) setTournaments(data);
      } catch {
        if (!cancelled) setError("Unable to load tournaments from chain.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [publicKey]);

  const filtered = tournaments.filter((t) => {
    const matchesFilter =
      activeFilter === "all" || t.status === activeFilter;
    const matchesSearch =
      searchQuery === "" ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.organizer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl font-[family-name:var(--font-space-grotesk)]">
          Explore Tournaments
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Find and join chess tournaments with on-chain prize pools
        </p>
      </div>

      {/* Search & Filters */}
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative max-w-sm flex-1">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search tournaments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-amber-500/30 focus:bg-white/[0.04]"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-1.5">
          {filterOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setActiveFilter(opt.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                activeFilter === opt.value
                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                  : "bg-white/[0.03] text-zinc-400 border border-white/[0.06] hover:bg-white/[0.06] hover:text-zinc-300"
              }`}
            >
              {opt.label}
              {opt.value !== "all" && (
                <span className="ml-1.5 text-[10px] opacity-60">
                  {tournaments.filter((t) => t.status === opt.value).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Results Count */}
      <div className="mt-6 flex items-center justify-between">
        <span className="text-xs text-zinc-500">
          {filtered.length} tournament{filtered.length !== 1 ? "s" : ""} found
        </span>
        {activeFilter !== "all" && (
          <button
            onClick={() => setActiveFilter("all")}
            className="text-xs text-amber-400 hover:text-amber-300"
          >
            Clear filter
          </button>
        )}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="mt-4">
          <LoadingSkeleton variant="card" count={6} />
        </div>
      ) : error ? (
        <div className="mt-4">
          <ErrorState message={error} onRetry={loadTournaments} />
        </div>
      ) : filtered.length > 0 ? (
        <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => (
            <TournamentCard key={t.id} tournament={t} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon="♟"
          title="No tournaments found"
          description={
            searchQuery
              ? `No results for "${searchQuery}". Try a different search.`
              : `No ${
                  activeFilter !== "all"
                    ? statusConfig[activeFilter].label.toLowerCase()
                    : ""
                } tournaments available right now.`
          }
          action={{ label: "Create Tournament", href: "/dashboard/create" }}
        />
      )}
    </div>
  );
}
