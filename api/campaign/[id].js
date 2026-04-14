import { getSql } from "../_lib/db.js";

function parsePayload(row) {
  const p = row?.payload;
  if (p == null) return null;
  if (typeof p === "object") return p;
  if (typeof p === "string") {
    try {
      return JSON.parse(p);
    } catch {
      return null;
    }
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).setHeader("Allow", "GET").json({ error: "Method not allowed" });
    return;
  }

  const sql = getSql();
  if (!sql) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const raw = req.query?.id;
  const id = Array.isArray(raw) ? raw[0] : raw;
  if (!id || typeof id !== "string" || id.length > 200) {
    res.status(400).json({ error: "Invalid id" });
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
    res.status(200).json({ campaign });
  } catch (e) {
    console.error("[api/campaign]", e);
    res.status(500).json({ error: "Database error" });
  }
}
