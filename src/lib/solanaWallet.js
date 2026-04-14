import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { deriveDemoKeypair } from "./keypair.js";

/** Paid from the same balance as the transfer; keep headroom for fees. */
export const SOL_TRANSFER_FEE_BUFFER_LAMPORTS = 15_000;

/**
 * Browser default: same-origin `/api/solana-rpc` (Vite proxy in dev; Vercel function in prod).
 * Set `VITE_SOLANA_RPC_URL` only if you use an RPC that allows browser CORS.
 */
export function getSolanaRpcUrl() {
  const fromEnv =
    typeof import.meta !== "undefined" && import.meta.env?.VITE_SOLANA_RPC_URL;
  if (fromEnv && String(fromEnv).trim()) return String(fromEnv).trim();
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}/api/solana-rpc`;
  }
  return "https://api.mainnet-beta.solana.com";
}

export function getSolanaConnection() {
  return new Connection(getSolanaRpcUrl(), "confirmed");
}

export function isValidSolanaAddress(s) {
  try {
    new PublicKey(String(s || "").trim());
    return true;
  } catch {
    return false;
  }
}

export async function fetchWalletBalanceLamports(publicKeyBase58) {
  const conn = getSolanaConnection();
  const pk = new PublicKey(String(publicKeyBase58).trim());
  return conn.getBalance(pk, "confirmed");
}

export function lamportsToSolDisplay(lamports) {
  const sol = lamports / LAMPORTS_PER_SOL;
  if (sol === 0) return "0";
  if (sol < 0.000001) return sol.toExponential(2);
  return sol.toLocaleString(undefined, {
    maximumFractionDigits: 9,
    minimumFractionDigits: 0,
  });
}

export function transactionExplorerUrl(signature) {
  const lower = getSolanaRpcUrl().toLowerCase();
  if (lower.includes("devnet")) {
    return `https://solscan.io/tx/${signature}?cluster=devnet`;
  }
  return `https://solscan.io/tx/${signature}`;
}

/**
 * Send native SOL from the CrowdCare-derived wallet to any valid address.
 * @param {string} googleSub
 * @param {string} toAddressBase58
 * @param {number} lamports
 * @returns {Promise<string>} signature
 */
export async function transferSolFromDemoWallet(
  googleSub,
  toAddressBase58,
  lamports
) {
  const conn = getSolanaConnection();
  const from = await deriveDemoKeypair(googleSub);
  const to = new PublicKey(String(toAddressBase58).trim());

  const latest = await conn.getLatestBlockhash("confirmed");
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: from.publicKey,
      toPubkey: to,
      lamports,
    })
  );
  tx.feePayer = from.publicKey;
  tx.recentBlockhash = latest.blockhash;
  tx.sign(from);

  const sig = await conn.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
    maxRetries: 3,
  });
  await conn.confirmTransaction(
    {
      signature: sig,
      blockhash: latest.blockhash,
      lastValidBlockHeight: latest.lastValidBlockHeight,
    },
    "confirmed"
  );
  return sig;
}
