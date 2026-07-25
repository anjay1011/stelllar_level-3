// ============================================================
// Mock Data — Phase 1 (UI Only, No Blockchain)
// ============================================================

export type TournamentStatus =
  | "draft"
  | "registration_open"
  | "registration_closed"
  | "ongoing"
  | "completed"
  | "prize_released"
  | "cancelled";

export interface Tournament {
  id: string;
  name: string;
  description: string;
  organizer: string;
  organizerAddress: string;
  entryFee: number;
  prizePool: number;
  maxPlayers: number;
  registeredPlayers: Player[];
  status: TournamentStatus;
  winner?: Player;
  createdAt: string;
  startsAt: string;
  bracket?: BracketMatch[];
}

export interface Player {
  address: string;
  name: string;
  avatar: string;
  rating?: number;
  joinedAt?: string;
}

export interface BracketMatch {
  id: string;
  round: number;
  position: number;
  player1?: Player;
  player2?: Player;
  winner?: Player;
  status: "pending" | "ongoing" | "completed";
}

export interface Activity {
  id: string;
  type:
    | "tournament_created"
    | "player_registered"
    | "tournament_started"
    | "winner_declared"
    | "prize_released"
    | "registration_closed";
  tournamentName: string;
  tournamentId: string;
  playerName?: string;
  timestamp: string;
  amount?: number;
}

// --- Players ---
export const mockPlayers: Player[] = [
  {
    address: "GBXH...K4MZ",
    name: "Magnus",
    avatar: "♚",
    rating: 2850,
    joinedAt: "2026-07-15T10:30:00Z",
  },
  {
    address: "GCQT...R7NP",
    name: "Hikaru",
    avatar: "♞",
    rating: 2790,
    joinedAt: "2026-07-15T11:00:00Z",
  },
  {
    address: "GDLW...M2XE",
    name: "Fabiano",
    avatar: "♝",
    rating: 2780,
    joinedAt: "2026-07-15T12:15:00Z",
  },
  {
    address: "GABC...D9QW",
    name: "Ding",
    avatar: "♜",
    rating: 2810,
    joinedAt: "2026-07-16T09:00:00Z",
  },
  {
    address: "GDEF...H3KL",
    name: "Alireza",
    avatar: "♛",
    rating: 2760,
    joinedAt: "2026-07-16T14:30:00Z",
  },
  {
    address: "GHIJ...P5RS",
    name: "Ian",
    avatar: "♚",
    rating: 2750,
    joinedAt: "2026-07-17T08:45:00Z",
  },
  {
    address: "GKLM...T7UV",
    name: "Anish",
    avatar: "♞",
    rating: 2740,
    joinedAt: "2026-07-17T16:20:00Z",
  },
  {
    address: "GNOP...X9YZ",
    name: "Wesley",
    avatar: "♝",
    rating: 2770,
    joinedAt: "2026-07-18T10:00:00Z",
  },
];

// --- Helper to generate bracket from players ---
function generateBracket(
  players: Player[],
  completed: boolean
): BracketMatch[] {
  const matches: BracketMatch[] = [];

  // Round 1 — Quarter finals (4 matches)
  for (let i = 0; i < 4; i++) {
    matches.push({
      id: `r1-m${i}`,
      round: 1,
      position: i,
      player1: players[i * 2] || undefined,
      player2: players[i * 2 + 1] || undefined,
      winner: completed ? players[i * 2] : undefined,
      status: completed ? "completed" : i < 2 ? "completed" : "pending",
    });
  }

  // Round 2 — Semi finals (2 matches)
  for (let i = 0; i < 2; i++) {
    matches.push({
      id: `r2-m${i}`,
      round: 2,
      position: i,
      player1: completed ? players[i * 4] : i === 0 ? players[0] : undefined,
      player2: completed
        ? players[i * 4 + 2]
        : i === 0
          ? players[2]
          : undefined,
      winner: completed ? players[i * 4] : undefined,
      status: completed ? "completed" : i === 0 ? "ongoing" : "pending",
    });
  }

  // Round 3 — Final (1 match)
  matches.push({
    id: "r3-m0",
    round: 3,
    position: 0,
    player1: completed ? players[0] : undefined,
    player2: completed ? players[4] : undefined,
    winner: completed ? players[0] : undefined,
    status: completed ? "completed" : "pending",
  });

  return matches;
}

