import { Connection, PublicKey } from "@solana/web3.js";
import { getSolanaRpcUrlForServer } from "./chainFundingServer.js";
import { insertLedgerRow } from "./crowdcareLedger.js";
import { parseUsdcDepositUi } from "./solanaUsdcDepositParse.js";

const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

/**
 * Scan recent signatures for the campaign wallet; record USDC inflows to Neon.
 * @param {import('@neondatabase/serverless').NeonQueryFunction} sql
 * @param {string} campaignId
 * @param {string} walletBase58
 * @returns {Promise<number>} attempted inserts (includes no-ops on duplicate)
 */
export async function syncUsdcDepositsForCampaign(sql, campaignId, walletBase58) {
  const conn = new Connection(getSolanaRpcUrlForServer(), "confirmed");
  const pk = new PublicKey(String(walletBase58).trim());
  let sigs;
  try {
    sigs = await conn.getSignaturesForAddress(pk, { limit: 25 });
  } catch (e) {
    console.error("[ledgerSync] getSignaturesForAddress", campaignId, e);
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
