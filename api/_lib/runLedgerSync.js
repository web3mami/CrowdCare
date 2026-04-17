import { goalTokenFromPayload } from "./campaignGoalToken.js";
import { ensureCrowdcareLedgerTable } from "./crowdcareLedger.js";
import { syncSolDepositsForCampaign } from "./ledgerSyncSol.js";
import { syncUsdcDepositsForCampaign } from "./ledgerSyncUsdc.js";
import { parsePayload } from "./parsePayload.js";

/** Scan recent campaigns and ingest USDC / native SOL deposit rows into crowdcare_ledger. */
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
    const token = goalTokenFromPayload(c);
    const w = String(c.wallet).trim();
    if (token === "USDC") {
      insertsAttempted += await syncUsdcDepositsForCampaign(sql, c.id, w);
    } else if (token === "SOL") {
      insertsAttempted += await syncSolDepositsForCampaign(sql, c.id, w);
    }
  }
  return { campaignsScanned: rows.length, insertsAttempted };
}
