import { statusConfig, type TournamentStatus } from "@/lib/mock-data";

interface StatusBadgeProps {
  status: TournamentStatus;
  size?: "sm" | "md";
}

export default function StatusBadge({ status, size = "sm" }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${config.bgColor} ${config.color} ${
        size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          status === "ongoing" || status === "registration_open"
            ? "animate-pulse"
            : ""
        }`}
        style={{
          backgroundColor: "currentColor",
        }}
      />
      {config.label}
    </span>
  );
}
