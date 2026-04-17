import { insertLedgerRow } from "./crowdcareLedger.js";
import { LEDGER_NATIVE_SOL_MINT } from "./ledgerMints.js";
import {
  fetchSignaturesForAddressPaged,
  ledgerConnectionAndPubkey,
} from "./ledgerSyncPaging.js";
import { parseNativeSolDepositSol } from "./solanaNativeSolDepositParse.js";

function accountKeyString(k) {
  if (k == null) return null;
  if (typeof k === "string") return k;
  const p = k.pubkey ?? k;
  if (typeof p === "string") return p;
  return p?.toBase58?.() ?? null;
}

/**
 * Scan signatures; record native SOL inflows (net lamport gain on campaign wallet).
 * @param {import('@neondatabase/serverless').NeonQueryFunction} sql
 * @param {string} campaignId
 * @param {string} walletBase58
 * @returns {Promise<number>} attempted inserts (includes no-ops on duplicate)
 */
export async function syncSolDepositsForCampaign(sql, campaignId, walletBase58) {
  const { conn, pk } = ledgerConnectionAndPubkey(walletBase58);
  const sigs = await fetchSignaturesForAddressPaged(conn, pk);
  if (!sigs.length) {
    return 0;
  }
  let attempted = 0;
  for (const { signature } of sigs) {
    let tx;
    try {
      tx = await conn.getParsedTransaction(signature, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });
    } catch {
      continue;
    }
    const amountSol = parseNativeSolDepositSol(tx, walletBase58);
    if (!(amountSol > 0)) continue;
    const slot = tx?.slot ?? null;
    const blockTime =
      tx?.blockTime != null
        ? new Date(tx.blockTime * 1000).toISOString()
        : null;
    let fromAddress = null;
    try {
      const keys = tx?.transaction?.message?.accountKeys;
      if (Array.isArray(keys) && keys[0]) {
        fromAddress = accountKeyString(keys[0]);
      }
    } catch {
      /* ignore */
    }
    try {
      await insertLedgerRow(sql, {
        campaign_id: campaignId,
        signature,
        slot,
        block_time: blockTime,
        mint: LEDGER_NATIVE_SOL_MINT,
        amount_ui: amountSol,
        from_address: fromAddress,
      });
      attempted++;
    } catch (e) {
      console.error("[ledgerSyncSol] insert", campaignId, signature, e);
    }
  }
  return attempted;
}
