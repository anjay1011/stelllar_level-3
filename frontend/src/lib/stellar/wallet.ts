import {
  isConnected,
  getAddress,
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
 * Check if Freighter browser extension is installed
 */
export async function checkFreighterInstalled(): Promise<boolean> {
  try {
    const res = await isConnected();
    return res && res.isConnected ? true : false;
  } catch (error) {
    console.error("Error checking Freighter installation:", error);
    return false;
  }
}

/**
 * Connect user wallet and retrieve active Stellar public key
 */
export async function connectFreighter(): Promise<{
  publicKey: string;
  network: string;
}> {
  const installed = await checkFreighterInstalled();
  if (!installed) {
    throw new Error(
      "Freighter wallet is not installed. Please install the Freighter extension."
    );
  }

  const addrRes = await getAddress();
  if (!addrRes || !addrRes.address || addrRes.error) {
    throw new Error("Failed to retrieve public address from Freighter.");
  }

  const netRes = await getNetwork();
  const networkName = netRes && netRes.network ? netRes.network : STELLAR_NETWORK;

  return {
    publicKey: addrRes.address,
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