// --- Tournaments ---
export const mockTournaments: Tournament[] = [
  {
    id: "t-001",
    name: "Stellar Grand Prix 2026",
    description:
      "The premier decentralized chess tournament on the Stellar network. Compete against the best players for a massive prize pool. All games played on Lichess with results verified on-chain.",
    organizer: "ChainMate Official",
    organizerAddress: "GBXH...K4MZ",
    entryFee: 100,
    prizePool: 800,
    maxPlayers: 8,
    registeredPlayers: mockPlayers,
    status: "ongoing",
    createdAt: "2026-07-10T08:00:00Z",
    startsAt: "2026-07-20T18:00:00Z",
    bracket: generateBracket(mockPlayers, false),
  },
  {
    id: "t-002",
    name: "Cosmic Blitz Championship",
    description:
      "A fast-paced blitz tournament with 3+0 time control. Quick games, quick payouts. Entry is open to all skill levels.",
    organizer: "StarBlitz DAO",
    organizerAddress: "GCQT...R7NP",
    entryFee: 50,
    prizePool: 300,
    maxPlayers: 8,
    registeredPlayers: mockPlayers.slice(0, 6),
    status: "registration_open",
    createdAt: "2026-07-18T12:00:00Z",
    startsAt: "2026-07-28T20:00:00Z",
  },
  {
    id: "t-003",
    name: "Nebula Rapid Open",
    description:
      "15+10 rapid tournament with a community-driven format. Play your games on Chess.com and submit results for on-chain verification.",
    organizer: "Nebula Chess Club",
    organizerAddress: "GDLW...M2XE",
    entryFee: 75,
    prizePool: 600,
    maxPlayers: 8,
    registeredPlayers: mockPlayers,
    status: "completed",
    winner: mockPlayers[0],
    createdAt: "2026-07-05T10:00:00Z",
    startsAt: "2026-07-12T16:00:00Z",
    bracket: generateBracket(mockPlayers, true),
  },
  {
    id: "t-004",
    name: "Zero-G Bullet Arena",
    description:
      "1+0 bullet madness! The fastest fingers win. Entry fee is low, but the glory is priceless.",
    organizer: "SpeedChess Labs",
    organizerAddress: "GABC...D9QW",
    entryFee: 25,
    prizePool: 0,
    maxPlayers: 8,
    registeredPlayers: [],
    status: "draft",
    createdAt: "2026-07-22T14:00:00Z",
    startsAt: "2026-08-01T22:00:00Z",
  },
  {
    id: "t-005",
    name: "Quantum Classical Invitational",
    description:
      "A prestigious classical time control event. 90+30 games with arbiter oversight. Only for rated players above 2000.",
    organizer: "ChainMate Official",
    organizerAddress: "GBXH...K4MZ",
    entryFee: 200,
    prizePool: 1600,
    maxPlayers: 8,
    registeredPlayers: mockPlayers,
    status: "prize_released",
    winner: mockPlayers[3],
    createdAt: "2026-06-01T08:00:00Z",
    startsAt: "2026-06-15T14:00:00Z",
    bracket: generateBracket(mockPlayers, true),
  },
  {
    id: "t-006",
    name: "Supernova Showdown",
    description:
      "A community favorite returning for its 3rd season. Mixed time controls across rounds keep everyone on their toes.",
    organizer: "Nebula Chess Club",
    organizerAddress: "GDLW...M2XE",
    entryFee: 60,
    prizePool: 360,
    maxPlayers: 8,
    registeredPlayers: mockPlayers.slice(0, 4),
    status: "registration_open",
    createdAt: "2026-07-20T10:00:00Z",
    startsAt: "2026-08-05T18:00:00Z",
  },
  {
    id: "t-007",
    name: "Dark Matter Duel",
    description:
      "Head-to-head elimination. Lose once and you're out. The ultimate test of nerves and skill under pressure.",
    organizer: "StarBlitz DAO",
    organizerAddress: "GCQT...R7NP",
    entryFee: 150,
    prizePool: 1050,
    maxPlayers: 8,
    registeredPlayers: mockPlayers.slice(0, 7),
    status: "registration_closed",
    createdAt: "2026-07-14T09:00:00Z",
    startsAt: "2026-07-25T20:00:00Z",
  },
  {
    id: "t-008",
    name: "Photon Pairs Challenge",
    description:
      "A cancelled event due to scheduling conflicts. All entry fees have been refunded to participants.",
    organizer: "SpeedChess Labs",
    organizerAddress: "GABC...D9QW",
    entryFee: 40,
    prizePool: 0,
    maxPlayers: 8,
    registeredPlayers: mockPlayers.slice(0, 3),
    status: "cancelled",
    createdAt: "2026-07-01T08:00:00Z",
    startsAt: "2026-07-10T18:00:00Z",
  },
];

