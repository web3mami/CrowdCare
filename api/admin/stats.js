import {
  countCrowdcareUsers,
  ensureCrowdcareUsersTable,
} from "../_lib/crowdcareUsers.js";
import { getSql } from "../_lib/db.js";

function parseBasicAuth(header) {
  if (!header || typeof header !== "string") return null;
  const m = header.match(/^Basic\s+(.+)$/i);
  if (!m) return null;
  try {
    const decoded = Buffer.from(m[1].trim(), "base64").toString("utf8");
    const i = decoded.indexOf(":");
    if (i < 0) return null;
    return {
      user: decoded.slice(0, i),
      pass: decoded.slice(i + 1),
    };
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res
      .status(405)
      .setHeader("Allow", "GET")
      .json({ error: "Method not allowed" });
    return;
  }

  const adminUser = process.env.ADMIN_USERNAME?.trim();
  const adminPass = process.env.ADMIN_PASSWORD?.trim();
  if (!adminUser || !adminPass) {
    res.status(503).json({
      error:
        "Admin is not configured (set ADMIN_USERNAME and ADMIN_PASSWORD on the server)",
    });
    return;
  }

  const creds = parseBasicAuth(req.headers.authorization || "");
  if (!creds || creds.user !== adminUser || creds.pass !== adminPass) {
    res.setHeader("WWW-Authenticate", 'Basic realm="CrowdCare Admin"');
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const sql = getSql();
  if (!sql) {
    res.status(503).json({ error: "Database not configured" });
    return;
  }

  try {
    await ensureCrowdcareUsersTable(sql);
    const userCount = await countCrowdcareUsers(sql);
    res.status(200).json({
      userCount,
      recordedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error("[api/admin/stats]", e);
    res.status(500).json({ error: "Database error" });
  }
}
