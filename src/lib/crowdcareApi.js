import { decodeGoogleCredentialJwt } from "./googleGis.js";

/**
 * GIS credential JWT — authorizes POST /api/campaigns and /api/users/profile.
 * Stored in localStorage (not sessionStorage) so it survives browser restarts and
 * is shared across tabs. Without it, the UI can still show a signed-in user from
 * `crowdcare_user` while every server write returns no_id_token.
 */
const ID_TOKEN_KEY = "crowdcare_google_id_token";

export function setGoogleIdToken(token) {
  if (typeof localStorage === "undefined") return;
  try {
    if (token && typeof token === "string") {
      localStorage.setItem(ID_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(ID_TOKEN_KEY);
    }
  } catch {
    /* ignore quota / blocked storage */
  }
  try {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem(ID_TOKEN_KEY);
    }
  } catch {
    /* ignore */
  }
}

export function getGoogleIdToken() {
  if (typeof localStorage === "undefined") return "";
  try {
    let t = localStorage.getItem(ID_TOKEN_KEY) || "";
    if (!t && typeof sessionStorage !== "undefined") {
      t = sessionStorage.getItem(ID_TOKEN_KEY) || "";
      if (t) {
        try {
          localStorage.setItem(ID_TOKEN_KEY, t);
          sessionStorage.removeItem(ID_TOKEN_KEY);
        } catch {
          /* ignore */
        }
      }
    }
    return t;
  } catch {
    return "";
  }
}

export function clearGoogleIdToken() {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(ID_TOKEN_KEY);
    }
  } catch {
    /* ignore */
  }
  try {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem(ID_TOKEN_KEY);
    }
  } catch {
    /* ignore */
  }
}

/**
 * Public list of campaigns synced to CrowdCare plus whether the server has a database.
 * Follows `nextCursor` pages until exhausted (cap avoids runaway).
 * @returns {{ campaigns: object[], databaseConfigured: boolean }}
 */
export async function fetchCampaignsDirectoryFromApi() {
  const all = [];
  let cursor = null;
  let databaseConfigured = true;
  const pageSize = 50;
  const maxPages = 40;

  for (let page = 0; page < maxPages; page++) {
    const u = new URL("/api/campaigns", window.location.origin);
    u.searchParams.set("limit", String(pageSize));
    if (cursor) u.searchParams.set("cursor", cursor);

    const r = await fetch(u.toString());
    if (!r.ok) throw new Error(`campaigns ${r.status}`);
    const text = await r.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error("campaigns invalid json");
    }
    if (page === 0) {
      databaseConfigured = data.databaseConfigured !== false;
    }
    const batch = Array.isArray(data.campaigns) ? data.campaigns : [];
    all.push(...batch);
    const next = data.nextCursor;
    if (!next || batch.length === 0) break;
    cursor = next;
  }

  return { campaigns: all, databaseConfigured };
}

/** @returns {boolean} whether a non-expired GIS credential JWT is in sessionStorage */
export function hasFreshGoogleIdTokenForSync() {
  const token = getGoogleIdToken();
  if (!token) return false;
  try {
    const payload = decodeGoogleCredentialJwt(token);
    const exp = payload.exp;
    if (typeof exp !== "number") return true;
    return exp * 1000 > Date.now() + 30_000;
  } catch {
    return false;
  }
}

/**
 * User-visible message when POST /api/campaigns fails after create.
 * @param {{ ok?: boolean, error?: string, status?: number }} result
 */
