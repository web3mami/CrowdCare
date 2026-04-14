import { verifyGoogleIdToken } from "../_lib/auth.js";
import {
  ensureCrowdcareUsersTable,
  upsertCrowdcareUser,
} from "../_lib/crowdcareUsers.js";
import { getSql } from "../_lib/db.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res
      .status(405)
      .setHeader("Allow", "POST")
      .json({ error: "Method not allowed" });
    return;
  }

  const sql = getSql();
  if (!sql) {
    res.status(503).json({ ok: false, error: "Database not configured" });
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
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error("[api/users/ping]", e);
    res.status(500).json({ error: "Database error" });
  }
}
