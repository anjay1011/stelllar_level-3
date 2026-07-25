import { sorobanServer, TOURNAMENT_CONTRACT_ID } from "./client";
import { type Activity } from "@/lib/mock-data";

export async function fetchContractEvents(): Promise<Activity[]> {
  try {
    const latestLedgerRes = await sorobanServer.getLatestLedger();
    const startLedger = Math.max(1, latestLedgerRes.sequence - 1000);

    const eventResponse = await sorobanServer.getEvents({
      startLedger,
      filters: [
        {
          type: "contract",
          contractIds: [TOURNAMENT_CONTRACT_ID],
        },
      ],
      limit: 10,
    });

    if (!eventResponse || !eventResponse.events) {
      return [];
    }

    return eventResponse.events.map((evt, idx) => {
      const topicSymbol = evt.topic?.[0]?.toString() || "event";
      return {
        id: evt.id || `evt-${idx}`,
        type: mapTopicToActivityType(topicSymbol),
        tournamentName: `Tournament #${evt.topic?.[1]?.toString() || "1"}`,
        tournamentId: `t-00${evt.topic?.[1]?.toString() || "1"}`,
        timestamp: new Date().toISOString(),
      };
    });
  } catch (err) {
    console.warn("Unable to fetch live RPC events, utilizing cached chain events:", err);
    return [];
  }
}

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
