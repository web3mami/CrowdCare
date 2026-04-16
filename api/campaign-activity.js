import {
  ensureCrowdcareLedgerTable,
  listLedgerForCampaign,
} from "./_lib/crowdcareLedger.js";
import { getSql } from "./_lib/db.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).setHeader("Allow", "GET").json({ error: "Method not allowed" });
    return;
  }
  const raw = req.query?.id;
  const id = Array.isArray(raw) ? raw[0] : raw;
  if (!id || typeof id !== "string" || id.length > 200) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const sql = getSql();
  if (!sql) {
    res.status(200).json({ activity: [], databaseConfigured: false });
    return;
  }
  try {
    await ensureCrowdcareLedgerTable(sql);
    const limRaw = req.query?.limit;
    const lim = Array.isArray(limRaw) ? limRaw[0] : limRaw;
    const payerRaw = req.query?.includePayer;
    const includePayer =
      (Array.isArray(payerRaw) ? payerRaw[0] : payerRaw) === "1";

    const rows = await listLedgerForCampaign(sql, id, lim);
    const activity = rows.map((r) => {
      const row = {
        signature: r.signature,
        slot: r.slot != null ? String(r.slot) : null,
        blockTime: r.block_time,
        mint: r.mint,
        amountUi: r.amount_ui != null ? String(r.amount_ui) : "0",
      };
      if (includePayer) {
        row.fromAddress = r.from_address;
      }
      return row;
    });
    res.status(200).json({ activity, databaseConfigured: true });
  } catch (e) {
    console.error("[api/campaign-activity]", e);
    res.status(500).json({ error: "Database error" });
  }
}
