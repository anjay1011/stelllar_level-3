"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { type Activity } from "@/lib/mock-data";
import { sorobanServer, TOURNAMENT_CONTRACT_ID } from "./client";

const POLL_INTERVAL_MS = 15_000;

function mapTopicToActivityType(topic: string): Activity["type"] {
  switch (topic) {
    case "created":
      return "tournament_created";
    case "reg_plyr":
      return "player_registered";
    case "started":
      return "tournament_started";
    case "winner":
      return "winner_declared";
    case "payout":
      return "prize_released";
    case "reg_close":
      return "registration_closed";
    default:
      return "tournament_created";
  }
}

function extractAddress(val: unknown): string | null {
  if (typeof val === "string" && val.startsWith("G")) return val;
  if (typeof val === "object" && val !== null) {
    const obj = val as Record<string, unknown>;
    if (typeof obj.address === "string" && obj.address.startsWith("G"))
      return obj.address;
    if (
      typeof obj._value === "object" &&
      obj._value !== null &&
      typeof (obj._value as Record<string, unknown>).address === "string"
    )
      return (obj._value as Record<string, unknown>).address as string;
  }
  return null;
}

/**
 * Polls Soroban RPC for live contract events at a fixed interval.
 * Returns the latest activities and a `lastUpdated` timestamp.
 */
export function useEventPolling(intervalMs = POLL_INTERVAL_MS) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isPolling, setIsPolling] = useState(true);
  const lastLedgerRef = useRef<number>(0);

  const fetchEvents = useCallback(async () => {
    try {
      const latestLedgerRes = await sorobanServer.getLatestLedger();
      const currentLedger = latestLedgerRes.sequence;

      if (currentLedger === lastLedgerRef.current) return;
      const startLedger = Math.max(1, lastLedgerRef.current || currentLedger - 500);

      const eventResponse = await sorobanServer.getEvents({
        startLedger,
        filters: [
          {
            type: "contract",
            contractIds: [TOURNAMENT_CONTRACT_ID],
          },
        ],
        limit: 50,
      });

      lastLedgerRef.current = currentLedger;

      if (!eventResponse?.events?.length) return;

      const newActivities: Activity[] = eventResponse.events.map(
        (evt, idx) => {
          const topicSymbol = evt.topic?.[0]?.toString() ?? "event";
          const tournamentIdNum = evt.topic?.[1]?.toString() ?? "0";
          const type = mapTopicToActivityType(topicSymbol);

          const activity: Activity = {
            id: evt.id || `evt-${Date.now()}-${idx}`,
            type,
            tournamentName: `Tournament #${tournamentIdNum}`,
            tournamentId: `t-${tournamentIdNum}`,
            timestamp: new Date().toISOString(),
          };

          if (
            type === "player_registered" ||
            type === "winner_declared" ||
            type === "prize_released"
          ) {
            const addr = extractAddress(evt.value);
            if (addr) {
              activity.playerName = `${addr.slice(0, 6)}…${addr.slice(-3)}`;
            }
          }

          return activity;
        }
      );

      setActivities((prev) => {
        const existingIds = new Set(prev.map((a) => a.id));
        const unique = newActivities.filter((a) => !existingIds.has(a.id));
        if (unique.length === 0) return prev;
        return [...unique, ...prev].slice(0, 50);
      });

      setLastUpdated(new Date());
    } catch (err) {
      console.warn("Event polling error:", err);
    }
  }, []);

  useEffect(() => {
    if (!isPolling) return;

    fetchEvents();
    const id = setInterval(fetchEvents, intervalMs);
    return () => clearInterval(id);
  }, [fetchEvents, intervalMs, isPolling]);

  const togglePolling = useCallback(() => setIsPolling((p) => !p), []);

  return { activities, lastUpdated, isPolling, togglePolling, refetch: fetchEvents };
}
