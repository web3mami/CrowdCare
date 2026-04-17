import { attachChainFundingToCampaigns } from "../_lib/chainFundingServer.js";
import { getSql } from "../_lib/db.js";
import { parsePayload } from "../_lib/parsePayload.js";
import { rateLimitHubGet } from "../_lib/rateLimit.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).setHeader("Allow", "GET").json({ error: "Method not allowed" });
    return;
  }

  if (!rateLimitHubGet(req, res)) return;

  const sql = getSql();
  if (!sql) {
    res.status(200).json({ campaigns: [] });
    return;
  }

  const raw = req.query?.slug;
  const slug = Array.isArray(raw) ? raw[0] : raw;
  if (!slug || typeof slug !== "string" || slug.length > 64) {
    res.status(400).json({ error: "Invalid hub slug" });
    return;
  }

  try {
    const rows = await sql`
      SELECT payload      FROM campaigns
      WHERE share_slug = ${slug}
      ORDER BY updated_at DESC
    `;
    const campaigns = [];
    for (const row of rows) {
      const c = parsePayload(row);
      if (c && typeof c.id === "string") campaigns.push(c);
    }
    const enriched = await attachChainFundingToCampaigns(campaigns);
    res.status(200).json({ campaigns: enriched });
  } catch (e) {
    console.error("[api/hub]", e);
    res.status(500).json({ error: "Database error" });
  }
}
