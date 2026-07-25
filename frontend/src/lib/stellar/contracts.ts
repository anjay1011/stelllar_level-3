// ============================================================
// Contracts — On-chain integration via transactions.ts pipeline
// ============================================================
//
// Every read uses readContractCall().
// Every write uses executeContractCall().
// No mock data. No manual transaction building.
//
// On-chain Tournament struct (Rust):
//   { id: u32, name: String, organizer: Address, treasury_id: Address,
//     entry_fee: i128, max_players: u32, status: TournamentStatus,
//     winner: Option<Address>, prize_pool: i128 }
//
// On-chain TournamentStatus (Rust enum):
//   Draft=0, RegistrationOpen=1, RegistrationClosed=2, Ongoing=3,
//   Completed=4, PrizeReleased=5, Cancelled=6
// ============================================================

import {
  sorobanServer,
  TOURNAMENT_CONTRACT_ID,
  TREASURY_CONTRACT_ID,
} from "./client";
import {
  readContractCall,
  executeContractCall,
} from "./transactions";
import {
  type Tournament,
  type Player,
  type Activity,
  type TournamentStatus,
} from "@/lib/mock-data";

// ─── Status mapping (frontend string ↔ on-chain numeric) ────────────────────

const STATUS_TO_NUM: Record<TournamentStatus, number> = {
  draft: 0,
  registration_open: 1,
  registration_closed: 2,
  ongoing: 3,
  completed: 4,
  prize_released: 5,
  cancelled: 6,
};

const NUM_TO_STATUS: Record<number, TournamentStatus> = {
  0: "draft",
  1: "registration_open",
  2: "registration_closed",
  3: "ongoing",
  4: "completed",
  5: "prize_released",
  6: "cancelled",
};

/** Convert on-chain numeric status to frontend string status. */
export function statusNumToEnum(num: number): TournamentStatus {
  return NUM_TO_STATUS[num] ?? "draft";
}

// ─── On-chain type (matches Rust Tournament struct exactly) ─────────────────

interface OnChainTournament {
  id: number;
  name: string;
  organizer: string;
  treasury_id: string;
  entry_fee: number;
  max_players: number;
  status: { tag: string } | number;
  winner: string | null | undefined;
  prize_pool: number;
}

// ─── Mapping helpers ────────────────────────────────────────────────────────

