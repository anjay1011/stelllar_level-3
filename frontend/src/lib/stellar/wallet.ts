import {
  isConnected,
  requestAccess,
  getNetwork,
  signTransaction,
} from "@stellar/freighter-api";
import { STELLAR_NETWORK } from "@/lib/constants";

export interface WalletState {
  isConnected: boolean;
  publicKey: string | null;
  network: string | null;
  isFreighterInstalled: boolean;
}

/**
 * Check if Freighter browser extension is installed using the official API.
 * Uses isConnected() which communicates with the extension directly,
 * rather than relying on window.freighter injection.
 */
export async function checkFreighterInstalled(): Promise<boolean> {
  try {
    const result = await isConnected();
    return result.isConnected;
  } catch {
    return false;
  }
}

/**
 * Connect user wallet and retrieve active Stellar public key.
 *
 * Uses requestAccess() which combines authorization and address retrieval
 * in a single call. If the site is already authorized, returns the address
 * immediately without a popup. If not authorized, prompts the user to
 * approve the site in Freighter.
 */
export async function connectFreighter(): Promise<{
  publicKey: string;
  network: string;
}> {
  let connected;
  try {
    connected = await isConnected();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Could not communicate with Freighter: ${msg}. Make sure the Freighter extension is installed and enabled.`
    );
  }

  if (!connected.isConnected) {
    throw new Error(
      "Freighter is not installed. Please install the Freighter browser extension from https://freighter.app to continue."
    );
  }

  let accessResult;
  try {
    accessResult = await requestAccess();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Freighter communication failed: ${msg}. Make sure Freighter is unlocked and try again.`
    );
  }

  if (accessResult.error) {
    const errDetail =
      typeof accessResult.error === "object"
        ? JSON.stringify(accessResult.error)
        : String(accessResult.error);
    throw new Error(
      `Freighter access denied: ${errDetail}. Please approve this site in Freighter and ensure you have an active account.`
    );
  }

  if (!accessResult.address) {
    throw new Error(
      "Freighter has no active account. Please create or import an account in Freighter first."
    );
  }

  let netRes;
  try {
    netRes = await getNetwork();
  } catch {
    netRes = null;
  }

  const networkName = netRes && netRes.network ? netRes.network : STELLAR_NETWORK;

  return {
    publicKey: accessResult.address,
    network: networkName,
  };
}

/**
 * Sign Soroban transaction XDR using Freighter
 */
export async function signSorobanTransaction(
  xdr: string,
  networkPassphrase?: string
): Promise<string> {
  try {
    const signedRes = await signTransaction(xdr, {
      networkPassphrase,
    });
    if (signedRes.error || !signedRes.signedTxXdr) {
      throw new Error(signedRes.error || "Transaction signing failed");
    }
    return signedRes.signedTxXdr;
  } catch (error) {
    console.error("Transaction signing rejected or failed:", error);
    throw error;
  }
}
