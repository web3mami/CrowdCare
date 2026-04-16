import { goalTokenFromPayload } from "./campaignGoalToken.js";
import { ensureCrowdcareLedgerTable } from "./crowdcareLedger.js";
import { syncUsdcDepositsForCampaign } from "./ledgerSyncUsdc.js";
import { parsePayload } from "./parsePayload.js";

/** Scan recent campaigns and ingest USDC deposit rows into crowdcare_ledger. */
export async function runCrowdcareLedgerSync(sql) {
  await ensureCrowdcareLedgerTable(sql);
  const rows = await sql`
    SELECT id, payload FROM campaigns
    ORDER BY updated_at DESC
    LIMIT 40
  `;
  let insertsAttempted = 0;
  for (const row of rows) {
    const c = parsePayload(row);
    if (!c || typeof c.id !== "string" || !c.wallet) continue;
    if (goalTokenFromPayload(c) !== "USDC") continue;
    const n = await syncUsdcDepositsForCampaign(
      sql,
      c.id,
      String(c.wallet).trim()
    );
    insertsAttempted += n;
  }
  return { campaignsScanned: rows.length, insertsAttempted };
}