/** Map a single on-chain tournament to the frontend Tournament model. */
function mapOnChainTournament(
  t: OnChainTournament,
  players: Player[]
): Tournament {
  const statusNum =
    typeof t.status === "number"
      ? t.status
      : typeof t.status === "object" && t.status !== null
        ? STATUS_TO_NUM[t.status.tag as TournamentStatus] ?? 0
        : 0;

  const winnerAddr = t.winner ?? undefined;

  return {
    id: `t-${t.id}`,
    name: t.name,
    description: `On-chain tournament #${t.id} — ${t.name}`,
    organizer: `Organizer ${t.organizer.slice(0, 8)}…`,
    organizerAddress: t.organizer,
    entryFee: Number(t.entry_fee),
    prizePool: Number(t.prize_pool),
    maxPlayers: Number(t.max_players),
    registeredPlayers: players,
    status: statusNumToEnum(statusNum),
    winner: winnerAddr
      ? {
          address: winnerAddr,
          name: `Player ${winnerAddr.slice(0, 8)}…`,
          avatar: "♚",
        }
      : undefined,
    createdAt: new Date().toISOString(),
    startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

/** Derive a numeric tournament ID from a frontend string ID like "t-1". */
function parseTournamentId(id: string): number {
  const num = parseInt(id.replace(/^t-/, ""), 10);
  if (isNaN(num) || num < 1) return -1;
  return num;
}

// ─── Read functions ─────────────────────────────────────────────────────────

/**
 * Fetch every tournament from chain.
 * Uses get_tournament_count() then iterates 1..count calling get_tournament().
 * Fetches registered player addresses from the tournament contract.
 * Falls back gracefully for missing/unreadable tournaments.
 */
export async function getAllTournaments(): Promise<Tournament[]> {
  // Step 1: Get total tournament count
  const countResult = await readContractCall<number>(
    (client) =>
      (client).get_tournament_count({})
  );

  if (!countResult.ok) return [];

  const count = countResult.value;
  if (count <= 0) return [];

  // Step 2: Fetch each tournament + its players in parallel
  const fetches: Promise<Tournament | null>[] = [];

  for (let i = 1; i <= count; i++) {
    fetches.push(fetchSingleTournament(i));
  }

  const results = await Promise.allSettled(fetches);

  return results
    .filter(
      (r): r is PromiseFulfilledResult<Tournament> =>
        r.status === "fulfilled" && r.value !== null
    )
    .map((r) => r.value);
}

/**
 * Fetch a single tournament by its frontend string ID ("t-1", "t-2", etc.).
 * Returns undefined if not found or on error.
 */
export async function getTournamentById(
  id: string
): Promise<Tournament | undefined> {
  const numId = parseTournamentId(id);
  if (numId < 0) return undefined;

  const result = await fetchSingleTournament(numId);
  return result ?? undefined;
}

/** Internal: fetch one tournament + its players from chain. */
async function fetchSingleTournament(id: number): Promise<Tournament | null> {
  // Fetch tournament data
  const tResult = await readContractCall<OnChainTournament>(
    (client) =>
      (client).get_tournament({ tournament_id: id })
  );

  if (!tResult.ok) return null;

  const onChain = tResult.value;

  // Fetch registered player addresses
  const playersResult = await readContractCall<string[]>(
    (client) =>
      (client).get_players({ tournament_id: id })
  );

  const addresses: string[] = playersResult.ok
    ? playersResult.value
    : [];

  // Map addresses to Player objects (name/avatar are off-chain, use placeholders)
  const players: Player[] = addresses.map((addr) => ({
    address: addr,
    name: `${addr.slice(0, 6)}…${addr.slice(-3)}`,
    avatar: "♟",
  }));

  return mapOnChainTournament(onChain, players);
}

// ─── Write functions ────────────────────────────────────────────────────────

/**
 * Create a new tournament on-chain.
 * Calls create_tournament() on the tournament contract.
 * The description field is UI-only and not stored on-chain.
 */
export async function createTournamentContract(
  name: string,
  _description: string,
  entryFee: number,
  maxPlayers: number,
  organizerAddress: string
): Promise<{ success: boolean; tournamentId?: string }> {
  const result = await executeContractCall<number>(
    (client, pk) =>
      (client).create_tournament({
        organizer: pk,
        name: name,
        entry_fee: BigInt(Math.round(entryFee)),
        max_players: maxPlayers,
        treasury_id: TREASURY_CONTRACT_ID,
      }),
    { publicKey: organizerAddress }
  );

  if (result.ok) {
    const id = result.value;
    return { success: true, tournamentId: `t-${id}` };
  }

  throw new Error(result.error.message);
}

/**
 * Register a player for a tournament and pay the entry fee via Treasury.
 * Calls register_player() which triggers inter-contract deposit.
 */
export async function registerPlayerContract(
  tournamentId: string,
  playerAddress: string
): Promise<boolean> {
  const numId = parseTournamentId(tournamentId);
  if (numId < 0) throw new Error(`Invalid tournament ID: ${tournamentId}`);

  const result = await executeContractCall<unknown>(
    (client, pk) =>
      (client).register_player({
        tournament_id: numId,
        player: pk,
      }),
    { publicKey: playerAddress }
  );

  if (!result.ok) throw new Error(result.error.message);
  return true;
}

/**
 * Transition a tournament's status on-chain.
 * Maps frontend TournamentStatus strings to the correct contract method.
 *
 * Status transitions:
 *   draft → registration_open    (open_registration)
 *   registration_open → registration_closed (close_registration)
 *   registration_closed → ongoing (start_tournament)
 *   ongoing → completed          (declare_winner — requires winnerAddress)
 *   completed → prize_released   (release_prize)
 *   any non-terminal → cancelled (cancel_tournament)
 */
export async function updateTournamentStatusContract(
  tournamentId: string,
  newStatus: TournamentStatus,
  organizerAddress: string,
  winnerName?: string
): Promise<boolean> {
  const numId = parseTournamentId(tournamentId);
  if (numId < 0) throw new Error(`Invalid tournament ID: ${tournamentId}`);

  switch (newStatus) {
    case "registration_open":
      return callStatusMethod(
        "open_registration",
        numId,
        organizerAddress
      );

    case "registration_closed":
      return callStatusMethod(
        "close_registration",
        numId,
        organizerAddress
      );

    case "ongoing":
      return callStatusMethod(
        "start_tournament",
        numId,
        organizerAddress
      );

    case "completed": {
      // Winner address must be resolved from the tournament's registered players.
      // The manage page passes a player name from a dropdown; we resolve it to
      // an on-chain address by fetching the tournament.
      if (!winnerName) throw new Error("Winner address is required");

      const t = await getTournamentById(tournamentId);
      if (!t) throw new Error("Tournament not found");

      const winnerPlayer = t.registeredPlayers.find(
        (p) =>
          p.name === winnerName ||
          p.address === winnerName ||
          p.name.toLowerCase() === winnerName.toLowerCase()
      );

      if (!winnerPlayer) {
        throw new Error(
          `Could not resolve winner "${winnerName}" to a registered player address`
        );
      }

      const result = await executeContractCall<unknown>(
        (client, pk) =>
          (client).declare_winner({
            tournament_id: numId,
            organizer: pk,
            winner: winnerPlayer.address,
          }),
        { publicKey: organizerAddress }
      );

      if (!result.ok) throw new Error(result.error.message);
      return true;
    }

    case "prize_released":
      return callStatusMethod(
        "release_prize",
        numId,
        organizerAddress
      );

    case "cancelled":
      return callStatusMethod(
        "cancel_tournament",
        numId,
        organizerAddress
      );

    default:
      throw new Error(`Unknown status: ${newStatus}`);
  }
}

/** Helper: call a simple status-transition method (no extra params). */
async function callStatusMethod(
  method: string,
  tournamentId: number,
  organizerAddress: string
): Promise<boolean> {
  const result = await executeContractCall<unknown>(
    (client, pk) =>
      (client)[method]({
        tournament_id: tournamentId,
        organizer: pk,
      }),
    { publicKey: organizerAddress }
  );

  if (!result.ok) throw new Error(result.error.message);
  return true;
}

// ─── Activity feed ──────────────────────────────────────────────────────────

/**
 * Fetch recent contract events from Soroban RPC and map to Activity objects.
 * Uses the tournament contract's events (created, reg_plyr, started, winner,
 * payout, reg_close, cancelled).
 *
 * Falls back to an empty array if RPC events are unavailable.
 */
export async function getContractActivityFeed(): Promise<Activity[]> {
  try {
    const latestLedgerRes = await sorobanServer.getLatestLedger();
    const startLedger = Math.max(1, latestLedgerRes.sequence - 5000);

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

    if (!eventResponse?.events) return [];

    const activities: Activity[] = [];

    for (const evt of eventResponse.events) {
      const topicSymbol = evt.topic?.[0]?.toString() ?? "";
      const tournamentIdNum = evt.topic?.[1]?.toString() ?? "0";
      const tournamentId = `t-${tournamentIdNum}`;
      const type = mapTopicToActivityType(topicSymbol);

      if (!type) continue;

      const activity: Activity = {
        id: evt.id || `evt-${activities.length}`,
        type,
        tournamentName: `Tournament #${tournamentIdNum}`,
        tournamentId,
        timestamp: new Date().toISOString(),
      };

      // Extract player address from event value for player-related events
      if (
        type === "player_registered" ||
        type === "winner_declared" ||
        type === "prize_released"
      ) {
        const val = evt.value;
        if (val) {
          const addr = extractAddressFromValue(val);
          if (addr) {
            activity.playerName = `${addr.slice(0, 6)}…${addr.slice(-3)}`;
          }
        }
      }

      // Extract amount for prize-related events
      if (type === "prize_released") {
        const val = evt.value;
        if (val) {
          const amount = extractAmountFromValue(val);
          if (amount !== null) activity.amount = Number(amount);
        }
      }

      activities.push(activity);
    }

    return activities;
  } catch (err) {
    console.warn("Unable to fetch live contract events:", err);
    return [];
  }
}

// ─── Event parsing helpers ──────────────────────────────────────────────────

function mapTopicToActivityType(
  topic: string
): Activity["type"] | null {
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
      return null;
  }
}

/**
 * Attempt to extract an address string from a Soroban event value.
 * Event values are ScVal XDR objects; common patterns for address:
 * - { _switch: { name: "Address" }, _value: { address: "G..." } }
 * - A string directly
 */
function extractAddressFromValue(val: unknown): string | null {
  if (typeof val === "string" && val.startsWith("G")) return val;

  if (typeof val === "object" && val !== null) {
    const obj = val as Record<string, unknown>;

    // Try nested address field
    if (typeof obj.address === "string" && obj.address.startsWith("G")) {
      return obj.address;
    }

    // Try _value.address pattern
    if (
      typeof obj._value === "object" &&
      obj._value !== null &&
      typeof (obj._value as Record<string, unknown>).address === "string"
    ) {
      return (obj._value as Record<string, unknown>).address as string;
    }
  }

  return null;
}

/**
 * Attempt to extract a numeric amount from a Soroban event value.
 * For payout events, the value is typically a tuple (address, amount).
 */
function extractAmountFromValue(val: unknown): number | null {
  if (typeof val === "number") return val;
  if (typeof val === "bigint") return Number(val);

  if (typeof val === "object" && val !== null) {
    const obj = val as Record<string, unknown>;

    // Try tuple pattern: { _value: [address, amount] }
    if (Array.isArray(obj._value) && obj._value.length >= 2) {
      const amount = obj._value[1];
      if (typeof amount === "number") return amount;
      if (typeof amount === "bigint") return Number(amount);
    }

    // Try amount field directly
    if (typeof obj.amount === "number") return obj.amount;
    if (typeof obj.amount === "bigint") return Number(obj.amount);
  }

  return null;
}
