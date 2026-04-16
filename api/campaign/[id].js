import { verifyGoogleIdToken } from "../_lib/auth.js";
import {
  ensureCrowdcareLedgerTable,
  listLedgerForCampaign,
} from "../_lib/crowdcareLedger.js";
import {
  ensureCrowdcareUsersTable,
  upsertCrowdcareUser,
} from "../_lib/crowdcareUsers.js";
import { attachChainFundingToCampaigns } from "../_lib/chainFundingServer.js";
import { getSql } from "../_lib/db.js";
import { parsePayload } from "../_lib/parsePayload.js";

export default async function handler(req, res) {
  const raw = req.query?.id;
  const id = Array.isArray(raw) ? raw[0] : raw;
  if (!id || typeof id !== "string" || id.length > 200) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const sql = getSql();

  if (req.method === "GET") {
    if (!sql) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    try {
      const rows = await sql`
        SELECT payload FROM campaigns WHERE id = ${id} LIMIT 1
      `;
      if (!rows.length) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      const campaign = parsePayload(rows[0]);
      if (!campaign) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      const [enriched] = await attachChainFundingToCampaigns([campaign]);
      const incRaw = Array.isArray(req.query?.includeActivity)
        ? req.query.includeActivity[0]
        : req.query?.includeActivity;
      let wantActivity =
        incRaw === true ||
        incRaw === 1 ||
        String(incRaw ?? "").toLowerCase() === "1" ||
        String(incRaw ?? "").toLowerCase() === "true";
      if (
        !wantActivity &&
        typeof req.url === "string" &&
        req.url.includes("includeActivity=")
      ) {
        try {
          const u = new URL(req.url, "http://localhost");
          const v = u.searchParams.get("includeActivity");
          wantActivity =
            v === "1" || (v != null && v.toLowerCase() === "true");
        } catch {
          /* ignore */
        }
      }
      if (!wantActivity) {
        res.status(200).json({ campaign: enriched });
        return;
      }
      try {
        await ensureCrowdcareLedgerTable(sql);
        const limRaw = req.query?.activityLimit;
        const lim = Array.isArray(limRaw) ? limRaw[0] : limRaw;
        const payerRaw = req.query?.includePayer;
        const includePayer =
          (Array.isArray(payerRaw) ? payerRaw[0] : payerRaw) === "1";
        const ledgerRows = await listLedgerForCampaign(sql, id, lim);
        const activity = ledgerRows.map((r) => {
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
        res.status(200).json({
          campaign: enriched,
          activity,
          databaseConfigured: true,
        });
      } catch (ledgerErr) {
        console.error("[api/campaign GET] ledger", ledgerErr);
        res.status(500).json({ error: "Database error" });
      }
    } catch (e) {
      console.error("[api/campaign GET]", e);
      res.status(500).json({ error: "Database error" });
    }
    return;
  }

  if (req.method === "DELETE") {
    if (!sql) {
      res.status(503).json({ error: "Database not configured" });
      return;
    }
    const auth = req.headers.authorization || "";
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (!m) {
      res.status(401).json({ error: "Missing Authorization bearer token" });
      return;
    }
    const tokenUser = await verifyGoogleIdToken(m[1].trim());
    if (!tokenUser) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }
    try {
      await ensureCrowdcareUsersTable(sql);
      await upsertCrowdcareUser(sql, tokenUser);
    } catch (e) {
      console.error("[api/campaign DELETE] user upsert", e);
    }
    const sub = tokenUser.sub;
    try {
      const rows = await sql`
        SELECT creator_sub FROM campaigns WHERE id = ${id} LIMIT 1
      `;
      if (!rows.length) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      if (rows[0].creator_sub !== sub) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      await sql`
        DELETE FROM campaigns WHERE id = ${id} AND creator_sub = ${sub}
      `;
      res.status(200).json({ ok: true });
    } catch (e) {
      console.error("[api/campaign DELETE]", e);
      res.status(500).json({ error: "Database error" });
    }
    return;
  }

  res
    .status(405)
    .setHeader("Allow", "GET, DELETE")
    .json({ error: "Method not allowed" });
}
