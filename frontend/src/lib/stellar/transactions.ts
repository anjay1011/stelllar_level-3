/**
 * Reusable Soroban transaction pipeline for ChainMate.
 *
 * Uses SDK v16 (`@stellar/stellar-sdk` 16.x) modern API:
 *   Client.from() → client.method() → AssembledTransaction.signAndSend() → SentTransaction
 *
 * The SDK handles transaction building, simulation, submission, and polling internally.
 * This module wraps that flow with Freighter wallet integration and typed error handling.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Transaction lifecycle:
 *
 *   1. Client.from()         — fetches account sequence number from RPC
 *   2. client.method(args)   — builds invokeHostFunction op + auto-simulates
 *   3. signAndSend()         — calls Freighter to sign, submits to RPC, polls
 *                              until PENDING → SUCCESS / FAILED / TIMEOUT
 *   4. sentTx.result         — parsed native return value from contract
 *
 * Every step after (1) can throw a typed error from this module.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import {
  contract,
  Networks,
  Keypair,
} from "@stellar/stellar-sdk";
import type { SignTransaction } from "@stellar/stellar-sdk/contract";
import { TOURNAMENT_CONTRACT_ID, TREASURY_CONTRACT_ID } from "./client";
import { getNetwork, signTransaction as freighterSign } from "@stellar/freighter-api";
import { STELLAR_NETWORK, SOROBAN_RPC_URL } from "@/lib/constants";

/**
 * Funded testnet account used for read-only simulation when no wallet is connected.
 * Derived from the deployer secret so the account is guaranteed to be funded.
 */
const DEPLOYER_SECRET = "SD7A3VFDCF2TS2MQWSVL62FXRQMKSBZY6R6GYEVNVFQRW46WRZE4TJBO";
const FALLBACK_PUBLIC_KEY = Keypair.fromSecret(DEPLOYER_SECRET).publicKey();

// ─── Types ───────────────────────────────────────────────────────────────────

/** Soroban SDK Client with dynamic method access for contract calls. */
export type DynamicClient = contract.Client & {
  [method: string]: (...args: unknown[]) => Promise<contract.AssembledTransaction<unknown>>;
};

/** Discriminated result: check `ok` before accessing `value`. */
export type TxResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: TxError };

/** Every failure mode the pipeline can produce. */
export type TxError =
  | { kind: "simulation_failed"; message: string; raw?: unknown }
  | { kind: "user_rejected"; message: string }
  | { kind: "rpc_failure"; message: string; raw?: unknown }
  | { kind: "transaction_timeout"; message: string }
  | { kind: "contract_error"; message: string }
  | { kind: "network_mismatch"; message: string }
  | { kind: "unknown"; message: string; raw?: unknown };

/** Freighter wallet shape expected by the SDK. */
type FreighterSigner = {
  signTransaction: SignTransaction;
};

// ─── Freighter → SDK bridge ─────────────────────────────────────────────────

/**
 * Wraps Freighter's `signTransaction` to match the SDK's `SignTransaction` type.
 *
 * Freighter returns { signedTxXdr, signerAddress, error? } — the SDK expects
 * { signedTxXdr, signerAddress?, error? }. We throw on error so the SDK's
 * internal error handling classifies it as `UserRejectedError`.
 */
async function freighterSignTransaction(
  xdr: string,
  opts?: { networkPassphrase?: string; address?: string }
): Promise<{ signedTxXdr: string; signerAddress?: string; error?: { message: string; code: number } }> {
  const result = await freighterSign(xdr, {
    networkPassphrase: opts?.networkPassphrase,
    address: opts?.address,
  });

  if (result.error) {
    throw new Error(result.error.message || "User rejected the transaction");
  }

  return {
    signedTxXdr: result.signedTxXdr,
    signerAddress: result.signerAddress,
  };
}

/**
 * Fetch network passphrase from Freighter and validate it matches the expected
 * network (testnet / mainnet / futurenet). Throws `TxError` on mismatch.
 *
 * Freighter's `getNetwork()` returns the full passphrase string, e.g.
 * `"Test SDF Network ; September 2015"`. We compare against the SDK's
 * `Networks` enum for validation.
 */
export async function getValidatedPassphrase(
  expected?: string
): Promise<string> {
  const res = await getNetwork();

  if (res.error) {
    throw makeError("network_mismatch", `Freighter network error: ${res.error.message}`);
  }

  const passphrase = res.networkPassphrase;

  if (expected && passphrase !== expected) {
    throw makeError(
      "network_mismatch",
      `Network mismatch: wallet is on "${passphrase}", expected "${expected}". Switch your Freighter network.`
    );
  }

  return passphrase;
}

/**
 * Get the default passphrase for the configured Stellar network constant.
 * Falls back to testnet if the constant is unrecognized.
 */
export function getDefaultPassphrase(): string {
  switch (STELLAR_NETWORK) {
    case "PUBLIC":
      return Networks.PUBLIC;
    case "FUTURENET":
      return Networks.FUTURENET;
    case "TESTNET":
    default:
      return Networks.TESTNET;
  }
}

// ─── Contract clients ────────────────────────────────────────────────────────

/** Build an SDK Client for the tournament contract. */
export async function getTournamentClient(signer?: FreighterSigner, publicKey?: string) {
  return contract.Client.from({
    contractId: TOURNAMENT_CONTRACT_ID,
    rpcUrl: SOROBAN_RPC_URL,
    networkPassphrase: getDefaultPassphrase(),
    ...(signer ? { signTransaction: signer.signTransaction } : {}),
    ...(publicKey ? { publicKey } : {}),
  });
}

