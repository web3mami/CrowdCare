import {
  getGoogleWebClientIdForServer,
  verifyGoogleIdToken,
} from "../_lib/auth.js";
import {
  ensureCrowdcareUsersTable,
  getCrowdcareUserProfile,
  upsertCrowdcareUserProfile,
} from "../_lib/crowdcareUsers.js";
import { getSql } from "../_lib/db.js";
import { validateProfilePayload } from "../_lib/validateProfile.js";

async function readJsonBody(req) {
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return null;
    }
  }
  return body && typeof body === "object" ? body : null;
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  const sql = getSql();
  if (!sql) {
    if (req.method === "GET") {
      res.status(200).json({ profile: null, databaseConfigured: false });
      return;
    }
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

  if (req.method === "GET") {
    try {
      await ensureCrowdcareUsersTable(sql);
      const profile = await getCrowdcareUserProfile(sql, tokenUser.sub);
      res.status(200).json({
        profile,
        databaseConfigured: true,
      });
    } catch (e) {
      console.error("[api/users/profile GET]", e);
      res.status(500).json({ error: "Database error" });
    }
    return;
  }

  if (req.method !== "POST") {
    res
      .status(405)
      .setHeader("Allow", "GET, POST, OPTIONS")
      .json({ error: "Method not allowed" });
    return;
  }

  const body = await readJsonBody(req);
  if (!body) {
    res.status(400).json({ error: "Invalid JSON" });
    return;
  }

  const v = validateProfilePayload(body);
  if (!v.ok) {
    res.status(400).json({ error: v.error });
    return;
  }

  try {
    await ensureCrowdcareUsersTable(sql);
    await upsertCrowdcareUserProfile(sql, tokenUser, v.profile);
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error("[api/users/profile POST]", e);
    res.status(500).json({ error: "Database error" });
  }
}
