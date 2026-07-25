import Link from "next/link";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
  };
}

export default function EmptyState({
  icon = "♟",
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 text-5xl opacity-30">{icon}</div>
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-zinc-500">{description}</p>
      {action && (
        <Link
          href={action.href}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2.5 text-sm font-semibold text-zinc-950 shadow-lg shadow-amber-500/25 transition-all hover:shadow-amber-500/40 hover:brightness-110"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