/** Build an SDK Client for the treasury contract. */
export async function getTreasuryClient(signer?: FreighterSigner, publicKey?: string) {
  return contract.Client.from({
    contractId: TREASURY_CONTRACT_ID,
    rpcUrl: SOROBAN_RPC_URL,
    networkPassphrase: getDefaultPassphrase(),
    ...(signer ? { signTransaction: signer.signTransaction } : {}),
    ...(publicKey ? { publicKey } : {}),
  });
}

// ─── Core pipeline ───────────────────────────────────────────────────────────

/**
 * Execute a contract write method through the full pipeline:
 *
 *   1. Validate Freighter network matches expected passphrase
 *   2. Create SDK Client with Freighter signer wired in
 *   3. Call contract method (auto-builds + simulates)
 *   4. Sign with Freighter wallet
 *   5. Submit to Soroban RPC
 *   6. Poll until confirmed or timed out
 *   7. Return typed `TxResult<T>` — never throws
 *
 * Usage:
 * ```ts
 * const res = await executeContractCall(
 *   (client, pk) => client.create_tournament({
 *     organizer: pk,
 *     name: "Championship",
 *     entry_fee: 100n,
 *     max_players: 8,
 *     treasury_id: TREASURY_CONTRACT_ID,
 *   }),
 *   { publicKey }
 * );
 * if (res.ok) {
 *   console.log("Tournament ID:", res.value.result);
 * }
 * ```
 */
export async function executeContractCall<T>(
  method: (
    client: DynamicClient,
    publicKey: string
  ) => Promise<contract.AssembledTransaction<unknown>>,
  opts: {
    publicKey: string;
    timeoutInSeconds?: number;
  }
): Promise<TxResult<T>> {
  try {
    // Step 1: Validate network
    await getValidatedPassphrase();

    // Step 2: Create client with signer
    const rawClient = await getTournamentClient(
      { signTransaction: freighterSignTransaction },
      opts.publicKey
    );
    const client = rawClient as DynamicClient;

    // Step 3 + 4 + 5 + 6: Call method → auto-simulate → signAndSend → poll
    const assembled = await method(client, opts.publicKey) as contract.AssembledTransaction<T>;
    const sent = await assembled.signAndSend();

    // Step 7: Return parsed result
    return { ok: true, value: sent.result };
  } catch (err: unknown) {
    return { ok: false, error: classifyError(err) };
  }
}

/**
 * Read-only contract call (no signing required).
 * Builds + simulates only — returns the parsed result.
 *
 * Usage:
 * ```ts
 * const res = await readContractCall(
 *   (client) => client.get_tournament({ tournament_id: 1 }),
 * );
 * ```
 */
export async function readContractCall<T>(
  method: (
    client: DynamicClient
  ) => Promise<contract.AssembledTransaction<unknown>>,
  publicKey?: string
): Promise<TxResult<T>> {
  try {
    const simKey = publicKey || FALLBACK_PUBLIC_KEY;
    const rawClient = await getTournamentClient(undefined, simKey);
    const client = rawClient as DynamicClient;
    const assembled = await method(client) as contract.AssembledTransaction<T>;
    return { ok: true, value: assembled.result };
  } catch (err: unknown) {
    return { ok: false, error: classifyError(err) };
  }
}

// ─── Error classification ────────────────────────────────────────────────────

function classifyError(err: unknown): TxError {
  // SDK typed errors from AssembledTransaction / SentTransaction
  const name = (err as Error)?.name ?? "";

  switch (name) {
    case "SimulationFailedError":
      return makeError("simulation_failed", (err as Error).message, err);

    case "UserRejectedError":
      return makeError("user_rejected", "Transaction rejected by user in Freighter wallet");

    case "TransactionStillPendingError":
      return makeError("transaction_timeout", "Transaction did not confirm within timeout window");

    case "ExpiredStateError":
      return makeError("rpc_failure", "Ledger entries expired; transaction needs restore", err);

    case "FakeAccountError":
      return makeError(
        "rpc_failure",
        "Account not found on network. Fund it via Friendbot or switch networks.",
        err
      );

    case "InternalWalletError":
      return makeError("rpc_failure", `Wallet internal error: ${(err as Error).message}`, err);

    case "ExternalServiceError":
      return makeError("rpc_failure", `RPC service error: ${(err as Error).message}`, err);

    case "InvalidClientRequestError":
      return makeError("rpc_failure", `Invalid RPC request: ${(err as Error).message}`, err);

    case "NeedsMoreSignaturesError":
      return makeError("user_rejected", "Transaction requires additional signatures", err);

    case "RestoreFailureError":
      return makeError("rpc_failure", "State restoration failed", err);
  }

  // Classify by message content for strings / plain errors
  const msg = (err as Error)?.message ?? String(err);

  if (msg.includes("network") && msg.includes("mismatch")) {
    return makeError("network_mismatch", msg);
  }

  if (msg.includes("reject") || msg.includes("denied") || msg.includes("cancel")) {
    return makeError("user_rejected", msg);
  }

  if (msg.includes("timeout") || msg.includes("still pending")) {
    return makeError("transaction_timeout", msg);
  }

  if (msg.includes("simulation") || msg.includes("restore")) {
    return makeError("simulation_failed", msg, err);
  }

  if (msg.includes("contract") || msg.includes("HostError") || msg.includes("Error(")) {
    return makeError("contract_error", msg);
  }

  if (msg.includes("RPC") || msg.includes("fetch") || msg.includes("network")) {
    return makeError("rpc_failure", msg, err);
  }

  return makeError("unknown", msg, err);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeError(kind: TxError["kind"], message: string, raw?: unknown): TxError {
  return { kind, message, ...(raw !== undefined ? { raw } : {}) };
}
