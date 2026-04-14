/**
 * Tracks distinct Google accounts that have authenticated against the API (Neon).
 */

/** @param {import('@neondatabase/serverless').NeonQueryFunction} sql */
export async function ensureCrowdcareUsersTable(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS crowdcare_users (
      google_sub TEXT PRIMARY KEY,
      email TEXT,
      first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

/**
 * @param {import('@neondatabase/serverless').NeonQueryFunction} sql
 * @param {{ sub: string, email?: string }} tokenUser
 */
export async function upsertCrowdcareUser(sql, tokenUser) {
  const sub = tokenUser.sub;
  const raw = tokenUser.email != null ? String(tokenUser.email).trim() : "";
  const email = raw.length > 0 ? raw.slice(0, 320) : null;

  await sql`
    INSERT INTO crowdcare_users (google_sub, email, first_seen_at, last_seen_at)
    VALUES (${sub}, ${email}, NOW(), NOW())
    ON CONFLICT (google_sub) DO UPDATE SET
      email = COALESCE(EXCLUDED.email, crowdcare_users.email),
      last_seen_at = NOW()
  `;
}

/** @param {import('@neondatabase/serverless').NeonQueryFunction} sql */
export async function countCrowdcareUsers(sql) {
  const rows = await sql`
    SELECT COUNT(*)::int AS c FROM crowdcare_users
  `;
  const n = rows[0]?.c;
  return typeof n === "number" ? n : 0;
}