// --- Activity Feed ---
export const mockActivities: Activity[] = [
  {
    id: "a-001",
    type: "player_registered",
    tournamentName: "Cosmic Blitz Championship",
    tournamentId: "t-002",
    playerName: "Alireza",
    timestamp: "2026-07-23T12:30:00Z",
    amount: 50,
  },
  {
    id: "a-002",
    type: "tournament_created",
    tournamentName: "Zero-G Bullet Arena",
    tournamentId: "t-004",
    timestamp: "2026-07-22T14:00:00Z",
  },
  {
    id: "a-003",
    type: "winner_declared",
    tournamentName: "Nebula Rapid Open",
    tournamentId: "t-003",
    playerName: "Magnus",
    timestamp: "2026-07-20T22:00:00Z",
  },
  {
    id: "a-004",
    type: "prize_released",
    tournamentName: "Nebula Rapid Open",
    tournamentId: "t-003",
    playerName: "Magnus",
    timestamp: "2026-07-20T22:05:00Z",
    amount: 600,
  },
  {
    id: "a-005",
    type: "tournament_started",
    tournamentName: "Stellar Grand Prix 2026",
    tournamentId: "t-001",
    timestamp: "2026-07-20T18:00:00Z",
  },
  {
    id: "a-006",
    type: "registration_closed",
    tournamentName: "Dark Matter Duel",
    tournamentId: "t-007",
    timestamp: "2026-07-19T20:00:00Z",
  },
  {
    id: "a-007",
    type: "player_registered",
    tournamentName: "Supernova Showdown",
    tournamentId: "t-006",
    playerName: "Ding",
    timestamp: "2026-07-21T09:00:00Z",
    amount: 60,
  },
  {
    id: "a-008",
    type: "player_registered",
    tournamentName: "Cosmic Blitz Championship",
    tournamentId: "t-002",
    playerName: "Ian",
    timestamp: "2026-07-22T08:45:00Z",
    amount: 50,
  },
];

// --- Current "logged in" user for dashboard ---
export const mockCurrentUser: Player = {
  address: "GBXH...K4MZ",
  name: "Magnus",
  avatar: "♚",
  rating: 2850,
};

// --- Stats ---
export const mockStats = {
  totalTournaments: 24,
  totalPrizeDistributed: 15400,
  totalPlayers: 189,
  activeTournaments: 3,
};

// --- Helpers ---
export const statusConfig: Record<
  TournamentStatus,
  { label: string; color: string; bgColor: string }
> = {
  draft: {
    label: "Draft",
    color: "text-zinc-400",
    bgColor: "bg-zinc-400/10 border-zinc-400/20",
  },
  registration_open: {
    label: "Registration Open",
    color: "text-emerald-400",
    bgColor: "bg-emerald-400/10 border-emerald-400/20",
  },
  registration_closed: {
    label: "Registration Closed",
    color: "text-amber-400",
    bgColor: "bg-amber-400/10 border-amber-400/20",
  },
  ongoing: {
    label: "Ongoing",
    color: "text-sky-400",
    bgColor: "bg-sky-400/10 border-sky-400/20",
  },
  completed: {
    label: "Completed",
    color: "text-violet-400",
    bgColor: "bg-violet-400/10 border-violet-400/20",
  },
  prize_released: {
    label: "Prize Released",
    color: "text-amber-300",
    bgColor: "bg-amber-300/10 border-amber-300/20",
  },
  cancelled: {
    label: "Cancelled",
    color: "text-red-400",
    bgColor: "bg-red-400/10 border-red-400/20",
  },
};

export function formatXLM(amount: number): string {
  return `${amount.toLocaleString()} XLM`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
