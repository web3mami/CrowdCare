import { Connection, PublicKey } from "@solana/web3.js";
import { getSolanaRpcUrlForServer } from "./chainFundingServer.js";

const SIG_PAGE = 100;
const SIG_MAX_DEFAULT = 1000;
const SIG_MAX_HARD = 5000;

export function ledgerSyncMaxSignatures() {
  const raw = process.env.LEDGER_SYNC_MAX_SIGNATURES?.trim();
  const n = raw ? parseInt(raw, 10) : SIG_MAX_DEFAULT;
  if (!Number.isFinite(n) || n < 25) return SIG_MAX_DEFAULT;
  return Math.min(n, SIG_MAX_HARD);
}

/**
 * Newest-first signatures for an address, paginated (shared by USDC + SOL ledger sync).
 * @param {Connection} conn
 * @param {PublicKey} pk
 */
export async function fetchSignaturesForAddressPaged(conn, pk) {
  const cap = ledgerSyncMaxSignatures();
  const out = [];
  let before = undefined;
  try {
    while (out.length < cap) {
      const want = Math.min(SIG_PAGE, cap - out.length);
      const batch = await conn.getSignaturesForAddress(pk, {
        limit: want,
        before,
      });
      if (!batch.length) break;
      for (const row of batch) {
        out.push(row);
      }
      if (batch.length < want) break;
      before = batch[batch.length - 1].signature;
    }
  } catch (e) {
    console.error("[ledgerSync] getSignaturesForAddress paged", e);
    return out.length ? out : [];
  }
  return out;
}

/** @param {string} walletBase58 */
export function ledgerConnectionAndPubkey(walletBase58) {
  const conn = new Connection(getSolanaRpcUrlForServer(), "confirmed");
  const pk = new PublicKey(String(walletBase58).trim());
  return { conn, pk };
}
