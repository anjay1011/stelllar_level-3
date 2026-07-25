import { rpc } from "@stellar/stellar-sdk";
import { SOROBAN_RPC_URL } from "@/lib/constants";

export const sorobanServer = new rpc.Server(SOROBAN_RPC_URL, {
  allowHttp: SOROBAN_RPC_URL.startsWith("http://"),
});

export const TOURNAMENT_CONTRACT_ID =
  process.env.NEXT_PUBLIC_TOURNAMENT_CONTRACT_ID ||
  "CCW67TSB5VO36QZ4G64SBNQXJNY5W7F3B5PY55K2L5W4R3J2C1D0E";

export const TREASURY_CONTRACT_ID =
  process.env.NEXT_PUBLIC_TREASURY_CONTRACT_ID ||
  "CDX98UTB6WP4RRZ5H75TCOQYKKY6X8G4C6QZ66L3M6X5S4K3D2E1F";
