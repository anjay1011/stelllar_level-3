// Application-wide constants

export const APP_NAME = "ChainMate";
export const APP_DESCRIPTION =
  "Decentralized Chess Tournament Platform powered by Stellar Soroban";
export const APP_TAGLINE = "Where Chess Meets the Blockchain";

export const STELLAR_NETWORK: string = "TESTNET";
export const SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org";

export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/tournaments", label: "Tournaments" },
  { href: "/dashboard", label: "Dashboard" },
] as const;

export const CHESS_PIECES = {
  king: "♚",
  queen: "♛",
  rook: "♜",
  bishop: "♝",
  knight: "♞",
  pawn: "♟",
} as const;
