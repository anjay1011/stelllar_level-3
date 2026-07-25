import { type BracketMatch } from "@/lib/mock-data";

interface BracketViewProps {
  matches: BracketMatch[];
}

export default function BracketView({ matches }: BracketViewProps) {
  const rounds = [
    { name: "Quarter Finals", matches: matches.filter((m) => m.round === 1) },
    { name: "Semi Finals", matches: matches.filter((m) => m.round === 2) },
    { name: "Final", matches: matches.filter((m) => m.round === 3) },
  ];

  return (
    <div className="overflow-x-auto">
      <div className="inline-flex items-stretch gap-2 min-w-[700px] py-4">
        {rounds.map((round, roundIndex) => (
          <div key={round.name} className="flex flex-col">
            {/* Round Header */}
            <div className="mb-4 text-center">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                {round.name}
              </span>
            </div>

            {/* Matches */}
            <div
              className="flex flex-1 flex-col justify-around gap-4"
              style={{ minWidth: "200px" }}
            >
              {round.matches.map((match) => (
                <BracketMatchCard
                  key={match.id}
                  match={match}
                  isLast={roundIndex === rounds.length - 1}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BracketMatchCard({
  match,
  isLast,
}: {
  match: BracketMatch;
  isLast: boolean;
}) {
  const statusColors = {
    pending: "border-white/5",
    ongoing: "border-sky-500/30 shadow-lg shadow-sky-500/5",
    completed: "border-white/10",
  };

  return (
    <div
      className={`overflow-hidden rounded-xl border bg-white/[0.02] ${statusColors[match.status]} ${isLast ? "ring-1 ring-amber-500/20" : ""}`}
    >
      {/* Match Status Indicator */}
      {match.status === "ongoing" && (
        <div className="flex items-center justify-center gap-1.5 bg-sky-500/10 py-1 text-[10px] font-medium text-sky-400">
          <span className="h-1 w-1 rounded-full bg-sky-400 animate-pulse" />
          LIVE
        </div>
      )}
      {match.status === "completed" && isLast && (
        <div className="flex items-center justify-center gap-1.5 bg-amber-500/10 py-1 text-[10px] font-medium text-amber-400">
          🏆 CHAMPION
        </div>
      )}

      {/* Player 1 */}
      <div
        className={`flex items-center gap-2.5 px-3 py-2.5 ${
          match.winner && match.player1 && match.winner.address === match.player1.address
            ? "bg-emerald-500/5"
            : ""
        }`}
      >
        <span className="text-base">
          {match.player1?.avatar || "?"}
        </span>
        <span
          className={`flex-1 text-sm font-medium ${
            match.player1 ? "text-white" : "text-zinc-600"
          } ${
            match.winner && match.player1 && match.winner.address === match.player1.address
              ? "text-emerald-400"
              : ""
          }`}
        >
          {match.player1?.name || "TBD"}
        </span>
        {match.winner && match.player1 && match.winner.address === match.player1.address && (
          <span className="text-xs text-emerald-400">✓</span>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-white/5" />

      {/* Player 2 */}
      <div
        className={`flex items-center gap-2.5 px-3 py-2.5 ${
          match.winner && match.player2 && match.winner.address === match.player2.address
            ? "bg-emerald-500/5"
            : ""
        }`}
      >
        <span className="text-base">
          {match.player2?.avatar || "?"}
        </span>
        <span
          className={`flex-1 text-sm font-medium ${
            match.player2 ? "text-white" : "text-zinc-600"
          } ${
            match.winner && match.player2 && match.winner.address === match.player2.address
              ? "text-emerald-400"
              : ""
          }`}
        >
          {match.player2?.name || "TBD"}
        </span>
        {match.winner && match.player2 && match.winner.address === match.player2.address && (
          <span className="text-xs text-emerald-400">✓</span>
        )}
      </div>
    </div>
  );
}
