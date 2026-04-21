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
  await sql`
    ALTER TABLE crowdcare_users ADD COLUMN IF NOT EXISTS display_name TEXT
  `;
  await sql`
    ALTER TABLE crowdcare_users ADD COLUMN IF NOT EXISTS x_username TEXT
  `;
  await sql`
    ALTER TABLE crowdcare_users ADD COLUMN IF NOT EXISTS share_slug TEXT
  `;
  await sql`
    ALTER TABLE crowdcare_users
    ADD COLUMN IF NOT EXISTS profile_locked BOOLEAN DEFAULT false
  `;
}

/**
 * @param {import('@neondatabase/serverless').NeonQueryFunction} sql
 * @param {string} sub
 * @returns {Promise<{ username: string, xUsername: string, shareSlug: string, profileLocked: boolean } | null>}
 */
export async function getCrowdcareUserProfile(sql, sub) {
  const rows = await sql`
    SELECT display_name, x_username, share_slug, profile_locked
    FROM crowdcare_users
    WHERE google_sub = ${sub}
    LIMIT 1
  `;
  const r = rows[0];
  if (!r) return null;
  return {
    username: r.display_name ? String(r.display_name) : "",
    xUsername: r.x_username ? String(r.x_username) : "",
    shareSlug: r.share_slug ? String(r.share_slug) : "",
    profileLocked: r.profile_locked === true,
  };
}

/**
 * @param {import('@neondatabase/serverless').NeonQueryFunction} sql
 * @param {{ sub: string, email?: string }} tokenUser
 * @param {{ display_name: string, x_username: string, share_slug: string, profile_locked: boolean }} profile
 */
export async function upsertCrowdcareUserProfile(sql, tokenUser, profile) {
  const sub = tokenUser.sub;
  const raw = tokenUser.email != null ? String(tokenUser.email).trim() : "";
  const email = raw.length > 0 ? raw.slice(0, 320) : null;

  await sql`
    INSERT INTO crowdcare_users (
      google_sub,
      email,
      display_name,
      x_username,
      share_slug,
      profile_locked,
      first_seen_at,
      last_seen_at
    )
    VALUES (
      ${sub},
      ${email},
      ${profile.display_name},
      ${profile.x_username},
      ${profile.share_slug},
      ${profile.profile_locked},
      NOW(),
      NOW()
    )
    ON CONFLICT (google_sub) DO UPDATE SET
      email = COALESCE(EXCLUDED.email, crowdcare_users.email),
      display_name = EXCLUDED.display_name,
      x_username = EXCLUDED.x_username,
      share_slug = EXCLUDED.share_slug,
      profile_locked = EXCLUDED.profile_locked,
      last_seen_at = NOW()
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
