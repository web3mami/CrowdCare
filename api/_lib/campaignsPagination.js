import { parsePayload } from "./parsePayload.js";

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;

export function parseCampaignsLimit(raw) {
  const s = Array.isArray(raw) ? raw[0] : raw;
  const n = typeof s === "string" ? parseInt(s, 10) : typeof s === "number" ? s : NaN;
  if (!Number.isFinite(n) || n < 1) return DEFAULT_LIMIT;
  return Math.min(Math.floor(n), MAX_LIMIT);
}

/**
 * @param {string|null|undefined} cursorRaw
 * @returns {{ u: string, id: string } | null}
 */
export function decodeCampaignsCursor(cursorRaw) {
  if (!cursorRaw || typeof cursorRaw !== "string" || cursorRaw.length > 500) {
    return null;
  }
  try {
    const json = Buffer.from(cursorRaw, "base64url").toString("utf8");
    const o = JSON.parse(json);
    if (!o || typeof o.u !== "string" || typeof o.id !== "string") return null;
    if (o.id.length > 200) return null;
    return { u: o.u, id: o.id };
  } catch {
    return null;
  }
}

export function encodeCampaignsCursor(updatedAt, id) {
  const u =
    updatedAt instanceof Date
      ? updatedAt.toISOString()
      : typeof updatedAt === "string"
        ? updatedAt
        : String(updatedAt);
  return Buffer.from(JSON.stringify({ u, id: String(id) }), "utf8").toString(
    "base64url"
  );
}

/**
 * @param {import('@neondatabase/serverless').NeonQueryFunction} sql
 * @param {{ limit: number, cursor: ReturnType<typeof decodeCampaignsCursor> }} opts
 */
export async function selectCampaignsPage(sql, opts) {
  const lim = opts.limit;
  const cur = opts.cursor;

  let rows;
  if (!cur) {
    rows = await sql`
      SELECT id, payload, updated_at
      FROM campaigns
      ORDER BY updated_at DESC, id DESC
      LIMIT ${lim}
    `;
  } else {
    rows = await sql`
      SELECT id, payload, updated_at
      FROM campaigns
      WHERE updated_at < ${cur.u} OR (updated_at = ${cur.u} AND id < ${cur.id})
      ORDER BY updated_at DESC, id DESC
      LIMIT ${lim}
    `;
  }

  const campaigns = [];
  for (const row of rows) {
    const c = parsePayload(row);
    if (c && typeof c.id === "string") campaigns.push(c);
  }

  let nextCursor = null;
  if (rows.length === lim && rows.length > 0) {
    const last = rows[rows.length - 1];
    nextCursor = encodeCampaignsCursor(last.updated_at, last.id);
  }

  return { campaigns, nextCursor };
}
