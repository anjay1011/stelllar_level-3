import Link from "next/link";
import StatusBadge from "@/components/shared/StatusBadge";
import { type Tournament, formatXLM } from "@/lib/mock-data";

interface TournamentCardProps {
  tournament: Tournament;
}

export default function TournamentCard({ tournament }: TournamentCardProps) {
  const isFull =
    tournament.registeredPlayers.length >= tournament.maxPlayers;
  const canJoin =
    tournament.status === "registration_open" && !isFull;
  const progress =
    (tournament.registeredPlayers.length / tournament.maxPlayers) * 100;

  return (
    <Link
      href={`/tournaments/${tournament.id}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] transition-all duration-300 hover:border-amber-500/20 hover:bg-white/[0.04] hover:shadow-xl hover:shadow-amber-500/5"
    >
      {/* Status Header */}
      <div className="flex items-center justify-between border-b border-white/5 px-5 py-3">
        <StatusBadge status={tournament.status} />
        {tournament.winner && (
          <div className="flex items-center gap-1.5 text-xs text-amber-400">
            <span>🏆</span>
            <span className="font-medium">{tournament.winner.name}</span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-base font-semibold text-white transition-colors group-hover:text-amber-400">
          {tournament.name}
        </h3>
        <p className="mt-1 text-xs text-zinc-500">
          by {tournament.organizer}
        </p>

        {/* Stats Grid */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5">
            <div className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
              Entry Fee
            </div>
            <div className="mt-0.5 text-sm font-semibold text-white">
              {formatXLM(tournament.entryFee)}
            </div>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5">
            <div className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
              Prize Pool
            </div>
            <div className="mt-0.5 text-sm font-semibold text-amber-400">
              {formatXLM(tournament.prizePool)}
            </div>
          </div>
        </div>

        {/* Players Progress */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500">Players</span>
            <span className="text-zinc-400">
              {tournament.registeredPlayers.length}/{tournament.maxPlayers}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Player Avatars */}
        {tournament.registeredPlayers.length > 0 && (
          <div className="mt-3 flex items-center gap-1">
            {tournament.registeredPlayers.slice(0, 5).map((player, i) => (
              <div
                key={player.address}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs"
                style={{ marginLeft: i > 0 ? "-4px" : "0", zIndex: 5 - i }}
              >
                {player.avatar}
              </div>
            ))}
            {tournament.registeredPlayers.length > 5 && (
              <span className="ml-1 text-xs text-zinc-500">
                +{tournament.registeredPlayers.length - 5}
              </span>
            )}
          </div>
        )}

        {/* CTA */}
        <div className="mt-4 pt-3 border-t border-white/5">
          {canJoin ? (
            <div className="flex items-center justify-center gap-2 rounded-lg bg-emerald-500/10 py-2 text-xs font-medium text-emerald-400 transition-colors group-hover:bg-emerald-500/15">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Open for Registration
            </div>
          ) : (
            <div className="flex items-center justify-center rounded-lg bg-white/5 py-2 text-xs font-medium text-zinc-400 transition-colors group-hover:text-zinc-300">
              View Details →
            </div>
          )}
        </div>
      </div>

      {/* Hover glow */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100">
        <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-amber-500/5 to-transparent" />
      </div>
    </Link>
  );
}