export function formatCampaignSyncError(result) {
  const err = result?.error || "";
  const status = result?.status;
  if (err === "no_id_token" || err === "id_token_expired") {
    return "Online sync needs a fresh Google sign-in in this tab. Use “Sign in again for sync” below, then click Retry online sync (your campaign is already saved on this device).";
  }
  if (status === 503 || /not configured/i.test(err)) {
    if (/GOOGLE_CLIENT_ID|VITE_GOOGLE_CLIENT_ID|Google Web client ID/i.test(err)) {
      return "The server is missing a Google Web client ID env var. On Vercel, set VITE_GOOGLE_CLIENT_ID (or GOOGLE_CLIENT_ID with the same value) for Production, then redeploy.";
    }
    return "The live site is not connected to a database yet (server configuration). Your campaign is saved only in this browser until DATABASE_URL is set on the host.";
  }
  if (status === 401 || /invalid or expired token/i.test(err)) {
    return "After you click Save, CrowdCare asks Google to prove it’s still you so the server can store the campaign for others. That check failed (token expired, wrong tab, or the site’s server Google client ID doesn’t match the app). Use Sign in again for sync, then Retry online sync. Your campaign is already saved in this browser.";
  }
  if (
    err === "google_account_mismatch" ||
    (status === 403 &&
      (/creatorSub does not match/i.test(err) ||
        /belongs to another account/i.test(err)))
  ) {
    return "The Google proof in this tab doesn’t match your CrowdCare profile (One Tap or another tab signed you in with a different Google account). Open the menu → Sign out, then sign in again with the same Google account as this profile, and try saving once more.";
  }
  if (status === 403) {
    return "Server rejected this save (403). Sign out, sign in with the same Google account as this profile, then try again.";
  }
  if (/public display name|display name is required/i.test(err)) {
    return "The server requires a public display name. Set it on Profile, then try Retry online sync or create the campaign again.";
  }
  if (/x username|X username/i.test(err)) {
    return "The server requires a valid X username on your Profile. Update Profile, then try Retry online sync or create the campaign again.";
  }
  return `Could not sync online: ${err || "unknown error"}. Your campaign is still saved in this browser.`;
}

export async function fetchHubCampaignsFromApi(slug) {
  const r = await fetch(`/api/hub/${encodeURIComponent(slug)}`);
  if (!r.ok) throw new Error(`hub ${r.status}`);
  const data = await r.json();
  return Array.isArray(data.campaigns) ? data.campaigns : [];
}

/**
 * Recent USDC inflow rows (GET campaign with includeActivity=1; see cron in DEPLOY.md).
 * @param {string} id
 * @param {number} [limit]
 * @returns {Promise<{ activity: { signature: string, slot: string|null, blockTime: string|null, mint: string, amountUi: string, fromAddress: string|null }[], databaseConfigured: boolean }>}
 */
export async function fetchCampaignActivityFromApi(id, limit = 40) {
  const u = new URL(
    `/api/campaign/${encodeURIComponent(id)}`,
    window.location.origin
  );
  u.searchParams.set("activityLimit", String(limit));
  const r = await fetch(u.toString());
  if (!r.ok) throw new Error(`campaign activity ${r.status}`);
  const data = await r.json();
  return {
    activity: Array.isArray(data.activity) ? data.activity : [],
    databaseConfigured: data.databaseConfigured === true,
  };
}

export async function fetchCampaignByIdFromApi(id) {
  const r = await fetch(`/api/campaign/${encodeURIComponent(id)}`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`campaign ${r.status}`);
  const data = await r.json();
  return data.campaign && typeof data.campaign === "object" ? data.campaign : null;
}

/**
 * Upsert campaign on the server (requires recent Google sign-in for a valid ID token).
 * @returns {{ ok: boolean, error?: string, status?: number }}
 */
export async function syncCampaignToApi(campaign) {
  const token = getGoogleIdToken();
  if (!token) {
    return { ok: false, error: "no_id_token" };
  }
  try {
    const payload = decodeGoogleCredentialJwt(token);
    const exp = payload.exp;
    if (typeof exp === "number" && exp * 1000 <= Date.now() + 30_000) {
      return { ok: false, error: "id_token_expired" };
    }
  } catch {
    return { ok: false, error: "no_id_token" };
  }
  const r = await fetch("/api/campaigns", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ campaign }),
  });
  if (r.ok) return { ok: true };
  let msg = `HTTP ${r.status}`;
  try {
    const j = await r.json();
    if (j?.error) msg = j.error;
  } catch {
    /* ignore */
  }
   return { ok: false, error: msg, status: r.status };
}

