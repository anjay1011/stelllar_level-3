export default function LoadingSkeleton({
  variant = "card",
  count = 1,
}: {
  variant?: "card" | "detail" | "row" | "text";
  count?: number;
}) {
  const items = Array.from({ length: count }, (_, i) => i);

  if (variant === "text") {
    return (
      <div className="space-y-3">
        {items.map((i) => (
          <div
            key={i}
            className="h-4 animate-pulse rounded-md bg-white/5"
            style={{ width: `${70 + ((i * 17 + 13) % 30)}%` }}
          />
        ))}
      </div>
    );
  }

  if (variant === "row") {
    return (
      <div className="space-y-3">
        {items.map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-4"
          >
            <div className="h-10 w-10 animate-pulse rounded-full bg-white/5" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 animate-pulse rounded bg-white/5" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-white/5" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === "detail") {
    return (
      <div className="space-y-6">
        <div className="h-8 w-2/3 animate-pulse rounded-lg bg-white/5" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-white/5" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl border border-white/5 bg-white/[0.02]"
            />
          ))}
        </div>
      </div>
    );
  }

  // Card variant
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((i) => (
        <div
          key={i}
          className="rounded-2xl border border-white/5 bg-white/[0.02] p-5"
        >
          <div className="space-y-3">
            <div className="flex justify-between">
              <div className="h-5 w-24 animate-pulse rounded-full bg-white/5" />
              <div className="h-5 w-16 animate-pulse rounded bg-white/5" />
            </div>
            <div className="h-5 w-3/4 animate-pulse rounded bg-white/5" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-white/5" />
            <div className="flex gap-4 pt-2">
              <div className="h-12 flex-1 animate-pulse rounded-lg bg-white/5" />
              <div className="h-12 flex-1 animate-pulse rounded-lg bg-white/5" />
            </div>
            <div className="h-10 w-full animate-pulse rounded-lg bg-white/5" />
          </div>
        </div>
      ))}
    </div>
  );
}
