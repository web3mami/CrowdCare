import { Connection, PublicKey } from "@solana/web3.js";
import { getSolanaRpcUrlForServer } from "./chainFundingServer.js";
import { insertLedgerRow } from "./crowdcareLedger.js";
import { parseUsdcDepositUi } from "./solanaUsdcDepositParse.js";

const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

const SIG_PAGE = 100;
const SIG_MAX_DEFAULT = 1000;
const SIG_MAX_HARD = 5000;

function ledgerSyncMaxSignatures() {
  const raw = process.env.LEDGER_SYNC_MAX_SIGNATURES?.trim();
  const n = raw ? parseInt(raw, 10) : SIG_MAX_DEFAULT;
  if (!Number.isFinite(n) || n < 25) return SIG_MAX_DEFAULT;
  return Math.min(n, SIG_MAX_HARD);
}

/**
 * Newest-first signature list, paginated (so deposits older than the first page still appear).
 */
async function fetchSignaturesForAddressPaged(conn, pk) {
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

/**
 * Scan signatures for the campaign wallet (paginated); record USDC inflows to Neon.
 * Re-running is safe (unique campaign_id + signature). Redeploy does not erase rows.
 * @param {import('@neondatabase/serverless').NeonQueryFunction} sql
 * @param {string} campaignId
 * @param {string} walletBase58
 * @returns {Promise<number>} attempted inserts (includes no-ops on duplicate)
 */
export async function syncUsdcDepositsForCampaign(sql, campaignId, walletBase58) {
  const conn = new Connection(getSolanaRpcUrlForServer(), "confirmed");
  const pk = new PublicKey(String(walletBase58).trim());
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
    const amount = parseUsdcDepositUi(tx, walletBase58);
    if (!(amount > 0)) continue;
    const slot = tx?.slot ?? null;
    const blockTime =
      tx?.blockTime != null
        ? new Date(tx.blockTime * 1000).toISOString()
        : null;
    let fromAddress = null;
    try {
      const keys = tx?.transaction?.message?.accountKeys;
      if (Array.isArray(keys) && keys[0]?.pubkey) {
        const k = keys[0].pubkey;
        fromAddress =
          typeof k === "string" ? k : k?.toBase58?.() ?? String(k);
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
        mint: USDC_MINT,
        amount_ui: amount,
        from_address: fromAddress,
      });
      attempted++;
    } catch (e) {
      console.error("[ledgerSync] insert", campaignId, signature, e);
    }
  }
  return attempted;
}
