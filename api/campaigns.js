import {
  getGoogleWebClientIdForServer,
  verifyGoogleIdToken,
} from "./_lib/auth.js";
import { getSql } from "./_lib/db.js";
import { parsePayload } from "./_lib/parsePayload.js";
import { validateCampaignPayload } from "./_lib/validateCampaign.js";

export default async function handler(req, res) {
  const sql = getSql();

  if (req.method === "GET") {
    if (!sql) {
      res.status(200).json({ campaigns: [], databaseConfigured: false });
      return;
    }
    try {
      const rows = await sql`
        SELECT payload FROM campaigns ORDER BY updated_at DESC
      `;
      const campaigns = [];
      for (const row of rows) {
        const c = parsePayload(row);
        if (c && typeof c.id === "string") campaigns.push(c);
      }
      res.status(200).json({ campaigns, databaseConfigured: true });
    } catch (e) {
      console.error("[api/campaigns GET]", e);
      res.status(500).json({ error: "Database error" });
    }
    return;
  }

  if (req.method !== "POST") {
    res
      .status(405)
      .setHeader("Allow", "GET, POST")
      .json({ error: "Method not allowed" });
    return;
  }

  if (!sql) {
    res.status(503).json({ error: "Database not configured" });
    return;
  }

  if (!getGoogleWebClientIdForServer()) {
    res.status(503).json({
      error:
        "Google Web client ID not configured on server (set GOOGLE_CLIENT_ID or VITE_GOOGLE_CLIENT_ID)",
    });
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

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      res.status(400).json({ error: "Invalid JSON" });
      return;
    }
  }
  const campaign = body?.campaign;
  const v = validateCampaignPayload(campaign);
  if (!v.ok) {
    res.status(400).json({ error: v.error });
    return;
  }

  if (campaign.creatorSub !== tokenUser.sub) {
    res.status(403).json({ error: "creatorSub does not match signed-in user" });
    return;
  }

  const sub = tokenUser.sub;
  const id = campaign.id;
  const shareSlug = campaign.creatorShareSlug;

  try {
    const existing = await sql`
      SELECT creator_sub FROM campaigns WHERE id = ${id} LIMIT 1
    `;
    if (existing.length > 0 && existing[0].creator_sub !== sub) {
      res.status(403).json({ error: "Campaign id belongs to another account" });
      return;
    }

    await sql`
      INSERT INTO campaigns (id, creator_sub, share_slug, payload, updated_at)
      VALUES (${id}, ${sub}, ${shareSlug}, ${JSON.stringify(campaign)}, NOW())
      ON CONFLICT (id) DO UPDATE SET
        payload = EXCLUDED.payload,
        share_slug = EXCLUDED.share_slug,
        updated_at = NOW()
    `;

    res.status(200).json({ ok: true });
  } catch (e) {
    console.error("[api/campaigns POST]", e);
    res.status(500).json({ error: "Database error" });
  }
}
