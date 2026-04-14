import { decodeGoogleCredentialJwt } from "./googleGis.js";

/** GIS credential JWT — used to authorize POST /api/campaigns (same aud as Web client ID). */
const ID_TOKEN_KEY = "crowdcare_google_id_token";

export function setGoogleIdToken(token) {
  if (typeof sessionStorage === "undefined") return;
  if (token && typeof token === "string") {
    sessionStorage.setItem(ID_TOKEN_KEY, token);
  } else {
    sessionStorage.removeItem(ID_TOKEN_KEY);
  }
}

export function getGoogleIdToken() {
  if (typeof sessionStorage === "undefined") return "";
  return sessionStorage.getItem(ID_TOKEN_KEY) || "";
}

export function clearGoogleIdToken() {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(ID_TOKEN_KEY);
}

/**
 * Public list of campaigns synced to CrowdCare plus whether the server has a database.
 * @returns {{ campaigns: object[], databaseConfigured: boolean }}
 */
export async function fetchCampaignsDirectoryFromApi() {
  const r = await fetch("/api/campaigns");
  if (!r.ok) throw new Error(`campaigns ${r.status}`);
  const data = await r.json();
  const campaigns = Array.isArray(data.campaigns) ? data.campaigns : [];
  const databaseConfigured = data.databaseConfigured !== false;
  return { campaigns, databaseConfigured };
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
    return "The live site is not connected to a database yet (server configuration). Your campaign is saved only in this browser until DATABASE_URL is set on the host.";
  }
  if (status === 401 || /invalid or expired token/i.test(err)) {
    return "After you click Save, CrowdCare asks Google to prove it’s still you so the server can store the campaign for others. That check failed (token expired, wrong tab, or the site’s server Google client ID doesn’t match the app). Use Sign in again for sync, then Retry online sync. Your campaign is already saved in this browser.";
  }
  if (status === 403) {
    return "Server rejected this save (account mismatch). Sign out, sign in with the same Google account you used to create this profile, then try again.";
  }
  return `Could not sync online: ${err || "unknown error"}. Your campaign is still saved in this browser.`;
}

export async function fetchHubCampaignsFromApi(slug) {
  const r = await fetch(`/api/hub/${encodeURIComponent(slug)}`);
  if (!r.ok) throw new Error(`hub ${r.status}`);
  const data = await r.json();
  return Array.isArray(data.campaigns) ? data.campaigns : [];
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