/**
 * Delete campaign on the server (must own the row).
 * @returns {{ ok: boolean, error?: string, status?: number }}
 */
export async function deleteCampaignFromApi(id) {
  const token = getGoogleIdToken();
  if (!token) {
    return { ok: false, error: "no_id_token" };
  }
  const r = await fetch(`/api/campaign/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (r.ok) return { ok: true };
  if (r.status === 404) return { ok: true };
  let msg = `HTTP ${r.status}`;
  try {
    const j = await r.json();
    if (j?.error) msg = j.error;
  } catch {
    /* ignore */
  }
  return { ok: false, error: msg, status: r.status };
}

/**
 * Record this Google account on the server (for admin user counts). Fire-and-forget.
 */
export async function pingUserSeenToApi() {
  const token = getGoogleIdToken();
  if (!token) return;
  try {
    const r = await fetch("/api/users/ping", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok && r.status !== 401) {
      console.warn("[CrowdCare] users/ping", r.status);
    }
  } catch (e) {
    console.warn("[CrowdCare] users/ping", e);
  }
}

/**
 * Load server-stored profile (display name, X handle, hub slug, lock) for this Google account.
 * @param {string} [idToken] GIS credential JWT; defaults to session token.
 * @returns {Promise<{ profile: { username: string, xUsername: string, shareSlug: string, profileLocked: boolean } | null, databaseConfigured: boolean }>}
 */
export async function fetchUserProfileFromApi(idToken) {
  const token =
    idToken && typeof idToken === "string" ? idToken : getGoogleIdToken();
  if (!token) {
    return { profile: null, databaseConfigured: true };
  }
  try {
    const r = await fetch("/api/users/profile", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const text = await r.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return { profile: null, databaseConfigured: true };
    }
    if (r.status === 200 && data && typeof data === "object") {
      return {
        profile:
          data.profile && typeof data.profile === "object"
            ? data.profile
            : null,
        databaseConfigured: data.databaseConfigured !== false,
      };
    }
    if (r.status === 401) {
      console.warn(
        "[CrowdCare] /api/users/profile: Google token rejected (401). Check server GOOGLE_CLIENT_ID matches VITE_GOOGLE_CLIENT_ID."
      );
    } else if (r.status >= 400) {
      console.warn("[CrowdCare] /api/users/profile GET failed:", r.status);
    }
    return { profile: null, databaseConfigured: true };
  } catch (e) {
    console.warn("[CrowdCare] users/profile GET", e);
    return { profile: null, databaseConfigured: true };
  }
}

/**
 * Persist profile fields to Neon (same validation as Profile form). Fire-and-forget friendly.
 * @returns {{ ok: boolean, error?: string, status?: number }}
 */
export async function saveUserProfileToApi(profile) {
  const token = getGoogleIdToken();
  if (!token) {
    return { ok: false, error: "no_id_token" };
  }
  try {
    const payload = decodeGoogleCredentialJwt(token);
    const exp = payload.exp;
    if (typeof exp === "number" && exp * 1000 <= Date.now() + 30_000) {
      return { ok: false, error: "id_token_expired" };
    }
  } catch {
    return { ok: false, error: "no_id_token" };
  }
  const body = {
    username: profile?.username,
    xUsername: profile?.xUsername,
    shareSlug: profile?.shareSlug,
    profileLocked: !!profile?.profileLocked,
  };
  const r = await fetch("/api/users/profile", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (r.ok) return { ok: true };
  let msg = `HTTP ${r.status}`;
  try {
    const j = await r.json();
    if (j?.error) msg = j.error;
  } catch {
    /* ignore */
  }
  return { ok: false, error: msg, status: r.status };
}
