import { goalTokenFromPayload } from "./_lib/campaignGoalToken.js";
import { ensureCrowdcareLedgerTable } from "./_lib/crowdcareLedger.js";
import { getSql } from "./_lib/db.js";
import { syncUsdcDepositsForCampaign } from "./_lib/ledgerSyncUsdc.js";
import { parsePayload } from "./_lib/parsePayload.js";

function authorizeCron(req) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = req.headers.authorization || "";
  return auth === `Bearer ${secret}`;
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.status(405).setHeader("Allow", "GET, POST").json({ error: "Method not allowed" });
    return;
  }
  if (!authorizeCron(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const sql = getSql();
  if (!sql) {
    res.status(503).json({ error: "Database not configured" });
    return;
  }
  try {
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
      const n = await syncUsdcDepositsForCampaign(sql, c.id, String(c.wallet).trim());
      insertsAttempted += n;
    }
    res.status(200).json({
      ok: true,
      campaignsScanned: rows.length,
      insertsAttempted,
    });
  } catch (e) {
    console.error("[api/sync-ledger]", e);
    res.status(500).json({ error: "Sync failed" });
  }
}
